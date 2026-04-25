# Top-Tier OSS Infrastructure Hardening

## TL;DR

> **Quick Summary**: Upgrade skill-combo project infrastructure to match top-tier OSS standards (axios/commander/zod level). No core logic changes — purely DX, documentation, and community infrastructure.
> 
> **Deliverables**:
> - `package.json` with bin, engines, files, repository, expanded keywords, version 3.0.0
> - `bin/skill-combo.js` shebang wrapper for `npx skill-combo` support
> - English-first README with badges, 3-step quickstart, standard structure
> - Standard OSS files: LICENSE, CONTRIBUTING.md, CHANGELOG.md, SECURITY.md, CODE_OF_CONDUCT.md
> - GitHub templates: bug_report, feature_request, PR template
> - CI test workflow (test.yml) — do NOT touch existing workflows
> - CLI `--version` / `-v` flag
> - Exports map with `"require"` condition added
> - Combo count fix in README (11, not 12)
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Version fix → package.json + bin → README → CI

---

## Context

### Original Request
"从这个项目我相对满意，但是我感觉和顶级的开源社区项目还是不在一个level，请你从一个真实的开发者和使用者的角度来进行思考和优化"

### Interview Summary
**Key Discussions**:
- 4 parallel analysis agents completed: Oracle main (48/100), UX (6/10), code+community, Librarian top-OSS patterns
- Project: 310 tests all pass, build clean, v3.0.0 features done
- Focus: infrastructure/DX only, NO core business logic changes

**Research Findings**:
- Top OSS all have: CONTRIBUTING, CHANGELOG, SECURITY, CODE_OF_CONDUCT, LICENSE, GitHub templates
- README pattern: hero+badges → features → install → quickstart → examples → API → contributing → license
- **CRITICAL**: @ts-ignore claim is FALSE (0 found by Metis). @ts-ignore cleanup task DELETED.
- **CRITICAL**: Combo count wrong in README (says 12, actually 11). Fix needed.
- **CRITICAL**: CLI has no shebang — bin entry requires wrapper file
- **CRITICAL**: exports missing `"require"` condition despite tsconfig commonjs

### Metis Review
**Identified Gaps** (addressed):
- @ts-ignore cleanup based on FALSE data → DELETED entire task
- Mock warning already exists → DELETED task
- Version in 3 places (package.json=1.0.0, README=3.0.0, default-combos.yaml=v1.0.0) → unified to 3.0.0
- CLI needs shebang for bin → bin/skill-combo.js wrapper
- Exports need require condition → add to all 7 export paths
- Files field must include config/ and combos/
- GitHub templates should be minimal (bug 5 fields, feature 3 fields, PR checklist)

---

## Work Objectives

### Core Objective
Transform skill-combo from "personal project" to "community-ready OSS" matching top-tier standards, while keeping all 310 tests passing and zero core logic changes.

### Concrete Deliverables
- `package.json`: version 3.0.0, bin, engines, files, repository, homepage, 10+ keywords
- `bin/skill-combo.js`: shebang wrapper
- `README.md`: English-first, badges, standard structure, accurate combo count
- `LICENSE`: standard MIT (rename from LICENSE.md)
- `CONTRIBUTING.md`: <80 lines, setup + test + PR flow
- `CHANGELOG.md`: header + v3.0.0 entry only
- `SECURITY.md`: <30 lines, supported versions + reporting
- `CODE_OF_CONDUCT.md`: Contributor Covenant v2.1
- `.github/ISSUE_TEMPLATE/bug_report.yml`: 5 fields
- `.github/ISSUE_TEMPLATE/feature_request.yml`: 3 fields
- `.github/PULL_REQUEST_TEMPLATE.md`: checklist
- `.github/workflows/test.yml`: npm test + tsc --noEmit
- `src/cli.ts`: add `--version` / `-v` case (ONLY change to src/)
- `src/index.ts`: add `"require"` to exports (ONLY other src/ change if needed)

### Definition of Done
- [ ] `npm test` → 310 pass, 0 fail
- [ ] `npm run build` → 0 errors
- [ ] `npx . --version` → outputs "3.0.0"
- [ ] `npx . --help` → shows help with all commands
- [ ] All standard OSS files exist and non-empty
- [ ] README in English with badges and 3-step quickstart
- [ ] `npm link && skill-combo --version` → "3.0.0"

### Must Have
- All 310 tests still pass after every change
- `npm run build` clean (0 TypeScript errors)
- Version 3.0.0 everywhere (package.json, README, default-combos.yaml)
- LICENSE is `LICENSE` not `LICENSE.md`
- bin/skill-combo.js has `#!/usr/bin/env node`
- README accurate combo count (11, not 12)
- No src/ changes except: cli.ts --version case, index.ts exports require

