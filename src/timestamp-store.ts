import * as fs from 'fs';
import * as path from 'path';

const SCAN_TIMESTAMP_FILE = '.skill-combo-scan-timestamp';

export class TimestampStore {
  private storePath: string;

  constructor(basePath: string) {
    this.storePath = path.join(basePath, SCAN_TIMESTAMP_FILE);
  }

  async getLastScanTimestamp(): Promise<number | undefined> {
    try {
      const content = await fs.promises.readFile(this.storePath, 'utf-8');
      return parseInt(content.trim(), 10);
    } catch {
      return undefined;
    }
  }

  async setLastScanTimestamp(timestamp: number): Promise<void> {
    await fs.promises.writeFile(this.storePath, timestamp.toString(), 'utf-8');
  }
}