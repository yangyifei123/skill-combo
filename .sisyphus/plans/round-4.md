# Skill-Combo Round 4 Plan - 50 Iteration Roadmap

## 目标
50次迭代改进：提案 → 审查(Momus) → 编写 → 检视(Oracle) → 测试

## 关键问题识别

### CRITICAL Issues
1. **Scanner Path Resolution Bug** - CLI scan finds 0 skills in real usage
2. **SKILL.md is Documentation, Not Skill Instructions** - 无法作为skill被调用
3. **OpenCodeInvoker Timer Leak** - 内存泄漏

### HIGH Priority
4. **No Combo Validation** - combos引用可能不存在的skills
5. **Planner is Linear Only** - 无依赖分析、无验证

### MEDIUM Priority
6. **No Real Combo Examples** - 需要可工作的示例
7. **Missing Integration Tests** - 无端到端验证

---

## Phase 1: Foundation Fixes (Iter 1-5)

**Goal**: Make plugin actually work - scanner finds skills, SKILL.md usable

| Iter | Change | Files | Success Criteria |
|------|--------|-------|------------------|
| 1 | Fix scanner path resolution for Windows | `scanner.ts` | `node dist/cli.js scan` finds ≥1 skill |
| 2 | Add scanner directory validation + fallback paths | `scanner.ts` | Empty dirs don't crash |
| 3 | Restructure SKILL.md as actionable skill instructions | `SKILL.md` | Follows skill instruction format |
| 4 | Add SKILL.md combo invocation examples | `SKILL.md` | Examples show context flow |
| 5 | Add integration test: CLI scan → registry | `tests/cli-integration.test.ts` | Scan populates registry |

---

## Phase 2: Core Functionality (Iter 6-15)

**Goal**: Execution robust and validated

| Iter | Change | Files | Success Criteria |
|------|--------|-------|------------------|
| 6 | Fix OpenCodeInvoker timer leak | `opencode-invoker.ts` | Timer cleared on winner |
| 7 | Add timeout cleanup to Engine | `engine.ts` | Timer cleared in all paths |
| 8 | Add combo skill existence validation | `registry.ts` | Missing skills throws error |
| 9 | Add planner skill existence check | `planner.ts` | Plan fails if skills missing |
| 10 | Add skill dependency ordering | `planner.ts` | load_skills deps ordered |
| 11 | Add planner timeout inheritance | `planner.ts` | combo timeout → step timeouts |
| 12 | Add Engine context size limit | `engine.ts` | Context limit enforced |
| 13 | Add result aggregation validation | `engine.ts` | Conflict detection works |
| 14 | Add CLI run validation | `cli.ts` | Run fails fast on missing |
| 15 | Add engine context flow test | `tests/engine-context.test.ts` | Skill B receives A output |

---

## Phase 3: Real Combos & Examples (Iter 16-30)

**Goal**: Working combos using discovered skills

| Iter | Change | Files | Success Criteria |
|------|--------|-------|------------------|
| 16 | Create combo discovery script | `scripts/generate-combos.ts` | Scans → generates combos |
| 17-18 | Add combo metadata enhancement | `types.ts`, `combo-loader.ts` | token_estimate, parallel_safe |
| 19-24 | Create example combos | `combos/examples/*.yaml` | 6 working combo examples |
| 25-27 | Add combo tests | `tests/*.test.ts` | Examples validate, dry-run works |
| 28-29 | Skill metadata parser + query optimization | `scanner.ts`, `registry.ts` | ## Combo section parsed |
| 30 | Add CLI combos --validate | `cli.ts` | Validates all combos |

---

## Phase 4: Integration & Monitoring (Iter 31-40)

**Goal**: Production-ready integration

| Iter | Change | Files | Success Criteria |
|------|--------|-------|------------------|
| 31-32 | Execution monitoring + verbose | `engine.ts`, `cli.ts` | Progress events, step output |
| 33-34 | Error recovery + rollback context | `engine.ts` | Retry logic, context preserved |
| 35-36 | Cache TTL + integration test | `cache.ts`, `tests/*.test.ts` | TTL expires, dedup works |
| 37-38 | OpenCodeInvoker tests | `tests/*.test.ts` | Mock + real invocation |
| 39-40 | Timing + JSON output | `engine.ts`, `cli.ts` | Per-step timing, --json flag |

---

## Phase 5: Polish & Documentation (Iter 41-50)

**Goal**: Complete, documented, tested

| Iter | Change | Files | Success Criteria |
|------|--------|-------|------------------|
| 41-43 | README + troubleshooting | `README.md` | Complete usage examples |
| 44-45 | Combo + metadata guides | `docs/*.md` | Creation guides |
| 46 | API documentation | `docs/api.md` | Typedoc generated |
| 47-48 | Benchmarks + token tracking | `tests/*.test.ts`, `src/*.ts` | Performance measured |
| 49 | Final test coverage | `tests/*.test.ts` | >80% coverage |
| 50 | Release prep | `package.json` | Version 1.0.0 |

---

## Verification Commands

**Phase 1**: `npm run build && npm test && node dist/cli.js scan && node dist/cli.js list`
**Phase 2**: `npm test && node dist/cli.js run research-report --dry-run`
**Phase 3**: `npm test && node dist/cli.js combos --validate`
**Phase 4**: `npm test && node dist/cli.js run research-report --verbose`
**Phase 5**: `npm run build && npm test` → Version 1.0.0

---

## Deferred Per SPEC

- Interleaved execution (yield protocol undefined)
- js-expression conditions (security model needed)
- NLP-based suggest() (Planner.suggest returns [])
- Token optimization tracking (optional metric)