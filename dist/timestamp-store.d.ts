export declare class TimestampStore {
    private storePath;
    constructor(basePath: string);
    getLastScanTimestamp(): Promise<number | undefined>;
    setLastScanTimestamp(timestamp: number): Promise<void>;
}
//# sourceMappingURL=timestamp-store.d.ts.map