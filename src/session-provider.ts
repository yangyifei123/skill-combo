// Session Provider - Read session data from OpenCode or JSONL files

import type {
  SessionSummary,
  SessionMessage,
  SessionProvider,
} from './types';

/**
 * OpenCodeSessionProvider - reads sessions via OpenCode runtime tools
 * Uses (globalThis as any).session_list and .session_read when available
 */
export class OpenCodeSessionProvider implements SessionProvider {
  private sessionListFn?: (args?: { limit?: number; project_path?: string }) => Promise<unknown>;
  private sessionReadFn?: (args: { session_id: string; limit?: number }) => Promise<unknown>;

  constructor() {
    const g = globalThis as Record<string, unknown>;
    this.sessionListFn = g.session_list as typeof this.sessionListFn;
    this.sessionReadFn = g.session_read as typeof this.sessionReadFn;
  }

  async listSessions(limit?: number): Promise<SessionSummary[]> {
    if (!this.sessionListFn) return [];
    try {
      const result = await this.sessionListFn({ limit: limit ?? 20 });
      return this.parseSessionListResult(result);
    } catch { return []; }
  }

  async getSession(id: string): Promise<SessionSummary | null> {
    if (!this.sessionReadFn) return null;
    try {
      const result = await this.sessionReadFn({ session_id: id });
      return this.parseSessionReadResult(result);
    } catch { return null; }
  }

  isAvailable(): boolean {
    return this.sessionListFn !== undefined && this.sessionReadFn !== undefined;
  }

  // Parse helpers - handle various response formats from OpenCode
  private parseSessionListResult(raw: unknown): SessionSummary[] {
    // The session_list tool returns a table or array of sessions
    // Format varies - handle both table string and structured data
    if (!raw) return [];
    if (typeof raw === 'string') {
      // Table format - skip for now, JSONL provider will be primary
      return [];
    }
    if (Array.isArray(raw)) {
      return raw.map((s: Record<string, unknown>) => ({
        id: (s.id as string) ?? (s.session_id as string) ?? '',
        title: (s.title as string) ?? '',
        messages: [],
        start_time: 0,
        end_time: 0,
        total_tokens: 0,
      }));
    }
    return [];
  }

  private parseSessionReadResult(raw: unknown): SessionSummary | null {
    if (!raw) return null;
    // Parse session messages from the read result
    const obj = raw as Record<string, unknown>;
    const messages: SessionMessage[] = [];
    const messageArray = (obj.messages ?? []) as Array<Record<string, unknown>>;
    for (const msg of messageArray) {
      const role = (msg.role as string) === 'assistant' ? 'assistant' : 'user';
      let content = '';
      if (typeof msg.content === 'string') content = msg.content;
      else if (typeof msg.text === 'string') content = msg.text;
      else content = JSON.stringify(msg.content ?? msg.text ?? '');
      
      messages.push({
        id: (msg.id as string) ?? '',
        role,
        content,
        timestamp: (msg.timestamp as number) ?? (msg.time as number) ?? 0,
        tokens: (msg.tokens as number) ?? 0,
      });
    }
    return {
      id: (obj.id as string) ?? '',
      title: (obj.title as string) ?? '',
      messages,
      start_time: (obj.start_time as number) ?? 0,
      end_time: (obj.end_time as number) ?? 0,
      total_tokens: messages.reduce((sum, m) => sum + (m.tokens ?? 0), 0),
    };
  }
}

/**
 * JsonlSessionProvider - reads prompt history from JSONL file
 * Fallback for standalone CLI mode without OpenCode runtime
 */
export class JsonlSessionProvider implements SessionProvider {
  private jsonlPath: string;
  private fs: typeof import('fs');

  constructor(config?: { jsonlPath?: string }) {
    this.jsonlPath = config?.jsonlPath ?? 
      this.resolveJsonlPath();
    this.fs = require('fs');
  }

  async listSessions(_limit?: number): Promise<SessionSummary[]> {
    const entries = this.readJsonl();
    // Group entries by session (each entry is a prompt in current session)
    // Since JSONL only has current session, return as single session
    if (entries.length === 0) return [];
    return [{
      id: 'current-session',
      title: 'Current Session (JSONL)',
      messages: entries.map(e => ({
        id: '',
        role: 'user' as const,
        content: e.input,
        timestamp: Date.now(),
      })),
      start_time: Date.now(),
      end_time: Date.now(),
      total_tokens: 0,
    }];
  }

  async getSession(id: string): Promise<SessionSummary | null> {
    if (id === 'current-session') {
      const sessions = await this.listSessions();
      return sessions[0] ?? null;
    }
    return null;
  }

  isAvailable(): boolean {
    return this.fs.existsSync(this.jsonlPath);
  }

  private readJsonl(): Array<{ input: string }> {
    try {
      const content = this.fs.readFileSync(this.jsonlPath, 'utf-8');
      return content.split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    } catch {
      return [];
    }
  }

  private resolveJsonlPath(): string {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    const sep = process.platform === 'win32' ? '\\' : '/';
    return `${home}${sep}.local${sep}state${sep}opencode${sep}prompt-history.jsonl`;
  }
}

/**
 * Factory function to create appropriate session provider
 */
export function createSessionProvider(config?: { jsonlPath?: string }): SessionProvider {
  const openCodeProvider = new OpenCodeSessionProvider();
  if (openCodeProvider.isAvailable()) return openCodeProvider;
  console.warn('[session-provider] OpenCode runtime not detected. Using JSONL fallback (current session only).');
  return new JsonlSessionProvider(config);
}
