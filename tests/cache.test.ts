/**
 * Cache Tests
 * Tests TTL expiration and deduplication
 */

import { MemoryCache } from '../src/cache';

describe('MemoryCache', () => {
  describe('TTL expiration', () => {
    it('should return undefined for expired entries with instance TTL', async () => {
      const cache = new MemoryCache(50); // 50ms TTL
      await cache.set('key', 'value');

      // Should be valid immediately
      expect(await cache.get('key')).toBe('value');

      // Wait for expiration
      await new Promise((r) => setTimeout(r, 60));

      // Should be expired
      expect(await cache.get('key')).toBeUndefined();
    });

    it('should return undefined for expired entries with per-entry TTL', async () => {
      const cache = new MemoryCache(); // No instance TTL
      await cache.set('key', 'value', 50); // 50ms per-entry TTL

      // Should be valid immediately
      expect(await cache.get('key')).toBe('value');

      // Wait for expiration
      await new Promise((r) => setTimeout(r, 60));

      // Should be expired
      expect(await cache.get('key')).toBeUndefined();
    });

    it('should use per-entry TTL over instance TTL', async () => {
      const cache = new MemoryCache(1000); // 1s instance TTL
      await cache.set('key1', 'value1'); // uses instance TTL
      await cache.set('key2', 'value2', 50); // uses per-entry TTL

      await new Promise((r) => setTimeout(r, 60));

      // key1 should still be valid (1s TTL)
      expect(await cache.get('key1')).toBe('value1');
      // key2 should be expired (50ms TTL)
      expect(await cache.get('key2')).toBeUndefined();
    });

    it('should never expire if no TTL set', async () => {
      const cache = new MemoryCache();
      await cache.set('key', 'value');

      // Wait a bit
      await new Promise((r) => setTimeout(r, 50));

      // Should still be valid
      expect(await cache.get('key')).toBe('value');
    });

    it('has() should return false for expired entries', async () => {
      const cache = new MemoryCache(50);
      await cache.set('key', 'value');

      expect(await cache.has('key')).toBe(true);

      await new Promise((r) => setTimeout(r, 60));

      expect(await cache.has('key')).toBe(false);
    });
  });

  describe('cache dedup (returns cached value without recomputation)', () => {
    it('should return cached value on subsequent gets', async () => {
      const cache = new MemoryCache();
      await cache.set('key', 'cached-value');

      // Multiple gets return same value (dedup - no recomputation)
      expect(await cache.get('key')).toBe('cached-value');
      expect(await cache.get('key')).toBe('cached-value');
      expect(await cache.get('key')).toBe('cached-value');
    });

    it('should return same object reference on multiple gets', async () => {
      const cache = new MemoryCache();
      const obj = { computed: true };
      await cache.set('key', obj);

      const result1 = await cache.get('key');
      const result2 = await cache.get('key');

      // Same reference confirms dedup (no re-computation)
      expect(result1).toBe(obj);
      expect(result2).toBe(obj);
    });

    it('should overwrite value when set again', async () => {
      const cache = new MemoryCache();
      await cache.set('key', 'first');
      await cache.set('key', 'second');

      // Latest value is returned
      expect(await cache.get('key')).toBe('second');
    });

    it('has() returns true for cached entries (dedup available)', async () => {
      const cache = new MemoryCache();
      await cache.set('key', 'value');

      // has() confirms dedup is available
      expect(await cache.has('key')).toBe(true);
    });
  });

  describe('basic operations', () => {
    let cache: MemoryCache;

    beforeEach(() => {
      cache = new MemoryCache();
    });

    it('should store and retrieve values', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      expect(await cache.get('key1')).toBe('value1');
      expect(await cache.get('key2')).toBe('value2');
    });

    it('should return undefined for non-existent keys', async () => {
      expect(await cache.get('non-existent')).toBeUndefined();
    });

    it('has() should return true for existing keys', async () => {
      await cache.set('key', 'value');
      expect(await cache.has('key')).toBe(true);
    });

    it('has() should return false for non-existent keys', async () => {
      expect(await cache.has('non-existent')).toBe(false);
    });

    it('clear() should remove all entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      await cache.clear();

      expect(await cache.get('key1')).toBeUndefined();
      expect(await cache.get('key2')).toBeUndefined();
    });
  });
});
