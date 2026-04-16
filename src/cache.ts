// Cache implementation for skill result deduplication
// Deduplicates results based on skill_id + inputs

export interface Cache {
  get(key: string): Promise<unknown | undefined>;
  set(key: string, value: unknown): Promise<void>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

export class MemoryCache implements Cache {
  private store = new Map<string, { value: unknown; timestamp: number }>();
  private ttl?: number;

  constructor(ttl?: number) {
    this.ttl = ttl;
  }

  async get(key: string): Promise<unknown | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (this.ttl && Date.now() - entry.timestamp > this.ttl) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  async set(key: string, value: unknown): Promise<void> {
    this.store.set(key, { value, timestamp: Date.now() });
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
