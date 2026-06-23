interface CacheItem<T> {
  data: T;
  expiry: number | null;
}

export const cache = {
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);

      if (!item) return null;

      const parsed: CacheItem<T> = JSON.parse(item);

      if (
        parsed.expiry &&
        Date.now() > parsed.expiry
      ) {
        localStorage.removeItem(key);
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
    const payload: CacheItem<T> = {
      data,
      expiry: ttl
        ? Date.now() + ttl
        : null
    };

    localStorage.setItem(
      key,
      JSON.stringify(payload)
    );
  },

  remove(key: string) {
    localStorage.removeItem(key);
  },

  clear() {
    localStorage.clear();
  }
};
