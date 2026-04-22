// Cache implementation for skill result deduplication
// Deduplicates results based on skill_id + inputs

import { Cache } from './types';

export { Cache } from './types';

export class MemoryCache implements Cache {
  private store = new Map<string, { value: unknown; timestamp: number; ttlMs?: number }>();
  private defaultTtl?: number;

  constructor(ttl?: number) {
    this.defaultTtl = ttl;
  }

  async get(key: string): Promise<unknown | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    // Per-entry TTL overrides default TTL; if neither set, entry never expires
    const effectiveTtl = entry.ttlMs ?? this.defaultTtl;
    if (effectiveTtl && Date.now() - entry.timestamp > effectiveTtl) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
    this.store.set(key, { value, timestamp: Date.now(), ttlMs });
  }

  async has(key: string): Promise<boolean> {
    const result = await this.get(key);
    return result !== undefined;
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

// Content-hash based cache key generation
// Uses base64 encoding of JSON representation
export function computeCacheKey(skillId: string, inputs: Record<string, unknown>): string {
  const content = JSON.stringify({ skillId, inputs });
  return Buffer.from(content).toString('base64');
}
