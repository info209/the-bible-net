import disposableDomainsData from '@/data/disposableDomains.json';
import redis from '@/lib/redis';

export const DISPOSABLE_EMAIL_ERROR_MESSAGE =
    'Temporary or disposable email addresses are not allowed. Please use a permanent email address.';

const UPSTREAM_BLOCKLIST_URL =
    process.env.DISPOSABLE_DOMAINS_UPSTREAM_URL ||
    'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf';

const REFRESH_INTERVAL_MS =
    Number(process.env.DISPOSABLE_DOMAINS_REFRESH_INTERVAL_MS) || 24 * 60 * 60 * 1000; // 24 hours

const REDIS_CACHE_KEY = 'cache:disposable_email_domains';

/**
 * Allowlist of legitimate email providers and permanent privacy/forwarding aliases.
 * Domains in this set will NEVER be blocked as disposable, even if an aggressive
 * remote blocklist mistakenly includes them.
 */
export const ALLOWED_EMAIL_DOMAINS = new Set<string>([
    // Major Global Providers
    'gmail.com',
    'googlemail.com',
    'outlook.com',
    'hotmail.com',
    'live.com',
    'msn.com',
    'yahoo.com',
    'ymail.com',
    'rocketmail.com',
    'icloud.com',
    'me.com',
    'mac.com',
    'proton.me',
    'protonmail.com',
    'pm.me',
    'zoho.com',
    'zohomail.com',
    'aol.com',
    'gmx.com',
    'gmx.net',
    'gmx.de',
    'mail.com',
    'fastmail.com',
    'hey.com',
    'tutanota.com',
    'tuta.com',
    'yandex.com',
    'yandex.ru',
    'mail.ru',

    // Legitimate Privacy & Email Forwarding Services (Requirement 3)
    'duck.com',
    'simplelogin.com',
    'simplelogin.io',
    'relay.firefox.com',
    'mozmail.com',
    'anonaddy.com',
    'addy.io',
    'privaterelay.appleid.com',
    'passinbox.com',
]);

// In-memory set initialized from the locally bundled dataset
let activeDomainsSet = new Set<string>(
    (disposableDomainsData as string[]).map((d) => d.toLowerCase())
);

let lastRefreshedAt = Date.now();
let isRefreshing = false;

/**
 * Normalizes an email address:
 * - Trims leading/trailing whitespace
 * - Splits into local part and domain
 * - Lowercases domain
 */
export function normalizeEmail(email: string): {
    normalizedEmail: string;
    localPart: string;
    domain: string;
    isValidFormat: boolean;
} {
    if (typeof email !== 'string') {
        return { normalizedEmail: '', localPart: '', domain: '', isValidFormat: false };
    }

    const trimmed = email.trim();
    const atIndex = trimmed.lastIndexOf('@');

    if (atIndex <= 0 || atIndex === trimmed.length - 1) {
        return { normalizedEmail: trimmed, localPart: '', domain: '', isValidFormat: false };
    }

    const localPart = trimmed.slice(0, atIndex);
    const domain = trimmed.slice(atIndex + 1).toLowerCase();

    // Standard RFC-compliant format verification
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    const isValidFormat = emailRegex.test(trimmed) && domain.includes('.');

    return {
        normalizedEmail: `${localPart}@${domain}`,
        localPart,
        domain,
        isValidFormat,
    };
}

/**
 * Checks if a domain or any of its parent subdomains are disposable.
 * Example: 'user@box1.mailinator.com' -> checks 'box1.mailinator.com', then 'mailinator.com'.
 */
export function isDomainDisposable(domain: string): {
    isDisposable: boolean;
    matchedDomain?: string;
} {
    const cleanDomain = domain.trim().toLowerCase();
    if (!cleanDomain) return { isDisposable: false };

    // 1. Direct allowlist check
    if (ALLOWED_EMAIL_DOMAINS.has(cleanDomain)) {
        return { isDisposable: false };
    }

    // 2. Direct blocklist check
    if (activeDomainsSet.has(cleanDomain)) {
        return { isDisposable: true, matchedDomain: cleanDomain };
    }

    // 3. Subdomain hierarchy check (walk labels from left to right)
    const labels = cleanDomain.split('.');
    if (labels.length > 2) {
        for (let i = 1; i < labels.length - 1; i++) {
            const parentDomain = labels.slice(i).join('.');
            if (ALLOWED_EMAIL_DOMAINS.has(parentDomain)) {
                return { isDisposable: false };
            }
            if (activeDomainsSet.has(parentDomain)) {
                return { isDisposable: true, matchedDomain: parentDomain };
            }
        }
    }

    return { isDisposable: false };
}

/**
 * Validates an email address against disposable email protection.
 * Runs synchronously in-memory (< 0.05ms). Does NOT await external requests.
 */
export function isDisposableEmail(email: string): {
    isDisposable: boolean;
    domain: string;
    matchedDomain?: string;
} {
    const { domain, isValidFormat } = normalizeEmail(email);

    if (!isValidFormat || !domain) {
        return { isDisposable: false, domain };
    }

    // Trigger background refresh if refresh interval has expired (non-blocking)
    triggerBackgroundRefreshIfNeeded();

    const result = isDomainDisposable(domain);
    return {
        isDisposable: result.isDisposable,
        domain,
        matchedDomain: result.matchedDomain,
    };
}

