/**
 * RemoteScanner Tests (TDD - written first)
 * Tests remote skill scanning from ClawHub with caching, pagination, error handling
 */

import { RemoteScanner, transformToSkill } from '../src/remote-scanner';
import { MemoryCache } from '../src/cache';
import { ClawHubSkillItem, ClawHubSkillListResponse, ClawHubSkillSearchResponse } from '../src/types';

// ─── Mock ClawHubClient interface ────────────────────────────────────────────

interface MockClawHubClient {
  listSkills(cursor?: string): Promise<ClawHubSkillListResponse>;
  searchSkills(query: string): Promise<ClawHubSkillSearchResponse>;
}

function createMockClient(): jest.Mocked<MockClawHubClient> {
  return {
    listSkills: jest.fn(),
    searchSkills: jest.fn(),
  };
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeSkillItem(overrides: Partial<ClawHubSkillItem> = {}): ClawHubSkillItem {
  return {
    slug: 'test-skill',
    displayName: 'Test Skill',
    summary: 'A test skill for testing',
    tags: { category: 'testing' },
    latestVersion: { version: '1.0.0', createdAt: 1700000000000 },
    metadata: null,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    owner: { handle: 'testuser', displayName: 'Test User', image: null },
    stats: { stars: 10, downloads: 100, installsCurrent: 5, installsAllTime: 100 },
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RemoteScanner', () => {
  let client: jest.Mocked<MockClawHubClient>;
  let cache: MemoryCache;

  beforeEach(() => {
    client = createMockClient();
    cache = new MemoryCache();
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── transformToSkill ──────────────────────────────────────────────────────

  describe('transformToSkill', () => {
    it('should transform ClawHubSkillItem to Skill with source=remote', () => {
      const item = makeSkillItem();
      const skill = transformToSkill(item);

      expect(skill.id).toBe('test-skill');
      expect(skill.name).toBe('Test Skill');
      expect(skill.description).toBe('A test skill for testing');
      expect(skill.location).toBe('clawhub:test-skill');
      expect(skill.source).toBe('remote');
    });

    it('should populate remote metadata (stars, downloads, owner)', () => {
      const item = makeSkillItem({
        slug: 'cool-skill',
        stats: { stars: 42, downloads: 999, installsCurrent: 10, installsAllTime: 999 },
        owner: { handle: 'alice', displayName: 'Alice', image: null },
        latestVersion: { version: '2.1.0', createdAt: 1700000000000 },
      });
      const skill = transformToSkill(item);

      expect(skill.remote).toBeDefined();
      expect(skill.remote?.remoteSlug).toBe('cool-skill');
      expect(skill.remote?.remoteStars).toBe(42);
      expect(skill.remote?.remoteDownloads).toBe(999);
      expect(skill.remote?.remoteOwner).toBe('alice');
      expect(skill.remote?.remoteVersion).toBe('2.1.0');
      expect(skill.remote?.remoteFetchedAt).toBe(1700000000000);
    });

    it('should handle missing optional fields gracefully', () => {
      const item: ClawHubSkillItem = {
        slug: 'minimal',
        displayName: 'Minimal Skill',
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      };
      const skill = transformToSkill(item);

      expect(skill.id).toBe('minimal');
      expect(skill.description).toBe('');
      expect(skill.remote?.remoteStars).toBeUndefined();
      expect(skill.remote?.remoteOwner).toBeUndefined();
      expect(skill.remote?.remoteVersion).toBeUndefined();
    });

    it('should set default Skill fields (category, capabilities, etc.)', () => {
      const item = makeSkillItem();
      const skill = transformToSkill(item);

      expect(skill.category).toEqual([]);
      expect(skill.capabilities).toEqual([]);
      expect(skill.load_skills).toEqual([]);
      expect(skill.inputs).toEqual([]);
      expect(skill.outputs).toEqual([]);
      expect(skill.compatibility).toEqual([]);
      expect(skill.category_priority).toBe(5);
    });
  });

  // ─── scan - basic ──────────────────────────────────────────────────────────

  describe('scan - basic', () => {
    it('should fetch skills from client and return RemoteScanResult', async () => {
      const items = [makeSkillItem({ slug: 'a' }), makeSkillItem({ slug: 'b' })];
      client.listSkills.mockResolvedValue({ items, nextCursor: null });

      const scanner = new RemoteScanner(client as any, cache);
      const result = await scanner.scan();

      expect(result.skills).toHaveLength(2);
      expect(result.skills[0].id).toBe('a');
      expect(result.skills[1].id).toBe('b');
      expect(result.source).toBe('clawhub');
      expect(result.cached).toBe(false);
      expect(result.errors).toEqual([]);
      expect(result.timestamp).toBe(1700000000000);
      expect(client.listSkills).toHaveBeenCalledTimes(1);
    });

    it('should return empty skills array when ClawHub returns no items', async () => {
      client.listSkills.mockResolvedValue({ items: [], nextCursor: null });

      const scanner = new RemoteScanner(client as any, cache);
      const result = await scanner.scan();

      expect(result.skills).toEqual([]);
      expect(result.errors).toEqual([]);
    });
  });

  // ─── scan - caching ───────────────────────────────────────────────────────

  describe('scan - caching', () => {
    it('should cache results with TTL and return cached=true on second call', async () => {
      const items = [makeSkillItem({ slug: 'cached-skill' })];
      client.listSkills.mockResolvedValue({ items, nextCursor: null });

      const scanner = new RemoteScanner(client as any, cache);
      const first = await scanner.scan();
      const second = await scanner.scan();

      expect(first.cached).toBe(false);
      expect(second.cached).toBe(true);
      expect(second.skills).toEqual(first.skills);
      // Client should only be called once
      expect(client.listSkills).toHaveBeenCalledTimes(1);
    });

    it('should respect options.force to bypass cache', async () => {
      const items = [makeSkillItem()];
      client.listSkills.mockResolvedValue({ items, nextCursor: null });

      const scanner = new RemoteScanner(client as any, cache);
      await scanner.scan(); // populate cache

      const forced = await scanner.scan({ force: true });

      expect(forced.cached).toBe(false);
      expect(client.listSkills).toHaveBeenCalledTimes(2);
    });

    it('should use CLAWHUB_CACHE_TTL env var when set', async () => {
      const originalEnv = process.env.CLAWHUB_CACHE_TTL;
      process.env.CLAWHUB_CACHE_TTL = '100'; // 100ms

      try {
        const items = [makeSkillItem()];
        client.listSkills.mockResolvedValue({ items, nextCursor: null });

        const scanner = new RemoteScanner(client as any, cache);
        await scanner.scan();

        // Wait for cache to expire
        jest.spyOn(Date, 'now').mockReturnValue(1700000000000 + 200);
        const expired = await scanner.scan();

        expect(expired.cached).toBe(false);
        expect(client.listSkills).toHaveBeenCalledTimes(2);
      } finally {
        process.env.CLAWHUB_CACHE_TTL = originalEnv;
      }
    });
  });

  // ─── scan - pagination ────────────────────────────────────────────────────

  describe('scan - pagination', () => {
    it('should paginate through all pages when cursor is present', async () => {
      const page1 = [makeSkillItem({ slug: 'p1-a' }), makeSkillItem({ slug: 'p1-b' })];
      const page2 = [makeSkillItem({ slug: 'p2-a' })];

      client.listSkills
        .mockResolvedValueOnce({ items: page1, nextCursor: 'cursor123' })
        .mockResolvedValueOnce({ items: page2, nextCursor: null });

      const scanner = new RemoteScanner(client as any, cache);
      const result = await scanner.scan();

      expect(result.skills).toHaveLength(3);
      expect(client.listSkills).toHaveBeenCalledTimes(2);
      expect(client.listSkills).toHaveBeenNthCalledWith(2, 'cursor123');
    });

    it('should respect options.limit across pages', async () => {
      const page1 = [makeSkillItem({ slug: 'a' }), makeSkillItem({ slug: 'b' })];
      const page2 = [makeSkillItem({ slug: 'c' }), makeSkillItem({ slug: 'd' })];

      client.listSkills
        .mockResolvedValueOnce({ items: page1, nextCursor: 'next' })
        .mockResolvedValueOnce({ items: page2, nextCursor: null });

      const scanner = new RemoteScanner(client as any, cache);
      const result = await scanner.scan({ limit: 3 });

      // Should take 2 from page1 and 1 from page2 = 3
      expect(result.skills).toHaveLength(3);
    });
  });

  // ─── scan - search ────────────────────────────────────────────────────────

  describe('scan - search', () => {
    it('should use search endpoint when options.search is provided', async () => {
      client.searchSkills.mockResolvedValue({
        results: [
          { score: 0.9, slug: 'search-hit', displayName: 'Search Hit', summary: 'Found it' },
        ],
        total: 1,
      });

      const scanner = new RemoteScanner(client as any, cache);
      const result = await scanner.scan({ search: 'test query' });

      expect(result.skills).toHaveLength(1);
      expect(result.skills[0].id).toBe('search-hit');
      expect(client.searchSkills).toHaveBeenCalledWith('test query');
      expect(client.listSkills).not.toHaveBeenCalled();
    });

    it('should cache search results under a different key', async () => {
      client.searchSkills.mockResolvedValue({
        results: [
          { score: 0.9, slug: 's1', displayName: 'S1', summary: 's' },
        ],
        total: 1,
      });

      const scanner = new RemoteScanner(client as any, cache);
      await scanner.scan({ search: 'foo' });
      await scanner.scan({ search: 'foo' });

      expect(client.searchSkills).toHaveBeenCalledTimes(1);
    });
  });

  // ─── scan - error handling ────────────────────────────────────────────────

  describe('scan - error handling', () => {
    it('should catch network errors and add to errors array', async () => {
      client.listSkills.mockRejectedValue(new Error('ECONNREFUSED'));

      const scanner = new RemoteScanner(client as any, cache);
      const result = await scanner.scan();

      expect(result.skills).toEqual([]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('network');
      expect(result.errors[0].message).toContain('ECONNREFUSED');
      expect(result.errors[0].retryable).toBe(true);
    });

    it('should detect rate-limit errors (429) with retryAfter', async () => {
      const err: any = new Error('Rate limited');
      err.status = 429;
      err.headers = { 'retry-after': '30' };
      client.listSkills.mockRejectedValue(err);

      const scanner = new RemoteScanner(client as any, cache);
      const result = await scanner.scan();

      expect(result.errors[0].type).toBe('rate-limit');
      expect(result.errors[0].retryAfter).toBe(30);
      expect(result.errors[0].retryable).toBe(true);
    });

    it('should handle partial failures during pagination', async () => {
      const page1 = [makeSkillItem({ slug: 'good-one' })];
      client.listSkills
        .mockResolvedValueOnce({ items: page1, nextCursor: 'next' })
        .mockRejectedValueOnce(new Error('timeout on page 2'));

      const scanner = new RemoteScanner(client as any, cache);
      const result = await scanner.scan();

      // Should have partial results + error
      expect(result.skills).toHaveLength(1);
      expect(result.skills[0].id).toBe('good-one');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('timeout on page 2');
    });

    it('should classify auth errors as non-retryable', async () => {
      const err: any = new Error('Unauthorized');
      err.status = 401;
      client.listSkills.mockRejectedValue(err);

      const scanner = new RemoteScanner(client as any, cache);
      const result = await scanner.scan();

      expect(result.errors[0].type).toBe('auth');
      expect(result.errors[0].retryable).toBe(false);
    });
  });
});
