// ClawHub HTTP Client
// Rate-limited client for the ClawHub skill registry API
// Phase 2: discovery only (no install workflow)

import {
  ClawHubSkillItem,
  ClawHubSkillListResponse,
  ClawHubSkillSearchResponse,
  RemoteScanError,
  RateLimiterConfig,
} from './types';

// ─── RateLimiter (token bucket) ─────────────────────────────────────────────

export class RateLimiter {
  private maxTokens: number;
  private refillPerSecond: number;
  private tokens: number;
  private lastRefill: number;

  constructor(config: RateLimiterConfig) {
    this.maxTokens = config.maxTokens;
    this.refillPerSecond = config.refillPerSecond;
    this.tokens = config.maxTokens;
    this.lastRefill = Date.now();
  }

  /** Current available tokens (after refill) */
  get availableTokens(): number {
    this.refill();
    return this.tokens;
  }

  /** Acquire one or more tokens, throws RemoteScanError if exhausted */
  async acquire(count: number = 1): Promise<void> {
    this.refill();
    if (this.tokens < count) {
      const waitMs = Math.ceil(((count - this.tokens) / this.refillPerSecond) * 1000);
      const err: RemoteScanError = {
        type: 'rate-limit',
        message: `Rate limit exceeded: need ${count} tokens, have ${this.tokens}`,
        retryable: true,
        retryAfter: Math.ceil(waitMs / 1000),
      };
      throw Object.assign(new Error(err.message), err);
    }
    this.tokens -= count;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed <= 0) return;
    const added = (elapsed / 1000) * this.refillPerSecond;
    this.tokens = Math.min(this.maxTokens, this.tokens + added);
    this.lastRefill = now;
  }
}

// ─── Client Configuration ───────────────────────────────────────────────────

export interface ClawHubClientConfig {
  /** Base URL (overrides CLAWHUB_API_URL env) */
  baseUrl?: string;
  /** Auth token (overrides CLAWHUB_API_TOKEN env) */
  token?: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Rate limiter config (default: 180 max, 3/sec) */
  rateLimiter?: RateLimiterConfig;
}

export interface ListSkillsOptions {
  limit?: number;
  cursor?: string;
}

export interface ListSkillsPaginationOptions {
  /** Max pages to auto-fetch (default: 10, prevents runaway pagination) */
  maxPages?: number;
}

// ─── ClawHubClient ──────────────────────────────────────────────────────────

export class ClawHubClient {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly timeout: number;
  private readonly _rateLimiter: RateLimiter;

  constructor(config?: ClawHubClientConfig) {
    this.baseUrl =
      config?.baseUrl ??
      process.env.CLAWHUB_API_URL ??
      'https://clawhub.ai/api/v1';
    this.token = config?.token ?? process.env.CLAWHUB_API_TOKEN;
    this.timeout = config?.timeout ?? 30000;
    this._rateLimiter = new RateLimiter(
      config?.rateLimiter ?? { maxTokens: 180, refillPerSecond: 3 }
    );
  }

  /** Expose rate limiter for inspection/testing */
  get rateLimiter(): RateLimiter {
    return this._rateLimiter;
  }

  // ── Health Check ────────────────────────────────────────────────────────

  async healthCheck(): Promise<boolean> {
    try {
      const res = await this.request('/health');
      return res.ok;
    } catch {
      return false;
    }
  }

  // ── List Skills (paginated) ─────────────────────────────────────────────

  async listSkills(
    options?: ListSkillsOptions,
    pagination?: ListSkillsPaginationOptions
  ): Promise<ClawHubSkillListResponse> {
    const maxPages = pagination?.maxPages ?? 10;
    let allItems: ClawHubSkillItem[] = [];
    let cursor = options?.cursor ?? undefined;
    let pagesFetched = 0;

    // Single-page mode if no auto-pagination requested and no cursor
    if (options?.cursor === undefined && pagination?.maxPages === undefined) {
      // Just fetch one page
      const params = this.buildListParams(options?.limit, undefined);
      const data = await this.fetchJson<ClawHubSkillListResponse>('/skills', params);
      return data;
    }

    // Auto-paginate
    do {
      const params = this.buildListParams(options?.limit, cursor);
      const data = await this.fetchJson<ClawHubSkillListResponse>('/skills', params);
      allItems = allItems.concat(data.items);
      cursor = data.nextCursor ?? undefined;
      pagesFetched++;
    } while (cursor && pagesFetched < maxPages);

    return { items: allItems, nextCursor: cursor ?? null };
  }

  // ── Search Skills ──────────────────────────────────────────────────────

  async searchSkills(query: string): Promise<ClawHubSkillSearchResponse> {
    const params = new URLSearchParams({ q: query });
    return this.fetchJson<ClawHubSkillSearchResponse>('/skills/search', params);
  }

  // ── Get Single Skill ───────────────────────────────────────────────────

  async getSkill(slug: string): Promise<ClawHubSkillItem> {
    return this.fetchJson<ClawHubSkillItem>(`/skills/${encodeURIComponent(slug)}`);
  }

  // ── Internal ───────────────────────────────────────────────────────────

  private buildListParams(
    limit?: number,
    cursor?: string
  ): URLSearchParams {
    const params = new URLSearchParams();
    if (limit !== undefined) params.set('limit', String(limit));
    if (cursor) params.set('cursor', cursor);
    return params;
  }

  private async fetchJson<T>(path: string, params?: URLSearchParams): Promise<T> {
    const url = this.buildUrl(path, params);
    const res = await this.request(path, params);
    if (!res.ok) {
      throw this.toScanError(res);
    }
    try {
      return (await res.json()) as T;
    } catch (e) {
      const err: RemoteScanError = {
        type: 'parse',
        message: `Failed to parse response from ${url}: ${(e as Error).message}`,
        retryable: true,
      };
      throw Object.assign(new Error(err.message), err);
    }
  }

  private async request(
    path: string,
    params?: URLSearchParams
  ): Promise<Response> {
    await this._rateLimiter.acquire();

    const url = this.buildUrl(path, params);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const res = await fetch(url, {
        headers,
        signal: controller.signal,
      });
      return res;
    } catch (e) {
      const err: RemoteScanError = {
        type: 'network',
        message: `Network error fetching ${url}: ${(e as Error).message}`,
        retryable: true,
      };
      throw Object.assign(new Error(err.message), err);
    } finally {
      clearTimeout(timer);
    }
  }

  private buildUrl(path: string, params?: URLSearchParams): string {
    const base = this.baseUrl.replace(/\/+$/, '');
    const url = new URL(`${base}${path}`);
    if (params) {
      for (const [k, v] of params.entries()) {
        url.searchParams.set(k, v);
      }
    }
    return url.toString();
  }

  private toScanError(res: Response): Error & RemoteScanError {
    const status = res.status;
    let type: RemoteScanError['type'] = 'unknown';
    let retryable = false;
    let retryAfter: number | undefined;

    if (status === 429) {
      type = 'rate-limit';
      retryable = true;
      const header = res.headers.get('retry-after');
      if (header) retryAfter = parseInt(header, 10) || undefined;
    } else if (status === 401 || status === 403) {
      type = 'auth';
      retryable = false;
    } else if (status >= 500) {
      type = 'network';
      retryable = true;
    }

    const err: RemoteScanError = {
      type,
      message: `HTTP ${status} ${res.statusText}`,
      retryable,
      retryAfter,
    };
    return Object.assign(new Error(err.message), err);
  }
}