### Must NOT Have (Guardrails)
- **MUST NOT change any `src/*.ts`** except cli.ts (--version case) and index.ts (exports require)
- **MUST NOT touch tests/**, tsconfig.json, jest.config.js
- **MUST NOT touch existing .github/workflows/*.yml** (ai-review.yml, format.yml)
- **MUST NOT add ESLint, Prettier config, .editorconfig, cspell
- **MUST NOT refactor CLI argument parsing logic** (just add case for --version)
- **MUST NOT modify config/default-combos.yaml** except version string
- **MUST NOT add new npm dependencies**
- **MUST NOT fabricate CHANGELOG history** (v3.0.0 = initial public release)
- **MUST NOT delete @ts-ignore** (there are 0 — false data from prior analysis)
- **MUST NOT fix `any` types in cli.ts** (leave them)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (Jest 30 + ts-jest)
- **Automated tests**: Tests-after (for --version and exports changes only)
- **Framework**: jest
- **No TDD**: This is infrastructure/DX work, not new features. Existing 310 tests are the safety net.

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **CLI changes**: Use Bash (node dist/cli.js) - Run commands, assert output
- **File creation**: Use Bash (Test-Path / Get-Content) - Verify existence and content
- **Build/Test**: Use Bash (npm run build && npm test) - Verify no regressions

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - foundation, 4 parallel tasks):
├── Task 1: Version unification (package.json + README + default-combos.yaml → 3.0.0) [quick]
├── Task 2: LICENSE file (rename LICENSE.md → LICENSE, verify MIT format) [quick]
├── Task 3: GitHub templates (bug_report, feature_request, PR template) [quick]
└── Task 4: CI test workflow (.github/workflows/test.yml, ADD only) [quick]

Wave 2 (After Wave 1 - core infra + docs, 6 parallel tasks):
├── Task 5: bin/skill-combo.js shebang wrapper [quick]
├── Task 6: package.json hardening (bin, engines, files, repository, homepage, keywords) [unspecified-high]
├── Task 7: exports "require" condition (add to all 7 export paths in package.json) [quick]
├── Task 8: Standard OSS docs (CONTRIBUTING, CHANGELOG, SECURITY, CODE_OF_CONDUCT) [writing]
├── Task 9: CLI --version flag (add case in cli.ts switch) [quick]
└── Task 10: README English-first rewrite (badges, quickstart, standard structure, fix combo count) [writing]

Wave 3 (After Wave 2 - integration verification, 3 parallel):
├── Task 11: npm link + end-to-end CLI verification (skill-combo --version, --help, scan) [quick]
├── Task 12: Full build+test gate (tsc --noEmit + npm test + all files verified) [quick]
└── Task 13: README quickstart accuracy check (every command in quickstart actually works) [quick]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high)
└── F4: Scope fidelity check (deep)
→ Present results → Get explicit user okay

Critical Path: Task 1 → Task 6 → Task 5 → Task 11 → F1-F4 → user okay
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 6 (Wave 2)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallel |
|------|-----------|--------|-------------|
| 1 | None | 6, 8, 10 | Wave 1 |
| 2 | None | None | Wave 1 |
| 3 | None | None | Wave 1 |
| 4 | None | None | Wave 1 |
| 5 | 1, 6 | 11 | Wave 2 |
| 6 | 1 | 5, 11 | Wave 2 |
| 7 | None | 11 | Wave 2 |
| 8 | 1 | None | Wave 2 |
| 9 | None | 11 | Wave 2 |
| 10 | 1 | 11, 13 | Wave 2 |
| 11 | 5, 6, 7, 9, 10 | 12 | Wave 3 |
| 12 | 11 | F1-F4 | Wave 3 |
| 13 | 10 | F1-F4 | Wave 3 |

### Agent Dispatch Summary

- **Wave 1**: 4 tasks — all `quick`
- **Wave 2**: 6 tasks — 2 `unspecified-high`, 2 `writing`, 2 `quick`
- **Wave 3**: 3 tasks — all `quick`
- **FINAL**: 4 reviews — oracle, unspecified-high (×2), deep

---

## TODOs

- [x] 1. Version Unification

  **What to do**:
  - Change `package.json` `"version"` from `"1.0.0"` to `"3.0.0"`
  - Change `config/default-combos.yaml` version field to `v3.0.0` (currently `v1.0.0`)
  - Verify README already says 3.0.0 (it does — no change needed there)
  - Run `npm run build && npm test` to confirm no regressions

  **Must NOT do**:
  - Do NOT change any src/ files
  - Do NOT modify any other fields in package.json (that's Task 6's job)
  - Do NOT touch README (Task 10's job)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 3-line change across 2 files, trivial
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `git-commit`: Not needed for this single atomic change

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 6, 8, 10
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `package.json:3` — Current version field `"1.0.0"`, change to `"3.0.0"`
  - `config/default-combos.yaml:1` — Current version `v1.0.0`, change to `v3.0.0`
  - `README.md:2` — Already says `**版本**: 3.0.0` — verify only, no change

  **WHY Each Reference Matters**:
  - package.json version: This is the authoritative version for npm. Must match README.
  - default-combos.yaml: Internal version reference. Must stay consistent.

  **Acceptance Criteria**:
  - [ ] `node -e "console.log(require('./package.json').version)"` → outputs `"3.0.0"`
  - [ ] `Select-String -Path config/default-combos.yaml -Pattern "v3.0.0" -Quiet` → True
  - [ ] `npm test` → 310 passed, 0 failed

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Version is 3.0.0 in package.json
    Tool: Bash (node)
    Preconditions: package.json exists
    Steps:
      1. Run: node -e "const p=require('./package.json'); console.log(p.version)"
      2. Assert: output is exactly "3.0.0"
    Expected Result: "3.0.0"
    Failure Indicators: "1.0.0" or any other version
    Evidence: .sisyphus/evidence/task-1-version-check.txt

  Scenario: Tests still pass after version change
    Tool: Bash (npm test)
    Preconditions: node_modules installed, dist/ built
    Steps:
      1. Run: npm test
      2. Assert: "Tests: 310 passed, 310 total" in output
    Expected Result: 310 pass, 0 fail
    Failure Indicators: Any test failure
    Evidence: .sisyphus/evidence/task-1-tests-pass.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `chore: bump version to 3.0.0`
  - Files: `package.json`, `config/default-combos.yaml`
  - Pre-commit: `npm test`

- [x] 2. LICENSE File Standardization

  **What to do**:
  - Rename `LICENSE.md` to `LICENSE` (top-tier OSS uses `LICENSE`, not `LICENSE.md`)
  - Verify content is standard MIT License format with copyright notice
  - If content is non-standard, replace with standard MIT template (year: 2026, copyright holder: from package.json author field)
  - Do NOT change the license type (keep MIT)

  **Must NOT do**:
  - Do NOT change license type
  - Do NOT add any new legal files
  - Do NOT modify copyright holder beyond what's in package.json

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: File rename + content verification, <5 min
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `git-commit`: Not needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: None
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `LICENSE.md` — Current file, must be renamed to `LICENSE`
  - `package.json:53` — `"license": "MIT"` — confirms license type

  **External References**:
  - Standard MIT License template: https://opensource.org/licenses/MIT — Use this format if current content is non-standard

  **WHY Each Reference Matters**:
  - LICENSE.md rename: GitHub and npm recognize `LICENSE` (not `LICENSE.md`) for badge display
  - package.json license field: Must match

  **Acceptance Criteria**:
  - [ ] `Test-Path LICENSE` → True
  - [ ] `Test-Path LICENSE.md` → False (renamed, not copied)
  - [ ] `Select-String -Path LICENSE -Pattern "MIT License" -Quiet` → True
  - [ ] `Select-String -Path LICENSE -Pattern "Copyright" -Quiet` → True
  - [ ] `Select-String -Path LICENSE -Pattern "2026" -Quiet` → True

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: LICENSE file exists with correct format
    Tool: Bash (PowerShell)
    Preconditions: LICENSE.md exists
    Steps:
      1. Verify LICENSE.md exists: Test-Path LICENSE.md
      2. Rename: Move-Item LICENSE.md LICENSE -Force
      3. Verify LICENSE exists: Test-Path LICENSE
      4. Verify LICENSE.md gone: !(Test-Path LICENSE.md)
      5. Verify MIT format: Select-String -Path LICENSE -Pattern "MIT License"
      6. Verify copyright: Select-String -Path LICENSE -Pattern "Copyright.*2026"
    Expected Result: All True
    Failure Indicators: LICENSE.md still exists, or LICENSE missing MIT text
    Evidence: .sisyphus/evidence/task-2-license-check.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `chore: rename LICENSE.md to LICENSE`
  - Files: `LICENSE` (renamed from LICENSE.md)
  - Pre-commit: none

- [x] 3. GitHub Community Templates

  **What to do**:
  - Create `.github/ISSUE_TEMPLATE/bug_report.yml` with 5 fields (title, description, steps to reproduce, expected behavior, environment)
  - Create `.github/ISSUE_TEMPLATE/feature_request.yml` with 3 fields (title, problem/motivation, proposed solution)
  - Create `.github/PULL_REQUEST_TEMPLATE.md` with checklist (description, type, testing, breaking changes)
  - Use standard GitHub issue form YAML format
  - Keep templates minimal — do NOT over-engineer

  **Must NOT do**:
  - Do NOT add more than 5 fields to bug report
  - Do NOT add more than 3 fields to feature request
  - Do NOT create config.yml (issue template config)
  - Do NOT touch existing .github/workflows/

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 3 template files from standard patterns, <10 min
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `git-commit`: Not needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: None
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `.github/` — Existing directory, verify before creating subdirectories

  **External References**:
  - GitHub issue form YAML spec: https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms

  **WHY Each Reference Matters**:
  - GitHub issue forms use YAML format, not markdown — must use correct syntax

  **Acceptance Criteria**:
  - [ ] `Test-Path .github/ISSUE_TEMPLATE/bug_report.yml` → True
  - [ ] `Test-Path .github/ISSUE_TEMPLATE/feature_request.yml` → True
  - [ ] `Test-Path .github/PULL_REQUEST_TEMPLATE.md` → True
  - [ ] bug_report.yml has exactly 5 form fields
  - [ ] feature_request.yml has exactly 3 form fields

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All GitHub templates exist with correct format
    Tool: Bash (PowerShell)
    Preconditions: .github/ directory exists
    Steps:
      1. Verify bug_report.yml exists and has "name: Bug Report"
      2. Verify feature_request.yml exists and has "name: Feature Request"
      3. Verify PR template exists and has "## Description" section
      4. Count form fields in bug_report.yml (should be 5)
      5. Count form fields in feature_request.yml (should be 3)
    Expected Result: All files exist, correct field counts
    Failure Indicators: Missing files, wrong field counts, non-YAML format
    Evidence: .sisyphus/evidence/task-3-templates-check.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `chore: add GitHub issue and PR templates`
  - Files: `.github/ISSUE_TEMPLATE/bug_report.yml`, `.github/ISSUE_TEMPLATE/feature_request.yml`, `.github/PULL_REQUEST_TEMPLATE.md`
  - Pre-commit: none

- [x] 4. CI Test Workflow

  **What to do**:
  - Create `.github/workflows/test.yml` — a new CI workflow that runs tests
  - Triggers: push to main/master, pull_request to main/master
  - Steps: checkout, setup Node.js 18, npm ci, npm run build, npm test
  - Use GitHub Actions standard patterns
  - Do NOT modify existing workflows (ai-review.yml, format.yml)

  **Must NOT do**:
  - Do NOT modify `.github/workflows/ai-review.yml`
  - Do NOT modify `.github/workflows/format.yml`
  - Do NOT add matrix testing across multiple Node versions (keep simple: Node 18)
  - Do NOT add coverage reporting or CodeQL (out of scope)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single YAML workflow file from standard pattern, <10 min
  - **Skills**: [`ci-cd-pipelines`]
    - `ci-cd-pipelines`: GitHub Actions workflow patterns and best practices
  - **Skills Evaluated but Omitted**:
    - `git-commit`: Not needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: None
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `.github/workflows/ai-review.yml` — Existing workflow for pattern reference (READ ONLY, do NOT modify)
  - `.github/workflows/format.yml` — Existing workflow for pattern reference (READ ONLY, do NOT modify)

  **External References**:
  - GitHub Actions workflow syntax: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions

  **WHY Each Reference Matters**:
  - Existing workflows show the project's GitHub Actions conventions
  - Must match existing style (indentation, naming)

  **Acceptance Criteria**:
  - [ ] `Test-Path .github/workflows/test.yml` → True
  - [ ] test.yml contains "npm run build" step
  - [ ] test.yml contains "npm test" step
  - [ ] test.yml triggers on push and pull_request
  - [ ] ai-review.yml and format.yml are UNCHANGED (verify with git diff)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: CI workflow exists and has correct content
    Tool: Bash (PowerShell)
    Preconditions: .github/workflows/ directory exists
    Steps:
      1. Verify test.yml exists: Test-Path .github/workflows/test.yml
      2. Verify has build step: Select-String -Path .github/workflows/test.yml -Pattern "npm run build"
      3. Verify has test step: Select-String -Path .github/workflows/test.yml -Pattern "npm test"
      4. Verify triggers: Select-String -Path .github/workflows/test.yml -Pattern "push:|pull_request:"
      5. Verify existing workflows unchanged: git diff .github/workflows/ai-review.yml (should be empty)
    Expected Result: All checks pass
    Failure Indicators: Missing file, missing steps, existing files modified
    Evidence: .sisyphus/evidence/task-4-ci-check.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `ci: add test workflow`
  - Files: `.github/workflows/test.yml`
  - Pre-commit: none

- [x] 5. Bin Shebang Wrapper

  **What to do**:
  - Create `bin/skill-combo.js` — a thin wrapper with `#!/usr/bin/env node` shebang
  - Content: shebang line + `require('../dist/cli.js')` (single line)
  - This enables `npx skill-combo` and `npm link && skill-combo` to work
  - Ensure the file has Unix line endings (LF, not CRLF) for shebang to work on Linux/Mac
  - Run `npm link` to verify it works locally

  **Must NOT do**:
  - Do NOT modify dist/cli.js directly (it's built output)
  - Do NOT add any logic to the wrapper
  - Do NOT modify tsconfig build output settings

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 3-line file creation, <2 min
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `git-commit`: Not needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (but best after Task 6 for bin field)
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8, 9, 10)
  - **Blocks**: Task 11
  - **Blocked By**: Task 1 (version), Task 6 (package.json bin field — though file can be created independently)

  **References**:

  **Pattern References**:
  - `package.json` — After Task 6, this will have `"bin": { "skill-combo": "./bin/skill-combo.js" }`
  - `dist/cli.js` — The built CLI entry point that the wrapper delegates to

  **External References**:
  - Node.js shebang docs: https://nodejs.org/api/cli.html -- shebang requirement for bin

  **WHY Each Reference Matters**:
  - Without shebang, `npm link` won't work on Linux/Mac
  - wrapper must point to correct dist/ path

  **Acceptance Criteria**:
  - [ ] `Test-Path bin/skill-combo.js` → True
  - [ ] File first line is `#!/usr/bin/env node`
  - [ ] File second line is `require('../dist/cli.js')`
  - [ ] `npm link` succeeds without error

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Bin wrapper exists and has shebang
    Tool: Bash (PowerShell)
    Preconditions: dist/cli.js exists (built)
    Steps:
      1. Verify bin/ directory created
      2. Verify bin/skill-combo.js exists
      3. Verify first line: Get-Content bin/skill-combo.js -First 1 → "#!/usr/bin/env node"
      4. Verify second line contains "require('../dist/cli.js')"
    Expected Result: Shebang present, correct require path
    Failure Indicators: No shebang, wrong path, CRLF line endings
    Evidence: .sisyphus/evidence/task-5-bin-check.txt
  ```

  **Commit**: YES (groups with Task 6)
  - Message: `feat: add bin entry point with shebang`
  - Files: `bin/skill-combo.js`
  - Pre-commit: none

- [x] 6. package.json Hardening

  **What to do**:
  - Add `"bin": { "skill-combo": "./bin/skill-combo.js" }` field
  - Add `"engines": { "node": ">=18.0.0" }` field (Jest 30 requires Node 18+)
  - Add `"files": ["dist/", "bin/", "config/", "combos/"]` field (whitelist published files)
  - Add `"repository": { "type": "git", "url": "https://github.com/yangyifei123/skill-combo.git" }` field
  - Expand `"keywords"` from 4 to 10+: add `"automation"`, `"workflow"`, `"opencode-plugin"`, `"skill-orchestration"`, `"ai-agent"`, `"combo"`, `"chain"`, `"subagent"`, `"productivity"`, `"dev-tools"`
  - Do NOT modify existing fields (name, main, types, exports, scripts, dependencies, devDependencies)
  - Version already updated to 3.0.0 by Task 1

  **Must NOT do**:
  - Do NOT modify `"main"`, `"types"`, `"exports"`, `"scripts"` (that's Task 7's job for exports)
  - Do NOT modify `"dependencies"` or `"devDependencies"`
  - Do NOT add new dependencies
  - Do NOT change the `"name"` field

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: package.json is critical config — needs precision, multiple fields to add
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `git-commit`: Not needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 7, 8, 9, 10)
  - **Blocks**: Tasks 5, 11
  - **Blocked By**: Task 1 (version must be 3.0.0 first)

  **References**:

  **Pattern References**:
  - `package.json` — Current state, add new fields only. Current fields to preserve: name, version(→3.0.0), description, main, types, exports, scripts, keywords(expand), author, license, devDependencies, dependencies

  **External References**:
  - npm package.json fields: https://docs.npmjs.com/cli/v10/configuring-npm/package-json
  - Top OSS package.json patterns (from librarian research): commander, zod, axios all have bin+engines+files+repository+keywords

  **WHY Each Reference Matters**:
  - engines: Prevents installation on unsupported Node versions
  - files: Reduces npm package size by only publishing necessary files
  - repository: Enables npm link back to GitHub
  - keywords: Improves discoverability on npm search

  **Acceptance Criteria**:
  - [ ] `node -e "const p=require('./package.json'); console.assert(p.bin['skill-combo']==='./bin/skill-combo.js')"`
  - [ ] `node -e "const p=require('./package.json'); console.assert(p.engines.node==='>=18.0.0')"`
  - [ ] `node -e "const p=require('./package.json'); console.assert(p.files.includes('dist/'))"`
  - [ ] `node -e "const p=require('./package.json'); console.assert(p.keywords.length>=10)"`
  - [ ] `node -e "const p=require('./package.json'); console.assert(p.repository.url.includes('skill-combo'))"`
  - [ ] `npm run build && npm test` → 310 pass, 0 fail

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All new package.json fields present
    Tool: Bash (node)
    Preconditions: package.json exists with version 3.0.0
    Steps:
      1. Run: node -e "const p=require('./package.json'); ['bin','engines','files','repository'].forEach(f => console.assert(p[f], f+' missing')); console.log('PASS')"
      2. Assert: output contains "PASS"
      3. Run: node -e "console.log(require('./package.json').keywords.length)"
      4. Assert: number >= 10
    Expected Result: All fields present, keywords >= 10
    Failure Indicators: Missing field assertion error
    Evidence: .sisyphus/evidence/task-6-package-check.txt

  Scenario: Build and tests still pass
    Tool: Bash (npm)
    Preconditions: node_modules installed
    Steps:
      1. Run: npm run build
      2. Assert: no errors
      3. Run: npm test
      4. Assert: 310 passed
    Expected Result: Build clean, 310 tests pass
    Evidence: .sisyphus/evidence/task-6-build-test.txt
  ```

  **Commit**: YES (groups with Task 5)
  - Message: `chore: harden package.json with bin, engines, files, repository`
  - Files: `package.json`
  - Pre-commit: `npm test`

- [x] 7. Exports "require" Condition

  **What to do**:
  - Add `"require"` condition to all 7 export paths in `package.json` `"exports"` field
  - Current exports only have `"import"` condition, but tsconfig compiles to CommonJS (`"module": "commonjs"`)
  - For each export path, add `"require": "./dist/xxx.js"` alongside existing `"import": "./dist/xxx.js"`
  - Example: `"."` entry becomes `{ "import": "./dist/index.js", "require": "./dist/index.js", "types": "./dist/index.d.ts" }`
  - Apply to all 7 exports: `.`, `./engine`, `./scanner`, `./registry`, `./cli`, `./cache`, `./colors`

  **Must NOT do**:
  - Do NOT change the `"import"` paths
  - Do NOT change the `"types"` paths
  - Do NOT add new export paths
  - Do NOT modify tsconfig.json

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mechanical addition of "require" to 7 existing entries, <5 min
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `git-commit`: Not needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 8, 9, 10)
  - **Blocks**: Task 11
  - **Blocked By**: None (can start immediately, but logically after Task 6 which also touches package.json)

  **References**:

  **Pattern References**:
  - `package.json:7-35` — Current exports section with 7 paths, each having only "import" and "types"
  - `tsconfig.json` — Confirms `"module": "commonjs"` — the compiled output is CommonJS, so "require" condition is needed

  **External References**:
  - Node.js conditional exports: https://nodejs.org/api/packages.html#conditional-exports

  **WHY Each Reference Matters**:
  - Without "require" condition, CommonJS consumers get resolution errors
  - tsconfig targets CommonJS but exports only advertise ESM — mismatch

  **Acceptance Criteria**:
  - [ ] All 7 export paths have `"require"` condition
  - [ ] All `"require"` values match corresponding `"import"` values
  - [ ] `npm test` → 310 pass

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All exports have require condition
    Tool: Bash (node)
    Preconditions: package.json with exports field
    Steps:
      1. Run: node -e "const p=require('./package.json'); const exports=p.exports; const paths=Object.keys(exports); paths.forEach(k => console.assert(exports[k].require, k+' missing require')); console.log(paths.length+' exports checked')"
      2. Assert: output is "7 exports checked"
    Expected Result: All 7 exports have require condition
    Failure Indicators: Any assertion error for missing require
    Evidence: .sisyphus/evidence/task-7-exports-check.txt
  ```

  **Commit**: YES (groups with Task 6)
  - Message: `fix: add require condition to all export paths`
  - Files: `package.json`
  - Pre-commit: `npm test`

- [x] 8. Standard OSS Documentation Files

  **What to do**:
  - Create `CONTRIBUTING.md` (<80 lines): Prerequisites (Node 18+, npm), setup (npm install, npm run build), testing (npm test), PR flow (fork → branch → test → PR)
  - Create `CHANGELOG.md`: Header "All notable changes to this project will be documented in this file." + v3.0.0 entry only ("Initial public release" — do NOT fabricate history)
  - Create `SECURITY.md` (<30 lines): Supported versions (3.0.0+), reporting process (create GitHub Security Advisory), no PGP key
  - Create `CODE_OF_CONDUCT.md`: Use Contributor Covenant v2.1 verbatim (https://www.contributor-covenant.org/version/2/1/code_of_conduct/)

  **Must NOT do**:
  - Do NOT fabricate CHANGELOG entries for v1.0.0 or v2.0.0
  - Do NOT make CONTRIBUTING.md >80 lines
  - Do NOT make SECURITY.md >30 lines
  - Do NOT write a custom code of conduct (use standard Contributor Covenant)
  - Do NOT add SUPPORT.md or FUNDING.yml

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Technical documentation writing, needs clear English prose
  - **Skills**: [`writing-clearly-and-concisely`]
    - `writing-clearly-and-concisely`: Strunk's rules for clear professional writing
  - **Skills Evaluated but Omitted**:
    - `project-docs`: Overkill for this scope — we need 4 short files, not a full docs structure
    - `git-commit`: Not needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7, 9, 10)
  - **Blocks**: None
  - **Blocked By**: Task 1 (version must be 3.0.0 for CHANGELOG entry)

  **References**:

  **Pattern References**:
  - `package.json` — Reference for setup commands (npm install, npm run build, npm test)

  **External References**:
  - Contributor Covenant v2.1: https://www.contributor-covenant.org/version/2/1/code_of_conduct/
  - Keep a Changelog format: https://keepachangelog.com/en/1.1.0/

  **WHY Each Reference Matters**:
  - CONTRIBUTING setup commands must match actual scripts in package.json
  - CODE_OF_CONDUCT must be verbatim from official source
  - CHANGELOG format follows industry standard

  **Acceptance Criteria**:
  - [ ] `Test-Path CONTRIBUTING.md` → True
  - [ ] `Test-Path CHANGELOG.md` → True
  - [ ] `Test-Path SECURITY.md` → True
  - [ ] `Test-Path CODE_OF_CONDUCT.md` → True
  - [ ] `(Get-Content CONTRIBUTING.md).Length -lt 80` → True
  - [ ] `(Get-Content SECURITY.md).Length -lt 30` → True
  - [ ] CHANGELOG.md contains "[3.0.0]"
  - [ ] CODE_OF_CONDUCT.md contains "Contributor Covenant"

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All standard OSS docs exist and meet size limits
    Tool: Bash (PowerShell)
    Preconditions: None
    Steps:
      1. Verify all 4 files exist
      2. Count lines in CONTRIBUTING.md (<80)
      3. Count lines in SECURITY.md (<30)
      4. Verify CHANGELOG has v3.0.0 entry
      5. Verify CODE_OF_CONDUCT has "Contributor Covenant"
    Expected Result: All files exist, size limits met
    Failure Indicators: Missing file, oversized file, wrong content
    Evidence: .sisyphus/evidence/task-8-docs-check.txt
  ```

  **Commit**: YES
  - Message: `docs: add CONTRIBUTING, CHANGELOG, SECURITY, CODE_OF_CONDUCT`
  - Files: `CONTRIBUTING.md`, `CHANGELOG.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`
  - Pre-commit: none

- [x] 9. CLI --version Flag

  **What to do**:
  - Add `--version` and `-v` flag support to `src/cli.ts`
  - Find the CLI argument parsing switch/if-else block
  - Add a case that reads version from `package.json` and prints it to stdout
  - Pattern: `case '--version': case '-v': console.log(require('../package.json').version); process.exit(0);`
  - Run `npm run build` to compile, then test `node dist/cli.js --version` and `node dist/cli.js -v`
  - Ensure existing tests still pass (they should — this only adds a new code path)

  **Must NOT do**:
  - Do NOT refactor the CLI argument parsing logic
  - Do NOT add help for --version (it's self-documenting)
  - Do NOT modify any other CLI commands
  - Do NOT change the --help output format

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single case addition to switch statement, <5 min
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `bug-fixing`: Not a bug, it's a feature addition
    - `git-commit`: Not needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7, 8, 10)
  - **Blocks**: Task 11
  - **Blocked By**: Task 1 (version must be 3.0.0 in package.json)

  **References**:

  **Pattern References**:
  - `src/cli.ts` — The CLI entry point. Find the argument parsing section (likely a switch or if-else on `process.argv[2]`). Add case for '--version' and '-v'.
  - `package.json:3` — After Task 1, this is `"3.0.0"` — the version to output
  - `tests/cli.test.ts` — Existing CLI tests. Run these to ensure no regression.

  **WHY Each Reference Matters**:
  - cli.ts argument parsing: Must find correct location to insert version case
  - package.json version: Source of truth for version string
  - cli.test.ts: Must verify no existing tests break

  **Acceptance Criteria**:
  - [ ] `node dist/cli.js --version` → outputs `"3.0.0"` (exactly, nothing else)
  - [ ] `node dist/cli.js -v` → outputs `"3.0.0"` (same as --version)
  - [ ] `npm test` → 310 pass, 0 fail (existing tests, plus any new --version tests)
  - [ ] `npm run build` → 0 errors

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: --version outputs correct version
    Tool: Bash (node)
    Preconditions: src/cli.ts modified, npm run build completed
    Steps:
      1. Run: npm run build
      2. Assert: no errors
      3. Run: node dist/cli.js --version
      4. Assert: stdout is exactly "3.0.0"
      5. Run: node dist/cli.js -v
      6. Assert: stdout is exactly "3.0.0"
    Expected Result: Both flags output "3.0.0"
    Failure Indicators: Build error, wrong version, extra output
    Evidence: .sisyphus/evidence/task-9-version-flag.txt

  Scenario: Existing tests still pass
    Tool: Bash (npm)
    Preconditions: node_modules installed
    Steps:
      1. Run: npm test
      2. Assert: "Tests: 310 passed" in output (or more if new tests added)
    Expected Result: All tests pass
    Failure Indicators: Any test failure
    Evidence: .sisyphus/evidence/task-9-tests-pass.txt
  ```

  **Commit**: YES
  - Message: `feat: add --version and -v flags to CLI`
  - Files: `src/cli.ts`
  - Pre-commit: `npm run build && npm test`

- [x] 10. README English-First Rewrite

  **What to do**:
  - Rewrite `README.md` in English following top-tier OSS structure
  - **Structure** (follow this order exactly):
    1. Hero section: `# Skill-Combo` + one-liner description + badge row
    2. Badges: (placeholder markdown for CI status, npm version, license, coverage — actual badge URLs depend on CI setup)
    3. Problem Statement / "Why": What problem does this solve? (translate "先说人话" section concisely)
    4. Features: Bullet list of key features (from "它能干什么" section)
    5. Installation: `npm install skill-combo` (npm style) + OpenCode plugin install (cp/mklink)
    6. Quick Start: **3 steps only** — install → scan → run a combo (concrete commands that work)
    7. CLI Commands: Table of all commands with descriptions
    8. Combo Types: chain/parallel/wrap/conditional/subagent — brief explanation each
    9. Subagent Orchestration: Dedicated section for wave scheduling and task invocation
    10. Configuration: YAML combo format, custom combos
    11. Contributing: Link to CONTRIBUTING.md
    12. License: MIT badge
  - **Fix combo count**: README says "12 (10 basic + 2 subagent)" but actual count is 11 (9 basic + 2 subagent) — correct this
  - Keep the architecture diagram (translate labels to English)
  - Keep the comparison table (translate to English)
  - Do NOT add Chinese content (this is English-first)
  - Badges should use markdown image syntax with shields.io URLs

  **Must NOT do**:
  - Do NOT keep the Chinese README as primary (English is primary now)
  - Do NOT add more than 3 quickstart steps
  - Do NOT fabricate badge URLs (use correct GitHub repo URL pattern)
  - Do NOT modify the combo YAML files (config/default-combos.yaml, combos/examples/)
  - Do NOT add terminal screenshots or GIFs (out of scope)
  - Do NOT remove technical accuracy — architecture, subagent docs, CLI reference must remain

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Major documentation rewrite requiring clear English prose
  - **Skills**: [`writing-clearly-and-concisely`, `frontend-design`]
    - `writing-clearly-and-concisely`: Clear professional English prose
    - `frontend-design`: README is the "landing page" of an OSS project — design quality matters
  - **Skills Evaluated but Omitted**:
    - `seo-content-writer`: README is not SEO content
    - `humanizer`: We're writing fresh, not de-AI-ing existing text

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7, 8, 9)
  - **Blocks**: Tasks 11, 13
  - **Blocked By**: Task 1 (version must be 3.0.0)

  **References**:

  **Pattern References**:
  - `README.md` — Current Chinese README. Preserve ALL technical content, translate language, restructure to OSS standard.
  - `config/default-combos.yaml` — Count actual combos to fix README's "12" claim (should be 11)
  - `combos/examples/` — Check for additional combos

  **External References**:
  - Zod README (top-tier example): https://github.com/colinhacks/zod — Follow hero+badge+problem+features+install+quickstart pattern
  - Commander README: https://github.com/tj/commander.js — Follow CLI docs pattern

  **WHY Each Reference Matters**:
  - Current README: Contains all technical content to preserve during translation
  - default-combos.yaml: Source of truth for combo count
  - Zod/Commander READMEs: Templates for English-first OSS structure

  **Acceptance Criteria**:
  - [ ] README.md first line is `# Skill-Combo`
  - [ ] README contains badge row (at least: CI, license)
  - [ ] README has "Installation" section with `npm install skill-combo`
  - [ ] README has "Quick Start" section with exactly 3 steps
  - [ ] README does NOT contain Chinese-only paragraphs
  - [ ] README combo count is correct (11, not 12)
  - [ ] README has link to CONTRIBUTING.md
  - [ ] README has "License" section mentioning MIT

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: README is English-first with standard structure
    Tool: Bash (PowerShell)
    Preconditions: README.md rewritten
    Steps:
      1. Verify first line: (Get-Content README.md -First 1) -match "# Skill-Combo"
      2. Verify has Installation: Select-String -Path README.md -Pattern "Installation"
      3. Verify has Quick Start: Select-String -Path README.md -Pattern "Quick Start"
      4. Verify has badges: Select-String -Path README.md -Pattern "shields.io|badge"
      5. Verify has Contributing link: Select-String -Path README.md -Pattern "CONTRIBUTING"
      6. Verify combo count: Select-String -Path README.md -Pattern "11 " (not "12 ")
    Expected Result: All checks pass
    Failure Indicators: Chinese-only paragraphs, missing sections, wrong combo count
    Evidence: .sisyphus/evidence/task-10-readme-check.txt
  ```

  **Commit**: YES
  - Message: `docs: rewrite README in English with OSS standards`
  - Files: `README.md`
  - Pre-commit: none

- [x] 11. End-to-End CLI Verification via npm link

  **What to do**:
  - Run `npm link` to create global symlink
  - Verify `skill-combo --version` works (outputs "3.0.0")
  - Verify `skill-combo -v` works (outputs "3.0.0")
  - Verify `skill-combo --help` works (shows help with all commands)
  - Verify `skill-combo scan` works (scans local skills, may show 0 if no OpenCode installed)
  - Verify `skill-combo list` works (lists discovered skills)
  - Run `npm run build && npm test` one final time
  - Document any issues found

  **Must NOT do**:
  - Do NOT fix any issues found — just document them (fix in Wave 3 or post-plan)
  - Do NOT modify any source files
  - Do NOT permanently change global npm state (npm unlink after verification)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Running commands and checking output, <5 min
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `git-commit`: Not needed (no code changes)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (with Tasks 12, 13) — but this is the gate for Wave 3
  - **Blocks**: Tasks 12, 13
  - **Blocked By**: Tasks 5, 6, 7, 9, 10 (bin, package.json, exports, --version, README all done)

  **References**:

  **Pattern References**:
  - `bin/skill-combo.js` — Created by Task 5
  - `package.json` — bin field added by Task 6
  - `src/cli.ts` — --version added by Task 9

  **WHY Each Reference Matters**:
  - All prior tasks must be complete for npm link to work

  **Acceptance Criteria**:
  - [ ] `npm link` succeeds
  - [ ] `skill-combo --version` → "3.0.0"
  - [ ] `skill-combo --help` → help output
  - [ ] `skill-combo scan` → scan output (no crash)
  - [ ] `npm test` → 310 pass

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Full CLI works via global command
    Tool: Bash (npm + skill-combo)
    Preconditions: npm link completed, dist/ built
    Steps:
      1. Run: skill-combo --version
      2. Assert: "3.0.0"
      3. Run: skill-combo --help
      4. Assert: output contains "scan", "list", "combos", "run"
      5. Run: skill-combo scan
      6. Assert: no crash, some output
      7. Run: npm test
      8. Assert: 310 pass
    Expected Result: All CLI commands work, tests pass
    Failure Indicators: Command not found, crash, test failures
    Evidence: .sisyphus/evidence/task-11-e2e-cli.txt
  ```

  **Commit**: NO (verification only, no code changes)

- [x] 12. Full Build+Test Gate

  **What to do**:
  - Run `npm run build` — verify 0 TypeScript errors
  - Run `npm test` — verify 310 pass, 0 fail
  - Run `tsc --noEmit` — verify type checking passes
  - Verify all new files exist: LICENSE, CONTRIBUTING.md, CHANGELOG.md, SECURITY.md, CODE_OF_CONDUCT.md
  - Verify all new directories exist: bin/, .github/ISSUE_TEMPLATE/
  - Verify version consistency: package.json, README.md both say 3.0.0
  - Record evidence for all checks

  **Must NOT do**:
  - Do NOT fix any issues found — just report
  - Do NOT modify any files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Running verification commands, <5 min
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - All skills: Not needed for verification-only task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11, 13)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 11 (E2E CLI must work first)

  **References**:

  **Pattern References**:
  - All files created in prior tasks — verify their existence

  **WHY Each Reference Matters**:
  - Final gate before review wave

  **Acceptance Criteria**:
  - [ ] `npm run build` → 0 errors
  - [ ] `npm test` → 310 pass
  - [ ] All 5 standard OSS files exist
  - [ ] Version 3.0.0 in package.json and README

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Complete verification gate
    Tool: Bash (npm + PowerShell)
    Preconditions: All Wave 1 and Wave 2 tasks complete
    Steps:
      1. Run: npm run build → assert 0 errors
      2. Run: npm test → assert 310 pass
      3. Verify files: LICENSE, CONTRIBUTING.md, CHANGELOG.md, SECURITY.md, CODE_OF_CONDUCT.md
      4. Verify dirs: bin/, .github/ISSUE_TEMPLATE/
      5. Verify version: node -e "console.log(require('./package.json').version)" → "3.0.0"
    Expected Result: All checks pass
    Failure Indicators: Any check failure
    Evidence: .sisyphus/evidence/task-12-full-gate.txt
  ```

  **Commit**: NO (verification only)

- [x] 13. README Quickstart Accuracy Check

  **What to do**:
  - Read README quickstart section
  - Execute every command in the quickstart exactly as written
  - Verify each command produces the expected output
  - If any command fails, document the exact failure
  - Do NOT fix issues — just verify and report

  **Must NOT do**:
  - Do NOT modify README
  - Do NOT fix failing commands

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Running README commands, <5 min
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - All skills: Not needed for verification-only task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11, 12)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 10 (README must be rewritten first)

  **References**:

  **Pattern References**:
  - `README.md` — Read the "Quick Start" section (after Task 10 rewrites it)

  **WHY Each Reference Matters**:
  - Quickstart is the #1 thing new users try — must be accurate

  **Acceptance Criteria**:
  - [ ] Every command in README quickstart executes without error
  - [ ] Output matches what README claims

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Every quickstart command works
    Tool: Bash
    Preconditions: README.md rewritten, npm link done
    Steps:
      1. Read README Quick Start section
      2. Execute each command exactly as written
      3. Verify output matches README description
      4. Document any failures with exact error message
    Expected Result: All commands work
    Failure Indicators: Any command returns error or unexpected output
    Evidence: .sisyphus/evidence/task-13-quickstart-check.txt
  ```

  **Commit**: NO (verification only)

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Verify all "Must Have" present, all "Must NOT Have" absent. Check evidence files. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + `npm test`. Check for `as any`/`@ts-ignore` additions (none expected). Verify only allowed src/ files were modified.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files Modified [N] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Execute EVERY QA scenario from EVERY task. Test `npm link && skill-combo --version`. Verify README quickstart commands work end-to-end. Check all new files exist and have content.
  Output: `Scenarios [N/N pass] | CLI [PASS/FAIL] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: verify 1:1 spec-to-implementation. Check no src/ files touched beyond cli.ts and index.ts. Check no existing workflows modified. Detect scope creep.
  Output: `Tasks [N/N compliant] | Scope Creep [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `chore: standardize project infrastructure` - LICENSE, GitHub templates, CI test workflow
- **Wave 2**: `feat: add bin entry and CLI --version flag` - bin/skill-combo.js, cli.ts, package.json
- **Wave 2**: `docs: rewrite README in English with OSS standards` - README.md
- **Wave 2**: `chore: add standard OSS community files` - CONTRIBUTING, CHANGELOG, SECURITY, CODE_OF_CONDUCT
- **Wave 3**: `chore: unify version to 3.0.0 and harden package.json` - package.json, default-combos.yaml

---

## Success Criteria

### Verification Commands
```bash
npm test                    # Expected: 310 passed, 0 failed
npm run build               # Expected: 0 errors
node dist/cli.js --version  # Expected: "3.0.0"
node dist/cli.js -v         # Expected: "3.0.0"
node dist/cli.js --help     # Expected: help output with all commands listed
```

### File Existence Check
```powershell
$files = @('LICENSE','CHANGELOG.md','CONTRIBUTING.md','SECURITY.md','CODE_OF_CONDUCT.md',
            '.github/ISSUE_TEMPLATE/bug_report.yml','.github/ISSUE_TEMPLATE/feature_request.yml',
            '.github/PULL_REQUEST_TEMPLATE.md','.github/workflows/test.yml','bin/skill-combo.js')
$files | ForEach-Object { Write-Output "$(Test-Path $_) - $_" }
# Expected: True for all
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All 310 tests pass
- [ ] Build clean (0 errors)
- [ ] Version 3.0.0 everywhere
- [ ] README in English with badges
- [ ] All standard OSS files exist
- [ ] npx . --version works
- [ ] npm link && skill-combo --help works
