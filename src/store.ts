export class Store<T> {
  private store: Record<string, T> = {};
  /**
   * Define a new cache entry.
   */
  define(key: string, value: T) {
    this.store[key] = value;
  }

  /**
   * Get a cached value.
   */
  get(key: string): T | undefined {
    return this.store[key];
  }

  /**
   * Get all cached values.
   */
  getAll() {
    return this.store;
  }

  /**
   * Remove keys from cache.
   */
  remove(...keys: string[]) {
    for (const key of keys) {
      delete this.store[key];
    }
  }

  /**
   * Reset cache store.
   */
  reset() {
    this.store = {};
  }

  /**
   * Load cached values in the store.
   */
  load(cached: Record<string, T>) {
    this.store = { ...this.store, ...cached };
  }
}
