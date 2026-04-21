import { Cache } from './types';
export { Cache } from './types';
export declare class MemoryCache implements Cache {
    private store;
    private ttl?;
    constructor(ttl?: number);
    get(key: string): Promise<unknown | undefined>;
    set(key: string, value: unknown): Promise<void>;
    has(key: string): Promise<boolean>;
    clear(): Promise<void>;
}
export declare function computeCacheKey(skillId: string, inputs: Record<string, unknown>): string;
//# sourceMappingURL=cache.d.ts.map