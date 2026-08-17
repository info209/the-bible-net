export const SUPPORTED_COUNTRIES = [
    'New Zealand',
    'United States',
    'United Kingdom',
    'India',
    'Australia',
    'Canada',
] as const;

export type SupportedCountry = typeof SUPPORTED_COUNTRIES[number];

export const SUPPORTED_LANGUAGES = [
    'English',
    'Spanish',
    'French',
    'Hindi',
    'Telugu',
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export const LANGUAGE_CODE_TO_NAME_MAP: Record<string, SupportedLanguage> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    hi: 'Hindi',
    te: 'Telugu',
    english: 'English',
    spanish: 'Spanish',
    french: 'French',
    hindi: 'Hindi',
    telugu: 'Telugu',
};

export const DEFAULT_COUNTRY: SupportedCountry = 'New Zealand';
export const DEFAULT_LANGUAGE: SupportedLanguage = 'English';
export const DEFAULT_BIBLE_VERSION = 'NKJV';

/**
 * Maps any language string (code or name) to a valid supported backend language name.
 */
export function normalizeLanguage(input?: string | null): SupportedLanguage {
    if (!input) return DEFAULT_LANGUAGE;
    const key = input.trim().toLowerCase();
    return LANGUAGE_CODE_TO_NAME_MAP[key] || DEFAULT_LANGUAGE;
}

/**
 * Maps any country string to a valid supported backend country name.
 */
export function normalizeCountry(input?: string | null): SupportedCountry {
    if (!input || input.trim().toLowerCase() === 'unknown') return DEFAULT_COUNTRY;
    const matched = SUPPORTED_COUNTRIES.find(
        c => c.toLowerCase() === input.trim().toLowerCase()
    );
    return matched || DEFAULT_COUNTRY;
}

/**
 * Normalizes preferred Bible version string.
 */
export function normalizeBibleVersion(input?: string | null): string {
    if (!input || input.trim().toLowerCase() === 'unknown') return DEFAULT_BIBLE_VERSION;
    return input.trim();
}
