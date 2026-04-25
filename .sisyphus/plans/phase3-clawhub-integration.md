# Phase 3: ClawHub Skill-Hub Integration - Implementation Plan

## Executive Summary

ClawHub (clawhub.ai) = official public skill registry. REST API at /api/v1/*. Remote discovery only, no install.

## Design Decisions

| Q | Answer |
|---|--------|
| API endpoint | GET https://clawhub.ai/api/v1/skills (list), GET /api/v1/search (search) |
| Remote vs local storage | Merged in Registry with source field (local/remote) |
| Source indicators | [L] local, [R] remote, [L+R] both |
| Cache TTL | 1 hour default, CLAWHUB_CACHE_TTL env override |
| Content fetch | Metadata only, no SKILL.md content |
| ID collision | Merge: mark local as isInstalled=true |

## Type System Changes (src/types.ts)

New types: SkillSource, ClawHubSkillItem, ClawHubSkillListResponse, ClawHubSkillSearchResponse, RemoteScanOptions, RemoteScanResult, RemoteScanError

Extended Skill: add source, remoteSlug, remoteVersion, remoteOwner, remoteStars, remoteDownloads, isInstalled fields

## File Changes

### New Files
- src/clawhub-client.ts - HTTP client for ClawHub API
- src/remote-scanner.ts - Fetch + transform remote skills
- src/remote-cache.ts - TTL cache with JSON persistence
- tests/clawhub-client.test.ts - TDD tests
- tests/remote-scanner.test.ts - TDD tests
- tests/remote-cache.test.ts - TDD tests

### Modified Files
- src/types.ts - New types + extend Skill
- src/registry.ts - mergeRemoteSkills(), getSkillsBySource()
- src/scanner.ts - source: 'local' on all scanned skills
- src/cli.ts - scan --remote, hub command, list --source
- src/index.ts - Export new modules
- tests/registry.test.ts - Merge + filter tests
- tests/scanner.test.ts - Source assignment tests

## Commit Strategy (TDD)

C1: types.ts - SkillSource, ClawHub types, extend Skill
C2: clawhub-client.ts + tests - HTTP client
C3: remote-cache.ts + tests - TTL cache
C4: remote-scanner.ts + tests - Scanner + transform
C5: registry.ts + tests - Merge logic
C6: scanner.ts + tests - source: 'local'
C7: cli.ts - --remote, hub, list --source
C8: index.ts - Exports
C9: Integration test + build verify

## Error Handling

- Network: wrap as RemoteScanError { type: 'network', retryable: true }
- Rate limit 429: parse Retry-After, set retryAfter
- Auth 401: type: 'auth', retryable: false
- Parse: type: 'parse', retryable: false
- Graceful degradation: remote fail → local-only, log warning

## Verification

| Criterion | Method |
|-----------|--------|
| API reachable | scan --remote returns skills |
| Rate limit handled | 429 mock → retry |
| Cache TTL | expiration test |
| Source visible | list shows [L]/[R]/[L+R] |
| Network fail | local-only fallback |
| Tests pass | npm test = 0 failures |
| Build clean | tsc --noEmit = 0 errors |
