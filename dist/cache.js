"use strict";
// Cache implementation for skill result deduplication
// Deduplicates results based on skill_id + inputs
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryCache = void 0;
exports.computeCacheKey = computeCacheKey;
class MemoryCache {
    constructor(ttl) {
        this.store = new Map();
        this.defaultTtl = ttl;
    }
    async get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return undefined;
        // Per-entry TTL overrides default TTL; if neither set, entry never expires
        const effectiveTtl = entry.ttlMs ?? this.defaultTtl;
        if (effectiveTtl && Date.now() - entry.timestamp > effectiveTtl) {
            this.store.delete(key);
            return undefined;
        }
        return entry.value;
    }
    async set(key, value, ttlMs) {
        this.store.set(key, { value, timestamp: Date.now(), ttlMs });
    }
    async has(key) {
        const result = await this.get(key);
        return result !== undefined;
    }
    async clear() {
        this.store.clear();
    }
}
exports.MemoryCache = MemoryCache;
// Content-hash based cache key generation
// Uses base64 encoding of JSON representation
function computeCacheKey(skillId, inputs) {
    const content = JSON.stringify({ skillId, inputs });
    return Buffer.from(content).toString('base64');
}
//# sourceMappingURL=cache.js.map