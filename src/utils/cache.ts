interface CacheItem<T> {
  data: T;
  expiry: number | null;
}

const CACHE_PREFIX = 'kcet_eduguide_';

/**
 * Cache utility for KCET EduGuide application.
 * 
 * WHY VERSION-BASED CACHE INVALIDATION IS REQUIRED:
 * The application caches API responses (recommendations, search, cutoffs, branch insights, user profile, categories, cluster list)
 * in localStorage to improve load times and decrease server load. However, because recommendation logic, cutoff processing, branch
 * insights, and API response structures are updated frequently, old cached data format or contents may become invalid, leading to:
 * - Inaccurate college recommendations (e.g. out of date cutoff rules or wrong rankings).
 * - Incorrect cutoff display due to mismatched schema or older year results.
 * - Application crashes when parsing data structures that have changed on the backend.
 * 
 * DEVELOPER NOTE:
 * You MUST increment APP_VERSION in src/config/appConfig.ts whenever:
 * 1. Recommendation logic changes.
 * 2. API response formats/structures change.
 * 3. New filtering logic is introduced.
 * 4. Cutoff processing logic changes.
 * 5. Cached data structures (type definition/schema) change.
 */

export const cache = {
  get<T>(key: string): T | null {
    try {
      const prefixedKey = `${CACHE_PREFIX}${key}`;
      const item = localStorage.getItem(prefixedKey);

      if (!item) return null;

      const parsed: CacheItem<T> = JSON.parse(item);

      if (
        parsed.expiry &&
        Date.now() > parsed.expiry
      ) {
        localStorage.removeItem(prefixedKey);
        return null;
      }

      return parsed.data;
    } catch {
      return null;
    }
  },

  set<T>(
    key: string,
    data: T,
    ttl: number | null = null
  ) {
    const prefixedKey = `${CACHE_PREFIX}${key}`;
    const payload: CacheItem<T> = {
      data,
      expiry: ttl
        ? Date.now() + ttl
        : null
    };

    localStorage.setItem(
      prefixedKey,
      JSON.stringify(payload)
    );
  },

  remove(key: string) {
    const prefixedKey = `${CACHE_PREFIX}${key}`;
    localStorage.removeItem(prefixedKey);
  },

  clear() {
    // Only remove cache entries belonging to KCET EduGuide. Do not clear unrelated browser data.
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  }
};
