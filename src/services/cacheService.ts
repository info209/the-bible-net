import redis from '@/lib/redis';

/**
 * Endpoint-specific TTL configuration (in seconds)
 */
export const CACHE_TTL = {
    BIBLE: 60 * 60 * 24 * 7,    // 7 days - Master Bible text is immutable
    DAILY: 60 * 60,             // 1 hour - Daily Devotion / Verses
    AMBIENT_MUSIC: 60 * 60 * 12, // 12 hours - Ambient music catalog
    PLANS: 60 * 60,             // 1 hour - Public reading plans
    CONTENT: 60 * 60            // 1 hour - Master reference content
} as const;

/**
 * Standardized key generator functions for namespaced Redis keys
 */
export const CacheKeys = {
    // Bible Keys
    bibleVersions: (page?: number, limit?: number, includeInactive: boolean = false) =>
        `tbnet:bible:versions:page=${page ?? 'all'}:limit=${limit ?? 'all'}:inc=${includeInactive}`,
    bibleBooks: (version: string) =>
        `tbnet:bible:books:v=${version.toUpperCase()}`,
    bibleChapters: (version: string, book: string) =>
        `tbnet:bible:chapters:v=${version.toUpperCase()}:b=${book.toLowerCase()}`,
    bibleChapter: (version: string, book: string, chapter: number) =>
        `tbnet:bible:chapter:v=${version.toUpperCase()}:b=${book.toLowerCase()}:c=${chapter}`,
    bibleCompare: (v1: string, v2: string, book: string, chapter: number) =>
        `tbnet:bible:compare:v1=${v1.toUpperCase()}:v2=${v2.toUpperCase()}:b=${book.toLowerCase()}:c=${chapter}`,
    bibleSearch: (query: string, version: string = 'KJV', page: number = 1, limit: number = 20) =>
        `tbnet:bible:search:q=${encodeURIComponent(query)}:v=${version.toUpperCase()}:p=${page}:l=${limit}`,

    // Daily Content Keys
    dailyRecent: (days: number = 7, version: string = 'KJV') =>
        `tbnet:daily:recent:d=${days}:v=${version.toUpperCase()}`,
    dailyContent: (type: string, version: string = 'KJV') =>
        `tbnet:daily:content:t=${type}:v=${version.toUpperCase()}`,
    dailyByDate: (date: string) =>
        `tbnet:daily:bydate:d=${date}`,

    // Ambient Music
    ambientMusic: () =>
        `tbnet:ambient-music:all`,

    // Reference Content
    contentList: (type: string) =>
        `tbnet:content:list:t=${type}`,
    contentById: (id: string) =>
        `tbnet:content:id=${id}`,

    // Plans
    plansPublic: (category?: string, skip: number = 0, limit: number = 20) =>
        `tbnet:plans:public:cat=${category || 'all'}:skip=${skip}:limit=${limit}`,
    planRelated: (planId: string, limit: number = 5) =>
        `tbnet:plans:related:id=${planId}:l=${limit}`,
};

/**
 * Production-grade Redis Caching Service
 */
export class CacheService {
    /**
     * Helper for structured logging
     */
    private static log(
        event: 'HIT' | 'MISS' | 'SET' | 'INVALIDATE' | 'ERROR',
        keyOrPattern: string,
        detail?: string
    ) {
        const timestamp = new Date().toISOString();
        const detailStr = detail ? ` - ${detail}` : '';
        console.log(`[REDIS CACHE] [${event}] [${timestamp}] ${keyOrPattern}${detailStr}`);
    }

    /**
     * Executes Cache-Aside pattern:
     * 1. Tries to fetch item from Redis.
     * 2. If present (HIT), returns parsed object.
     * 3. If missing (MISS) or Redis unavailable, executes fetchFn from MongoDB.
     * 4. Saves result to Redis with specified TTL if available.
     * 5. Fallback: Errors in Redis operations trigger console log & immediate fetchFn return without API failure.
     */
    static async getOrSet<T>(
        key: string,
        fetchFn: () => Promise<T>,
        ttlSeconds: number
    ): Promise<T> {
        if (!redis) {
            return await fetchFn();
        }

        // 1. Try reading from cache
        try {
            const cachedData = await redis.get(key);
            if (cachedData) {
                this.log('HIT', key);
                return JSON.parse(cachedData) as T;
            }
            this.log('MISS', key);
        } catch (error: any) {
            this.log('ERROR', key, `Read error: ${error?.message || error}. Falling back to DB.`);
            return await fetchFn();
        }

        // 2. Fetch fresh data from MongoDB
        const freshData = await fetchFn();

        // 3. Cache the fresh data in Redis
        if (freshData !== null && freshData !== undefined) {
            try {
                await redis.set(key, JSON.stringify(freshData), 'EX', ttlSeconds);
                this.log('SET', key, `TTL: ${ttlSeconds}s`);
            } catch (error: any) {
                this.log('ERROR', key, `Write error: ${error?.message || error}`);
            }
        }

        return freshData;
    }

    /**
     * Deletes one or more specific keys from Redis
     */
    static async del(keys: string | string[]): Promise<void> {
        if (!redis) return;

        const keyList = Array.isArray(keys) ? keys : [keys];
        if (keyList.length === 0) return;

        try {
            await redis.del(...keyList);
            this.log('INVALIDATE', keyList.join(', '), `Deleted ${keyList.length} key(s)`);
        } catch (error: any) {
            this.log('ERROR', keyList.join(', '), `Delete error: ${error?.message || error}`);
        }
    }

    /**
     * Non-blocking invalidation of keys matching a pattern (e.g., 'tbnet:daily:*') using SCAN
     */
    static async invalidatePattern(pattern: string): Promise<void> {
        if (!redis) return;

        try {
            let cursor = '0';
            const matchedKeys: string[] = [];

            do {
                const [nextCursor, foundKeys] = await redis.scan(
                    cursor,
                    'MATCH',
                    pattern,
                    'COUNT',
                    100
                );
                cursor = nextCursor;
                if (foundKeys.length > 0) {
                    matchedKeys.push(...foundKeys);
                }
            } while (cursor !== '0');

            if (matchedKeys.length > 0) {
                await redis.del(...matchedKeys);
                this.log('INVALIDATE', pattern, `Cleared ${matchedKeys.length} matching key(s)`);
            } else {
                this.log('INVALIDATE', pattern, `No keys found matching pattern`);
            }
        } catch (error: any) {
            this.log('ERROR', pattern, `Pattern invalidation error: ${error?.message || error}`);
        }
    }
}
