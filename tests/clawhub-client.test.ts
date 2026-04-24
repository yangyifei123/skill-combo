/**
 * ClawHub Client Tests
 * TDD tests for ClawHubClient + RateLimiter
 * Mocks global fetch for all API call tests
 */

import {
  ClawHubClient,
  RateLimiter,
} from '../src/clawhub-client';
import {
  ClawHubSkillItem,
  ClawHubSkillListResponse,
  ClawHubSkillSearchResponse,
  RemoteScanError,
} from '../src/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

const originalFetch = global.fetch;

function mockFetch(response: {
  ok: boolean;
  status?: number;
  statusText?: string;
  json?: () => Promise<any>;
  headers?: Record<string, string>;
  url?: string;
}): void {
  const headers = new Headers(response.headers || {});
  (global.fetch as any) = jest.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 500),
    statusText: response.statusText ?? (response.ok ? 'OK' : 'Error'),
    headers,
    url: response.url ?? 'https://clawhub.ai/api/v1/skills',
    json: response.json ?? (async () => ({})),
  });
}

function restoreFetch(): void {
  global.fetch = originalFetch;
}

function makeItem(overrides?: Partial<ClawHubSkillItem>): ClawHubSkillItem {
  return {
    slug: 'test-skill',
    displayName: 'Test Skill',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeListResponse(
  items: ClawHubSkillItem[],
  nextCursor?: string | null
): ClawHubSkillListResponse {
  return { items, nextCursor: nextCursor ?? null };
}

function makeSearchResponse(
  results: ClawHubSkillSearchResponse['results']
): ClawHubSkillSearchResponse {
  return { results, total: results.length };
}

// ─── RateLimiter Tests ──────────────────────────────────────────────────────

describe('RateLimiter', () => {
  it('should initialize with full tokens', () => {
    const rl = new RateLimiter({ maxTokens: 180, refillPerSecond: 3 });
    expect(rl.availableTokens).toBe(180);
  });

  it('should consume a token on acquire', async () => {
    const rl = new RateLimiter({ maxTokens: 180, refillPerSecond: 3 });
    await rl.acquire();
    expect(rl.availableTokens).toBe(179);
  });

  it('should consume multiple tokens', async () => {
    const rl = new RateLimiter({ maxTokens: 180, refillPerSecond: 3 });
    await rl.acquire(5);
    expect(rl.availableTokens).toBeLessThanOrEqual(175);
    expect(rl.availableTokens).toBeGreaterThan(174);
  });

  it('should throw rate-limit RemoteScanError when bucket is empty', async () => {
    const rl = new RateLimiter({ maxTokens: 1, refillPerSecond: 100 });
    await rl.acquire();
    await expect(rl.acquire()).rejects.toThrow();
    try {
      await rl.acquire();
    } catch (e) {
      const err = e as RemoteScanError;
      expect(err.type).toBe('rate-limit');
      expect(err.retryable).toBe(true);
      expect(err.retryAfter).toBeDefined();
    }
  });

  it('should refill tokens over time', async () => {
    const rl = new RateLimiter({ maxTokens: 10, refillPerSecond: 1000 });
    // Drain all
    await rl.acquire(10);
    expect(rl.availableTokens).toBe(0);
    // Wait ~50ms → should refill ~50 tokens at 1000/s, capped at 10
    await new Promise((r) => setTimeout(r, 50));
    expect(rl.availableTokens).toBeGreaterThan(0);
  });
});

// ─── ClawHubClient – healthCheck ────────────────────────────────────────────

describe('ClawHubClient.healthCheck', () => {
  afterEach(restoreFetch);

  it('should return true when API is healthy', async () => {
    const client = new ClawHubClient();
    mockFetch({ ok: true, json: async () => ({ status: 'ok' }) });
    const result = await client.healthCheck();
    expect(result).toBe(true);
  });

  it('should return false on network error', async () => {
    const client = new ClawHubClient();
    (global.fetch as any) = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await client.healthCheck();
    expect(result).toBe(false);
  });

  it('should return false on non-ok response', async () => {
    const client = new ClawHubClient();
    mockFetch({ ok: false, status: 503, statusText: 'Service Unavailable' });
    const result = await client.healthCheck();
    expect(result).toBe(false);
  });
});

// ─── ClawHubClient – listSkills ─────────────────────────────────────────────

describe('ClawHubClient.listSkills', () => {
  afterEach(restoreFetch);

  it('should fetch skills from default endpoint', async () => {
    const client = new ClawHubClient();
    const items = [makeItem({ slug: 'a' }), makeItem({ slug: 'b' })];
    mockFetch({
      ok: true,
      json: async () => makeListResponse(items),
    });

    const result = await client.listSkills();
    expect(result.items).toHaveLength(2);
    expect(result.items[0].slug).toBe('a');
    expect(result.items[1].slug).toBe('b');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should pass limit and cursor as query params', async () => {
    const client = new ClawHubClient();
    mockFetch({
      ok: true,
      json: async () => makeListResponse([]),
    });

    await client.listSkills({ limit: 5, cursor: 'abc123' });

    const calledUrl = (fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('limit=5');
    expect(calledUrl).toContain('cursor=abc123');
  });

  it('should auto-paginate when more results exist', async () => {
    const client = new ClawHubClient();
    const page1 = [makeItem({ slug: 'p1' })];
    const page2 = [makeItem({ slug: 'p2' })];

    (global.fetch as any) = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        url: 'https://clawhub.ai/api/v1/skills',
        json: async () => makeListResponse(page1, 'next-page'),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        url: 'https://clawhub.ai/api/v1/skills',
        json: async () => makeListResponse(page2, null),
      });

    const result = await client.listSkills({ limit: 1 }, { maxPages: 10 });
    expect(result.items).toHaveLength(2);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('should respect custom maxPages to prevent infinite pagination', async () => {
    const client = new ClawHubClient();
    // Always return a nextCursor to simulate infinite pages
    const infiniteResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      url: 'https://clawhub.ai/api/v1/skills',
      json: async () => makeListResponse([makeItem()], 'always-more'),
    };
    (global.fetch as any) = jest.fn().mockResolvedValue(infiniteResponse);

    const result = await client.listSkills({ limit: 1 }, { maxPages: 3 });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(result.items).toHaveLength(3);
    expect(result.nextCursor).toBe('always-more');
  });
});

// ─── ClawHubClient – searchSkills ───────────────────────────────────────────

describe('ClawHubClient.searchSkills', () => {
  afterEach(restoreFetch);

  it('should search skills with query string', async () => {
    const client = new ClawHubClient();
    const searchResp = makeSearchResponse([
      { score: 0.95, slug: 'security-auditor', displayName: 'Security Auditor' },
    ]);
    mockFetch({ ok: true, json: async () => searchResp });

    const result = await client.searchSkills('security');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].slug).toBe('security-auditor');
    expect(result.results[0].score).toBeCloseTo(0.95);
  });

  it('should send query as q param', async () => {
    const client = new ClawHubClient();
    mockFetch({
      ok: true,
      json: async () => makeSearchResponse([]),
    });

    await client.searchSkills('test query');

    const calledUrl = (fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('q=test+query');
  });
});

// ─── ClawHubClient – getSkill ───────────────────────────────────────────────

describe('ClawHubClient.getSkill', () => {
  afterEach(restoreFetch);

  it('should fetch a single skill by slug', async () => {
    const client = new ClawHubClient();
    const item = makeItem({ slug: 'my-skill', displayName: 'My Skill' });
    mockFetch({ ok: true, json: async () => item });

    const result = await client.getSkill('my-skill');
    expect(result.slug).toBe('my-skill');
    expect(result.displayName).toBe('My Skill');
  });

  it('should throw not-found error for 404', async () => {
    const client = new ClawHubClient();
    mockFetch({ ok: false, status: 404, statusText: 'Not Found' });

    await expect(client.getSkill('nonexistent')).rejects.toThrow();
    try {
      await client.getSkill('nonexistent');
    } catch (e) {
      const err = e as RemoteScanError;
      expect(err.type).toBe('unknown');
      expect(err.retryable).toBe(false);
    }
  });
});

// ─── ClawHubClient – Error Handling ─────────────────────────────────────────

describe('ClawHubClient error handling', () => {
  afterEach(restoreFetch);

  it('should throw network error on fetch failure', async () => {
    const client = new ClawHubClient();
    (global.fetch as any) = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(client.listSkills()).rejects.toThrow();
    try {
      await client.listSkills();
    } catch (e) {
      const err = e as RemoteScanError;
      expect(err.type).toBe('network');
      expect(err.retryable).toBe(true);
    }
  });

  it('should throw rate-limit error on 429 with Retry-After', async () => {
    const client = new ClawHubClient();
    mockFetch({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: { 'retry-after': '30' },
    });

    await expect(client.listSkills()).rejects.toThrow();
    try {
      await client.listSkills();
    } catch (e) {
      const err = e as RemoteScanError;
      expect(err.type).toBe('rate-limit');
      expect(err.retryable).toBe(true);
      expect(err.retryAfter).toBe(30);
    }
  });

  it('should throw auth error on 401', async () => {
    const client = new ClawHubClient();
    mockFetch({ ok: false, status: 401, statusText: 'Unauthorized' });

    await expect(client.listSkills()).rejects.toThrow();
    try {
      await client.listSkills();
    } catch (e) {
      const err = e as RemoteScanError;
      expect(err.type).toBe('auth');
      expect(err.retryable).toBe(false);
    }
  });

  it('should throw parse error on invalid JSON', async () => {
    const client = new ClawHubClient();
    mockFetch({
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    });

    await expect(client.listSkills()).rejects.toThrow();
    try {
      await client.listSkills();
    } catch (e) {
      const err = e as RemoteScanError;
      expect(err.type).toBe('parse');
      expect(err.retryable).toBe(true);
    }
  });
});

// ─── ClawHubClient – Config & Auth ──────────────────────────────────────────

describe('ClawHubClient configuration', () => {
  afterEach(restoreFetch);

  it('should send Authorization header when token is provided', async () => {
    const client = new ClawHubClient({ token: 'secret-token' });
    mockFetch({ ok: true, json: async () => makeListResponse([]) });

    await client.listSkills();

    const opts = (fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    expect(opts.headers).toHaveProperty('Authorization', 'Bearer secret-token');
  });

  it('should use custom base URL from config', async () => {
    const client = new ClawHubClient({ baseUrl: 'http://localhost:3000/api' });
    mockFetch({ ok: true, json: async () => makeListResponse([]) });

    await client.listSkills();

    const calledUrl = (fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('http://localhost:3000/api/skills');
  });

  it('should use env CLAWHUB_API_URL when no config baseUrl', async () => {
    const original = process.env.CLAWHUB_API_URL;
    process.env.CLAWHUB_API_URL = 'https://staging.clawhub.ai/api/v1';

    const client = new ClawHubClient();
    mockFetch({ ok: true, json: async () => makeListResponse([]) });

    await client.listSkills();

    const calledUrl = (fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('https://staging.clawhub.ai/api/v1/skills');

    // Restore: delete if was originally undefined
    if (original === undefined) {
      delete process.env.CLAWHUB_API_URL;
    } else {
      process.env.CLAWHUB_API_URL = original;
    }
  });

  it('should respect timeout option', async () => {
    // We can't easily test AbortSignal timeout in jest without timers,
    // so we verify the option is passed through
    const client = new ClawHubClient({ timeout: 5000 });
    mockFetch({ ok: true, json: async () => makeListResponse([]) });

    await client.listSkills();

    const opts = (fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    expect(opts.signal).toBeDefined();
  });
});

// ─── ClawHubClient – Rate Limiting Integration ──────────────────────────────

describe('ClawHubClient rate limiting integration', () => {
  afterEach(restoreFetch);

  it('should share a rate limiter instance per client', () => {
    const client = new ClawHubClient();
    const rl = client.rateLimiter;
    expect(rl).toBeInstanceOf(RateLimiter);
    expect(rl.availableTokens).toBe(180);
  });

  it('should consume rate limiter tokens on each API call', async () => {
    const client = new ClawHubClient();
    const tokensBefore = client.rateLimiter.availableTokens;

    mockFetch({ ok: true, json: async () => makeListResponse([]) });
    await client.listSkills();

    expect(client.rateLimiter.availableTokens).toBeLessThanOrEqual(tokensBefore - 1);
    expect(client.rateLimiter.availableTokens).toBeGreaterThanOrEqual(tokensBefore - 2);
  });

  it('should throw rate-limit error when rate limiter is exhausted', async () => {
    // Create client with tiny rate limit
    const client = new ClawHubClient({
      rateLimiter: { maxTokens: 1, refillPerSecond: 0 },
    });
    mockFetch({ ok: true, json: async () => makeListResponse([]) });

    // First call works
    await client.listSkills();
    // Second call should be rate-limited
    await expect(client.listSkills()).rejects.toThrow();
  });
});
