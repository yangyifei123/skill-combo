/**
 * RemoteScanner - Fetches skills from ClawHub remote registry with caching
 *
 * Uses ClawHubClient for API calls and MemoryCache for TTL-based caching.
 * Cache key convention:
 *   - List: 'clawhub:skills:list'
 *   - Search: 'clawhub:skills:search:{query}'
 * TTL: 3600000ms (1 hour), overridable via CLAWHUB_CACHE_TTL env var.
 */

import { MemoryCache } from './cache';
import {
  ClawHubSkillItem,
  ClawHubSkillListResponse,
  ClawHubSkillSearchResponse,
  RemoteScanOptions,
  RemoteScanError,
  RemoteScanResult,
  Skill,
  RemoteSkillMeta,
} from './types';

/** Default cache TTL: 1 hour in ms */
export const DEFAULT_CACHE_TTL = 3600000;

/**
 * ClawHubClient interface - minimal contract RemoteScanner needs.
 * Implemented by the actual ClawHubClient (C2).
 */
export interface ClawHubClientLike {
  listSkills(cursor?: string): Promise<ClawHubSkillListResponse>;
  searchSkills(query: string): Promise<ClawHubSkillSearchResponse>;
}

/**
 * Transform a ClawHubSkillItem into a local Skill object.
 *
 * Mapping:
 *   id          ← slug
 *   name        ← displayName
 *   description ← summary (fallback to '')
 *   location    ← 'clawhub:{slug}'
 *   source      ← 'remote'
 *   remote      ← RemoteSkillMeta composition
 */
export function transformToSkill(item: ClawHubSkillItem): Skill {
  return {
    id: item.slug,
    name: item.displayName,
    description: item.summary ?? '',
    location: `clawhub:${item.slug}`,
    category: [],
    capabilities: [],
    load_skills: [],
    inputs: [],
    outputs: [],
    compatibility: [],
    category_priority: 5,
    source: 'remote',
    remote: buildRemoteMeta(item),
  };
}

function buildRemoteMeta(item: ClawHubSkillItem): RemoteSkillMeta {
  const meta: RemoteSkillMeta = {
    remoteSlug: item.slug,
    remoteFetchedAt: Date.now(),
  };
  if (item.latestVersion?.version) {
    meta.remoteVersion = item.latestVersion.version;
  }
  if (item.owner?.handle) {
    meta.remoteOwner = item.owner.handle;
  }
  if (item.stats?.stars != null) {
    meta.remoteStars = item.stats.stars;
  }
  if (item.stats?.downloads != null) {
    meta.remoteDownloads = item.stats.downloads;
  }
  return meta;
}

/** Get effective TTL from env or default */
function getEffectiveTTL(): number {
  const envTTL = process.env.CLAWHUB_CACHE_TTL;
  if (envTTL) {
    const parsed = parseInt(envTTL, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_CACHE_TTL;
}

/** Classify an error into RemoteScanError */
function classifyError(err: unknown): RemoteScanError {
  const e = err as any;
  const message = e?.message ?? String(err);

  if (e?.status === 429) {
    const retryAfter = e?.headers?.['retry-after']
      ? parseInt(e.headers['retry-after'], 10)
      : undefined;
    return {
      type: 'rate-limit',
      message,
      retryable: true,
      retryAfter,
    };
  }
  if (e?.status === 401 || e?.status === 403) {
    return { type: 'auth', message, retryable: false };
  }

  // Default: network error
  return { type: 'network', message, retryable: true };
}

export class RemoteScanner {
  private client: ClawHubClientLike;
  private cache: MemoryCache;

  constructor(client: ClawHubClientLike, cache?: MemoryCache) {
    this.client = client;
    this.cache = cache ?? new MemoryCache();
  }

  /**
   * Scan ClawHub for remote skills.
   *
   * - If options.search is provided, uses search endpoint.
   * - Otherwise lists all skills, paginating through cursors.
   * - Results are cached with TTL (default 1 hour).
   * - options.force bypasses cache.
   * - options.limit caps total skills returned.
   */
  async scan(options: RemoteScanOptions = {}): Promise<RemoteScanResult> {
    const cacheKey = options.search
      ? `clawhub:skills:search:${options.search}`
      : 'clawhub:skills:list';

    // Check cache unless force-refresh
    if (!options.force) {
      const cached = (await this.cache.get(cacheKey)) as RemoteScanResult | undefined;
      if (cached) {
        return { ...cached, cached: true };
      }
    }

    // Fetch from API
    const errors: RemoteScanError[] = [];
    let skills: Skill[];

    if (options.search) {
      skills = await this.fetchSearch(options.search, errors);
    } else {
      skills = await this.fetchList(options.limit, errors);
    }

    const result: RemoteScanResult = {
      skills,
      errors,
      timestamp: Date.now(),
      cached: false,
      source: 'clawhub',
    };

    // Store in cache
    await this.cache.set(cacheKey, result, getEffectiveTTL());

    return result;
  }

  /** Fetch via search endpoint */
  private async fetchSearch(
    query: string,
    errors: RemoteScanError[]
  ): Promise<Skill[]> {
    try {
      const response = await this.client.searchSkills(query);
      return response.results.map((r) =>
        transformToSkill({
          slug: r.slug,
          displayName: r.displayName,
          summary: r.summary,
          createdAt: 0,
          updatedAt: r.updatedAt ?? 0,
          latestVersion: r.version ? { version: r.version, createdAt: 0 } : null,
        } as ClawHubSkillItem)
      );
    } catch (err) {
      errors.push(classifyError(err));
      return [];
    }
  }

  /** Fetch via list endpoint with pagination */
  private async fetchList(
    limit?: number,
    errors: RemoteScanError[] = []
  ): Promise<Skill[]> {
    const skills: Skill[] = [];
    let cursor: string | undefined;

    do {
      try {
        const response: ClawHubSkillListResponse = await this.client.listSkills(cursor);
        for (const item of response.items) {
          skills.push(transformToSkill(item));
          if (limit && skills.length >= limit) return skills;
        }
        cursor = response.nextCursor ?? undefined;
      } catch (err) {
        errors.push(classifyError(err));
        break; // Stop pagination on error, return partial results
      }
    } while (cursor);

    return skills;
  }
}
