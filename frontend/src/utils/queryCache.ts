/**
 * LifeLens Stale-While-Revalidate (SWR) In-Memory Query Cache
 *
 * Provides:
 * - Instant cache-first UI rendering (0ms latency on tab switching)
 * - Automatic in-flight request deduplication (prevents duplicate simultaneous HTTP calls)
 * - Background revalidation when cache is stale
 * - Targeted cache invalidation on write mutations (e.g., creating an entry or logging telemetry)
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export interface QueryOptions {
  /** Time in ms before data is considered stale. Default: 2 minutes (120,000ms) */
  staleTime?: number;
  /** Max time in ms to retain data in memory. Default: 15 minutes (900,000ms) */
  cacheTime?: number;
  /** If true, bypasses the cache and forces network fetch */
  forceRefresh?: boolean;
}

class QueryCacheManager {
  private cache = new Map<string, CacheEntry<unknown>>();
  private inFlight = new Map<string, Promise<unknown>>();
  private subscribers = new Map<string, Set<(data: unknown) => void>>();

  private readonly DEFAULT_STALE_MS = 2 * 60 * 1000;      // 2 minutes
  private readonly DEFAULT_MAX_CACHE_MS = 15 * 60 * 1000;  // 15 minutes

  /**
   * Fetches data with SWR caching semantics.
   */
  async fetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: QueryOptions = {}
  ): Promise<T> {
    const {
      staleTime = this.DEFAULT_STALE_MS,
      forceRefresh = false,
    } = options;

    const now = Date.now();
    const cached = this.cache.get(key) as CacheEntry<T> | undefined;

    // Return fresh cached data immediately if not forcing refresh
    if (!forceRefresh && cached && now - cached.timestamp < staleTime) {
      return cached.data;
    }

    // Deduplicate in-flight requests for the same key
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key) as Promise<T>;
    }

    // If stale data is present and we're not forcing refresh,
    // trigger background revalidation and return stale data immediately!
    if (!forceRefresh && cached) {
      this.revalidateInBackground(key, fetcher);
      return cached.data;
    }

    // Fetch from network
    const promise = fetcher()
      .then((data) => {
        this.set(key, data);
        this.notify(key, data);
        return data;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  /**
   * Directly sets a cache entry (e.g. after an optimistic mutation).
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Reads raw cached value synchronously if available.
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    return entry?.data;
  }

  /**
   * Invalidates all cache keys matching a prefix or pattern.
   */
  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern) || key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Subscribes to background revalidations for a key.
   */
  subscribe<T>(key: string, callback: (data: T) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    const set = this.subscribers.get(key)!;
    set.add(callback as (data: unknown) => void);
    return () => {
      set.delete(callback as (data: unknown) => void);
      if (set.size === 0) this.subscribers.delete(key);
    };
  }

  private notify<T>(key: string, data: T): void {
    const set = this.subscribers.get(key);
    if (set) {
      for (const cb of set) {
        try {
          cb(data);
        } catch (err) {
          console.warn(`[LifeLens QueryCache] Subscriber error for ${key}:`, err);
        }
      }
    }
  }

  private revalidateInBackground<T>(key: string, fetcher: () => Promise<T>): void {
    if (this.inFlight.has(key)) return;
    const promise = fetcher()
      .then((data) => {
        this.set(key, data);
        this.notify(key, data);
        return data;
      })
      .catch((err) => {
        console.warn(`[LifeLens QueryCache] Background revalidation failed for ${key}:`, err);
      })
      .finally(() => {
        this.inFlight.delete(key);
      });
    this.inFlight.set(key, promise);
  }
}

export const queryCache = new QueryCacheManager();
