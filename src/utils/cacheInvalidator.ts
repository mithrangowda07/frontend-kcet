import { APP_VERSION } from '../config/appConfig';

const VERSION_KEY = 'kcet_eduguide_app_version';
const CACHE_PREFIX = 'kcet_eduguide_';

/**
 * Clears old unprefixed cache keys belonging to KCET EduGuide (for users migrating from the old system).
 * This ensures we don't leak stale data or pollute the localStorage.
 */
function clearOldCaches() {
  const oldExactKeys = ['college_list', 'categories', 'cluster_list', 'user'];
  const oldPrefixes = [
    'college_',
    'cutoff_',
    'search_',
    'branch_',
    'recommendation_',
    'choice_list_',
    'dashboard_',
    'profile_',
    'analytics_'
  ];

  // Remove exact old keys
  for (const key of oldExactKeys) {
    localStorage.removeItem(key);
  }

  // Remove prefixed old keys
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const matchesPrefix = oldPrefixes.some(prefix => key.startsWith(prefix));
      if (matchesPrefix) {
        keysToRemove.push(key);
      }
    }
  }

  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}

/**
 * Clears new versioned caches (starting with kcet_eduguide_) from localStorage,
 * sessionStorage, Cache Storage API, and IndexedDB.
 */
async function clearNewCaches() {
  // 1. Clear localStorage keys starting with kcet_eduguide_ (excluding the version key itself)
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CACHE_PREFIX) && key !== VERSION_KEY) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }

  // 2. Clear sessionStorage keys starting with kcet_eduguide_
  try {
    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        sessionKeysToRemove.push(key);
      }
    }
    for (const key of sessionKeysToRemove) {
      sessionStorage.removeItem(key);
    }
  } catch (error) {
    console.warn('Unable to clear sessionStorage:', error);
  }

  // 3. Clear application-specific Cache Storage API caches
  try {
    if (window.caches) {
      const cacheNames = await window.caches.keys();
      for (const name of cacheNames) {
        if (name.startsWith(CACHE_PREFIX)) {
          await window.caches.delete(name);
        }
      }
    }
  } catch (error) {
    console.warn('Unable to clear Cache Storage API caches:', error);
  }

  // 4. Delete application-specific IndexedDB databases
  try {
    if (window.indexedDB && window.indexedDB.databases) {
      const dbs = await window.indexedDB.databases();
      for (const db of dbs) {
        if (db.name && db.name.startsWith(CACHE_PREFIX)) {
          window.indexedDB.deleteDatabase(db.name);
        }
      }
    }
  } catch (error) {
    console.warn('Unable to clear IndexedDB databases:', error);
  }
}

/**
 * Utility function invoked once during application bootstrap.
 * Inspects the current version, detects migrations/upgrades, invalidates stale caches,
 * and sets the latest application version.
 */
export async function checkAndInvalidateCache(): Promise<void> {
  try {
    const storedVersion = localStorage.getItem(VERSION_KEY);

    if (!storedVersion) {
      // User is either new or from the old system without versioning.
      // Perform complete cleanup of old unprefixed caches and new caches.
      clearOldCaches();
      await clearNewCaches();
    } else if (storedVersion !== APP_VERSION) {
      // App version mismatch detected (new deployment).
      // Invalidate current application caches.
      await clearNewCaches();
    }

    // Save the new version
    localStorage.setItem(VERSION_KEY, APP_VERSION);
  } catch (error) {
    console.error('Error during version-based cache invalidation:', error);
  }
}