/**
 * Comprehensive registration validator:
 * Validates formatting, normalizes email, and blocks disposable domains.
 */
export function validateRegistrationEmail(email: string): {
    isValid: boolean;
    error?: string;
    normalizedEmail: string;
    isDisposable?: boolean;
} {
    const { normalizedEmail, domain, isValidFormat } = normalizeEmail(email);

    if (!isValidFormat || !domain) {
        return {
            isValid: false,
            error: 'Invalid email address',
            normalizedEmail,
        };
    }

    const { isDisposable } = isDisposableEmail(normalizedEmail);

    if (isDisposable) {
        return {
            isValid: false,
            error: DISPOSABLE_EMAIL_ERROR_MESSAGE,
            normalizedEmail,
            isDisposable: true,
        };
    }

    return {
        isValid: true,
        normalizedEmail,
    };
}

/**
 * Periodically refreshes the disposable domains dataset from remote source in background.
 * Resilience guarantees:
 * - Keeps existing valid copy if remote fetch fails or times out
 * - Never replaces valid dataset with an empty or error response
 * - Never blocks or slows down signup flow
 */
export async function refreshDisposableDomains(force = false): Promise<boolean> {
    if (!force && Date.now() - lastRefreshedAt < REFRESH_INTERVAL_MS) {
        return false;
    }

    if (isRefreshing) {
        return false;
    }

    isRefreshing = true;

    try {
        // First check Redis if enabled
        if (redis) {
            try {
                const cached = await redis.get(REDIS_CACHE_KEY);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed) && parsed.length >= 1000) {
                        updateActiveDomains(parsed);
                        lastRefreshedAt = Date.now();
                        isRefreshing = false;
                        return true;
                    }
                }
            } catch (redisErr) {
                console.warn('[DisposableEmail] Redis cache read failed, falling back to HTTP fetch:', redisErr);
            }
        }

        // Fetch remotely with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(UPSTREAM_BLOCKLIST_URL, {
            signal: controller.signal,
            headers: { 'User-Agent': 'TheBibleNet-DisposableCheck/1.0' },
        });
        clearTimeout(timeout);

        if (!res.ok) {
            console.warn(`[DisposableEmail] Remote refresh failed with status ${res.status}. Retaining current list.`);
            isRefreshing = false;
            return false;
        }

        const text = await res.text();
        let domains: string[] = [];

        if (text.trim().startsWith('[')) {
            domains = JSON.parse(text);
        } else {
            domains = text
                .split('\n')
                .map((line) => line.trim().toLowerCase())
                .filter((line) => line && !line.startsWith('#'));
        }

        // Safety check: Never replace a valid list with an empty or abnormally small response
        if (!Array.isArray(domains) || domains.length < 1000) {
            console.warn(`[DisposableEmail] Remote dataset too small (${domains?.length || 0}). Retaining current list.`);
            isRefreshing = false;
            return false;
        }

        updateActiveDomains(domains);
        lastRefreshedAt = Date.now();

        // Update Redis cache if available
        if (redis) {
            try {
                await redis.set(REDIS_CACHE_KEY, JSON.stringify(domains), 'EX', 86400); // 24 hours
            } catch (redisSetErr) {
                console.warn('[DisposableEmail] Failed to update Redis cache:', redisSetErr);
            }
        }

        console.log(`[DisposableEmail] Successfully refreshed dataset with ${domains.length} domains.`);
        isRefreshing = false;
        return true;
    } catch (err: any) {
        console.warn(`[DisposableEmail] Background refresh error (${err.message}). Retaining current dataset.`);
        isRefreshing = false;
        return false;
    }
}

function updateActiveDomains(newDomains: string[]): void {
    const updated = new Set<string>();
    for (const d of newDomains) {
        const clean = d.trim().toLowerCase();
        if (clean && !ALLOWED_EMAIL_DOMAINS.has(clean)) {
            updated.add(clean);
        }
    }
    // Retain locally bundled domains as a permanent baseline
    for (const d of disposableDomainsData as string[]) {
        const clean = d.trim().toLowerCase();
        if (clean && !ALLOWED_EMAIL_DOMAINS.has(clean)) {
            updated.add(clean);
        }
    }
    activeDomainsSet = updated;
}

function triggerBackgroundRefreshIfNeeded(): void {
    if (Date.now() - lastRefreshedAt > REFRESH_INTERVAL_MS && !isRefreshing) {
        // Fire and forget without blocking
        refreshDisposableDomains().catch((err) => {
            console.warn('[DisposableEmail] Non-blocking background refresh error:', err?.message);
        });
    }
}

/**
 * Returns current statistics of the disposable email dataset (useful for health/admin checks and tests).
 */
export function getDisposableDomainsStats() {
    return {
        totalDomains: activeDomainsSet.size,
        lastRefreshedAt: new Date(lastRefreshedAt).toISOString(),
        isRefreshing,
        allowedDomainsCount: ALLOWED_EMAIL_DOMAINS.size,
    };
}
