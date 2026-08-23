export interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

class MemoryCache implements CacheStore {
  private store = new Map<string, { value: unknown; expiresAt?: number }>();

  async get<T>(key: string) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number) {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async del(key: string) {
    this.store.delete(key);
  }
}

const globalForCache = globalThis as unknown as {
  lifeosCache?: CacheStore;
};

export function getCache(): CacheStore {
  if (globalForCache.lifeosCache) {
    return globalForCache.lifeosCache;
  }

  // Redis can replace MemoryCache when REDIS_URL is present.
  // Keep the interface stable so jobs and search can adopt it later.
  const cache = new MemoryCache();
  globalForCache.lifeosCache = cache;
  return cache;
}
