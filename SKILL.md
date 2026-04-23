---
name: skill-combo
description: ACTIVE EVERY SESSION. Auto-loads on every conversation. Skill orchestration framework that chains multiple skills into combos for maximum effect. When a task needs 2+ skills working together, automatically recommends or executes the best combo. Also extracts patterns from session history to auto-generate SKILL.md files. Triggers on multi-step tasks, skill composition, or any task that naturally decomposes into sequential or parallel sub-tasks.
---

## Persistence

ACTIVE EVERY SESSION. No revert. When loaded, skill-combo monitors every user request for multi-skill opportunities.

## Behavior Mode

### CLI Mode (outside OpenCode runtime) — Passive Recommendation
When not in OpenCode plugin runtime:
1. Detect when user's task involves 2+ skills
2. Recommend the best combo from registry
3. Show execution plan with `--dry-run`
4. Let user decide whether to proceed
5. Use `node dist/cli.js run <combo>` to execute

### Plugin Mode (inside OpenCode runtime) — Active Orchestration
When OpenCode runtime detected (`globalThis.skill` exists):
1. Automatically decompose multi-skill tasks
2. Select or create appropriate combo
3. Execute via `OpenCodeInvoker` using real `skill()` calls
4. Chain outputs between steps automatically
5. Report results with per-step stats

## Decision Framework

For EVERY user request, evaluate:

| Task Pattern | Recommended Action |
|-------------|-------------------|
| Single skill suffices | Skip skill-combo, use skill directly |
| 2-3 sequential steps | Use chain combo |
| 2+ independent checks | Use parallel combo |
| Setup + work + cleanup | Use wrap combo |
| Branch on condition | Use conditional combo |
| Complex multi-phase | Compose multiple combos |
| Multi-agent collaboration | Use subagent combo |

## Quick Combo Reference (103 skills, 10 presets + 2 subagent)

Built-in combos available immediately:
- `frontend-dev`: frontend-design → ts-react-nextjs
- `api-first`: api-rest-design → python-patterns → testing-strategies
- `deploy-pipeline`: testing-strategies → docker-patterns → kubernetes-patterns
- `code-review-partial`: performance-optimization + testing-strategies (parallel)
- `skill-audit`: skill-creator + skill-judge (parallel)
- `docs-pipeline`: code-docs → project-docs
- `content-creation`: content-research-writer → humanizer
- `subagent-fullstack`: research → design → implement → test → docs (subagent)
- `subagent-security-audit`: vuln-scan || auth-check || dependency-audit → report (subagent)

## Auto-Recommendation Rules

When user describes a task, match against these patterns:

| User says | Recommend combo |
|-----------|----------------|
| "build a frontend" | frontend-dev |
| "design and implement API" | api-first |
| "deploy to production" | deploy-pipeline |
| "review this code" | code-review-partial |
| "create documentation" | docs-pipeline |
| "write about X" | content-creation |
| "audit this skill" | skill-audit |
| "refactor safely" | refactoring-safely → testing-strategies |
| "security check" | security-auditor + security-best-practices (parallel) |
| "full-stack feature" | subagent-fullstack |
| "parallel security audit" | subagent-security-audit |

## Creating Custom Combos

New combo in `combos/examples/`:

```yaml
name: security-full-audit
type: parallel
execution: parallel
skills:
  - security-auditor
  - security-best-practices
  - clawdefender
```

Validate: `node dist/cli.js combos --validate`
Test: `node dist/cli.js run security-full-audit --dry-run`

Skill-Combo is a skill orchestration framework that treats skill composition like fighting game combos — multiple skills chained together into powerful coordinated attacks that reduce token usage and improve task completion speed.

## When to Use

Use skill-combo when a task requires multiple skills to work together:

- **Chaining**: Output of one skill feeds into the next (e.g., research → write)
- **Parallelizing**: Independent skills run simultaneously (e.g., security audit + performance check)
- **Wrapping**: Setup/teardown around a sub-workflow (e.g., initialize context → run skills → cleanup)
- **Conditional**: Branch based on context or environment (e.g., run tests only if lint passes)
- **Subagent Mode**: Complex multi-phase tasks requiring multi-agent collaboration

## Usage

### Mode 1: CLI (Standalone)

When running outside OpenCode, use the CLI directly:

```bash
# Scan for available skills
node dist/cli.js scan --save

# List discovered skills
node dist/cli.js list

# List registered combos
node dist/cli.js combos

# Run a combo (dry-run first to preview)
node dist/cli.js run frontend-dev --dry-run

# Execute with verbose output
node dist/cli.js run content-creation --verbose

# Run subagent combo
node dist/cli.js run subagent-fullstack --dry-run
```

### Mode 2: OpenCode Plugin

When loaded as an OpenCode plugin, skill-combo auto-detects the OpenCode runtime and uses real skill execution via the `skill()` tool.

**For AI agents running inside OpenCode:**

Simply use the commands directly — the plugin handles skill execution automatically:

- **Scan skills**: `node dist/cli.js scan --save` or just run `scan` via the CLI
- **List combos**: `node dist/cli.js combos`
- **Run a combo**: `node dist/cli.js run <combo-name>` (e.g., `node dist/cli.js run frontend-dev`)
- **Run subagent combo**: `node dist/cli.js run subagent-fullstack`

The plugin uses `createOpenCodeInvoker()` which detects OpenCode's global `skill()` function and routes real skill executions through it.

### As Module

```typescript
import { CLI, Engine, Planner, Registry, scanSkills, loadDefaultCombos } from 'skill-combo';

const cli = new CLI();
await cli.scan();
const { skills } = cli.listSkills();
const { combos } = cli.listCombos();
```

## Combos

Combos define how skills compose together. Define combos in YAML or programmatically:

### Chain Combo (Serial)

Skills execute one after another. Each skill's output becomes context for the next:

```yaml
name: content-creation
type: chain
execution: serial
skills:
  - content-research-writer
  - humanizer
```

### Parallel Combo

Skills execute simultaneously. Results are aggregated at the end:

```yaml
name: code-review-full
type: parallel
execution: parallel
skills:
  - security-auditor
  - performance-optimization
```

### Wrap Combo

Wrapper skill runs at start (setup) and end (teardown). Sub-skills run in between:

```yaml
name: context-wrapped
type: wrap
execution: serial
skills:
  - session-manager    # wrapper
  - content-research-writer
  - humanizer
```

### Conditional Combo

Branch execution based on a condition:

```yaml
name: conditional-deploy
type: conditional
execution: serial
condition:
  type: env
  expression: NODE_ENV=production
branches:
  true:
    - ci-cd-pipelines
  false:
    - testing-strategies
```

### Subagent Combo

Each step spawns a subagent that loads one or more skills. Steps with no dependencies execute in parallel (Wave 0), then subsequent waves execute after their dependencies complete.

```yaml
name: subagent-fullstack
type: subagent
execution: serial
skills: []  # subagent combos use subagent_steps, not skills
subagent_steps:
  - name: research
    skills:
      - context7
    prompt: "Research best practices and patterns for the requested feature"
    depends_on: []

  - name: design
    skills:
      - architecture-designer
      - api-rest-design
    prompt: "Design the system architecture and API based on research findings"
    depends_on:
      - research
    context_from:
      - research

  - name: implement
    skills:
      - python-patterns
      - ts-react-nextjs
    prompt: "Implement the feature based on the design output"
    depends_on:
      - design
    context_from:
      - design

subagent_aggregation: structured
subagent_error_strategy: continue
timeout: 600000
```

### Programmatic Registration

```typescript
cli.registerCombo({
  name: 'my-combo',
  description: 'Custom workflow',
  type: 'chain',
  execution: 'serial',
  skills: ['skill-a', 'skill-b'],
});
```

## Context Flow

In serial (chain) execution, outputs flow automatically between skills:

1. **Step 1** executes with initial context
2. **Step 1 output** is stored as `{skillId}.output` in shared context
3. **Step 2** receives the shared context including Step 1's output
4. **Step 2** can access previous results via context keys

### Context Key Convention

- `{skillId}.output` — Full output object from a skill
- `{skillId}.output.field` — Specific field from a skill's output
- `step.inputs` — Inputs defined for the current step

### Example Flow

```
content-research-writer outputs: { keywords: [...], trends: [...] }
  ↓
Context for humanizer:
  {
    "content-research-writer.output": { keywords: [...], trends: [...] },
    "step.inputs": {}
  }
  ↓
humanizer can access: context["content-research-writer.output"].keywords
```

### Parallel Aggregation

For parallel combos, results are merged using an aggregation strategy:

- `merge` — Deep merge all outputs (default)
- `override` — Later outputs overwrite earlier ones
- `fail-on-conflict` — Error if keys overlap
- `first-win` — First non-null value wins

## Subagent Mode

Subagent mode enables complex multi-phase workflows where each step runs as a separate subagent with its own skill set. This is distinct from regular skill chaining because:

1. **Isolation**: Each subagent has its own context and can load multiple skills
2. **Parallelism**: Steps without dependencies execute in parallel waves
3. **Dependency Control**: `depends_on` and `context_from` manage execution order and data flow
4. **Error Strategies**: `fail-fast`, `continue`, or `partial` determine how errors affect execution

### Subagent Execution Flow

```
SubagentOrchestrator.execute(combo, invoker)
  │
  ├─→ WaveScheduler.schedule(combo)
  │     ├─ Validates dependencies (throws on circular deps)
  │     └─ Returns SubagentExecutionPlan with waves:
  │         Wave 0: [step_a, step_b]  (no dependencies)
  │         Wave 1: [step_c]          (depends on Wave 0)
  │         Wave 2: [step_d, step_e]  (depends on Wave 1)
  │
  └─→ For each wave:
        ├─ buildStepContext() — collect outputs from depends_on steps
        ├─ Promise.all(wave.steps.map(spawnStep)) — parallel execution
        └─ Aggregate wave results
```

### TaskInvoker Interface

The `TaskInvoker` is the interface for spawning subagents. Distinct from `SkillInvoker` which uses `skill()` for single skill invocation.

```typescript
interface TaskInvoker {
  /**
   * Spawn a subagent with given skills and prompt
   * Returns subagent execution output
   */
  spawn(
    load_skills: string[],   // Skills to load via task()
    prompt: string,          // Task description for the subagent
    context: SkillContext,   // Context from dependency steps
    options?: TaskSpawnOptions
  ): Promise<SubagentOutput>;

  /**
   * Check if task() runtime is available
   */
  isAvailable(): Promise<boolean>;
}

interface TaskSpawnOptions {
  category?: string;        // OpenCode task category (e.g. 'quick')
  session_id?: string;      // Session ID for context sharing
  timeout?: number;         // Timeout in ms
  run_in_background?: boolean;
}

interface SubagentOutput {
  skill_id: string;
  success: boolean;
  result: any;
  error?: string;
  tokens_used: number;
  duration_ms: number;
  step_name: string;
  skills_loaded: string[];
}
```

### Implementations

**OpenCodeTaskInvoker** — Uses OpenCode's `task()` function:
```typescript
const invoker = new OpenCodeTaskInvoker({
  taskTool: globalThis.task,  // OpenCode's task() function
  defaultCategory: 'quick',
  timeout: 300000,
});
```

**MockTaskInvoker** — For testing without OpenCode runtime:
```typescript
const invoker = new MockTaskInvoker({ defaultDelay: 100 });
```

### WaveScheduler

WaveScheduler handles dependency resolution and wave generation:

```typescript
class WaveScheduler {
  // Validate no circular dependencies (DFS)
  validateDependencies(steps: SubagentStep[]): boolean;

  // Group steps into waves based on depends_on
  // Wave 0: steps with empty depends_on
  // Wave N: steps whose ALL dependencies are in waves < N
  buildWaves(steps: SubagentStep[]): ExecutionWave[];

  // Create full execution plan
  schedule(combo: SubagentCombo): SubagentExecutionPlan;
}

interface ExecutionWave {
  wave_number: number;
  steps: SubagentStep[];
}
```

### SubagentCombo YAML Schema

```yaml
name: string                    # Unique combo name
type: subagent                  # Must be "subagent"
execution: serial | parallel    # serial=wave间串行, parallel=全部并行
subagent_steps:
  - name: string                # Unique step identifier
    skills:                     # Skills to load into this subagent
      - skill-a
      - skill-b
    prompt: string              # Task description for the subagent
    depends_on: []              # Step names this depends on
    context_from: []            # Steps whose outputs to include in context
    timeout?: number           # Per-step timeout (ms)
    retry_count?: number       # Retry attempts
subagent_aggregation?: structured | last-win | merge
subagent_error_strategy?: fail-fast | continue | partial
timeout?: number               # Combo-level timeout (ms)
```

### Error Handling Strategies

| Strategy | Behavior on Error |
|----------|------------------|
| `fail-fast` | Abort entire combo on first error |
| `continue` | Skip failed step, continue to next wave |
| `partial` | Continue but mark step as failed in results |

## CLI Commands

| Command | Description |
|---------|-------------|
| `scan` | Scan and index all skills from OpenCode skill directories |
| `list` | List discovered skills with metadata |
| `combos` | List registered combos (including subagent combos) |
| `run <name>` | Execute a combo by name |
| `extract` | Extract patterns from session history, auto-generate SKILL.md |
| `help [cmd]` | Show help for a command |

### Options

| Flag | Description |
|------|-------------|
| `--dry-run` | Preview execution plan without running skills |
| `--verbose` | Show per-step token usage and timing |
| `--debug` | Enable debug logging |

### extract 命令

从 OpenCode 会话历史中提取重复模式，自动生成 SKILL.md 文件。

```bash
# 基本用法
node dist/cli.js extract

# 只提取高分模式（worthiness >= 70）
node dist/cli.js extract --min-score 70

# 最多生成 5 个 skill
node dist/cli.js extract --max 5

# 指定输出目录
node dist/cli.js extract --output-dir ./my-skills

# JSON 格式输出
node dist/cli.js extract --json
```

**工作流程：**
1. `SessionProvider` 获取最近 20 个会话（优先用 OpenCode API，回退到 JSONL 文件）
2. `PatternMiner` 用 n-gram（n=2~4）提取行为序列
3. 按频率打分，评估 worthiness（频率 40% + 通用性 20% + 复杂度降低 20% + 错误降低 10%）
4. `SkillGenerator` 生成标准 SKILL.md（YAML frontmatter + markdown body）

## Core Exports

- `CLI` — Command-line interface and registry management
- `Engine` — Combo execution engine
- `Planner` — Execution plan generation
- `Registry` — Skill and combo catalog
- `scanSkills()` — Scan skill directories
- `loadDefaultCombos()` — Load built-in combo definitions
- `DefaultInvoker` — Mock invoker for testing
- `OpenCodeInvoker` — Real OpenCode runtime invoker
- `SubagentOrchestrator` — Subagent combo executor
- `WaveScheduler` — Dependency-ordered wave generation
- `TaskInvoker` — Interface for spawning subagents
- `OpenCodeTaskInvoker` — OpenCode runtime task() invoker
- `MockTaskInvoker` — Mock invoker for testing
- `SessionProvider` — Interface for session data access
- `OpenCodeSessionProvider` — OpenCode API session provider
- `JsonlSessionProvider` — JSONL file fallback session provider
- `PatternMiner` — N-gram pattern extraction with worthiness scoring
- `SkillGenerator` — SKILL.md file generator from extracted patterns

## Capabilities

- **Skill Discovery**: Automatically scans `~/.config/opencode/skills/` and `~/.agents/skills/`
- **Skill Registry**: Central catalog queryable by category, capability, input, and output
- **Combo Execution**: Chain, parallel, wrap, conditional, and subagent execution patterns
- **Context Passing**: Automatic output-to-input context flow between chained skills
- **Subagent Mode**: Multi-agent workflows with wave-based parallel execution
- **Result Caching**: Deduplicate repeated skill executions via cache layer
- **Dry-Run Mode**: Preview execution plans before running
- **Execution Stats**: Per-step token usage and timing tracking

## Examples

### Content Creation Pipeline

```bash
node dist/cli.js run content-creation --verbose
```

Chains `content-research-writer` → `humanizer` for research-to-content workflow.

### Parallel Code Review

```bash
node dist/cli.js run code-review-partial --verbose
```

Runs `performance-optimization` and `testing-strategies` simultaneously.

### Frontend Pipeline

```bash
node dist/cli.js run frontend-dev
```

Chains `frontend-design` → `ts-react-nextjs` for design-to-code workflow.

### Subagent Full-Stack

```bash
node dist/cli.js run subagent-fullstack --verbose
```

Executes multi-phase workflow: research → design → implement → test → docs with wave-based parallelism.

### Subagent Security Audit

```bash
node dist/cli.js run subagent-security-audit --dry-run
```

Previews parallel security audit: vuln-scan || auth-check || dependency-audit → report

## Creating Combos

Create combos as YAML files in `combos/examples/`:

```yaml
name: my-combo              # Unique identifier
description: Research then write  # One-liner
type: chain                 # chain|parallel|wrap|conditional|subagent
execution: serial           # serial|parallel
skills:                     # Ordered list of skill names (for non-subagent)
  - content-research-writer
  - humanizer
```

**For subagent combos:**

```yaml
name: my-subagent-combo
type: subagent
execution: serial
skills: []  # Empty - use subagent_steps instead
subagent_steps:
  - name: step-a
    skills: [skill-a]
    prompt: "Do task A"
    depends_on: []
  - name: step-b
    skills: [skill-b]
    prompt: "Do task B"
    depends_on: [step-a]
    context_from: [step-a]
```

**Validate** before using:
```bash
skill-combo combos --validate
```

**Dry-run** to preview:
```bash
skill-combo run my-combo --dry-run
```

## Anti-Patterns

NEVER use skill-combo when:
- A single skill can handle the task (unnecessary overhead)
- Skills have circular dependencies (causes infinite loops)
- You need real-time interleaved execution (not yet supported)

NEVER chain skills that:
- Produce incompatible output formats (downstream skill receives garbage)
- Have overlapping responsibilities (wastes tokens)
- Require user confirmation between steps (breaks automation)

NEVER use parallel execution when:
- Skills modify shared state (race conditions)
- Skills have ORDER dependencies (results may be inconsistent)
- One skill's output is another's input (use chain instead)

NEVER use subagent when:
- Task is simple enough for single skill (overhead not justified)
- You need synchronous interleaved execution (use chain instead)

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `scan` finds 0 skills | Stale timestamp file | Delete `.skill-combo-scan-timestamp` and re-scan |
| `list` returns 0 skills | Registry not persisted | Run `scan --save` first, then `list` auto-loads |
| `run` fails: combo not found | Combo name typo or not loaded | Run `combos` to list available names |
| `run` fails: skill not found | Skill missing from registry | Run `scan --save` first |
| Timeout during execution | Skill takes too long | Use `--verbose` to identify slow skill, increase timeout |
| Context missing between steps | Previous skill returned no output | Check previous skill's success status with `--verbose` |
| Transient failure (network) | Skill invocation failed temporarily | Configure `maxRetries` in EngineConfig |
| Subagent combo not found | Type not set to subagent | Check combo YAML has `type: subagent` |
| Circular dependency error | `depends_on` creates a cycle | Check step dependencies for loops |

## Advanced Features

### Persistence (`--save`)
```bash
skill-combo scan --save   # Save 103 skills to .skill-combo-registry.json
skill-combo list          # Auto-loads from saved registry
skill-combo run my-combo  # Auto-loads skills and combos
```

### Machine-Readable Output (`--json`)
```bash
skill-combo scan --json    # {"skills":[...],"errors":[],"timestamp":...}
skill-combo combos --json  # {"combos":[...],"count":9}
```

### Error Recovery (retry)
Engine supports automatic retry for transient failures:
- `maxRetries`: number of retry attempts (default: 0, no retry)
- `retryDelayMs`: delay between retries (default: 1000)
- Non-transient errors (skill not found) are never retried

### Cache TTL
Skills cache supports per-entry TTL:
- `cache.set(key, value, ttlMs?)` - expires after ttlMs milliseconds
- Instance-level default TTL via constructor

### Subagent Wave Execution
WaveScheduler automatically groups steps into execution waves:
- Wave 0: Steps with no dependencies (run immediately in parallel)
- Wave N: Steps whose all dependencies are in waves < N
- Each wave's steps run in parallel via Promise.all()
- Waves execute sequentially: Wave 0 → Wave 1 → Wave 2 → ...

## Runtime Requirements

- **OpenCode runtime**: Uses `OpenCodeInvoker` for real skill execution via the `skill()` tool
- **Subagent execution**: Uses `OpenCodeTaskInvoker` for real task spawning via `task()`
- **Local testing**: Uses `DefaultInvoker` for mock execution without OpenCode

## Combo Type Reference

| Type | Execution | Use Case |
|------|-----------|----------|
| `chain` | `serial` | Sequential skill pipelines |
| `parallel` | `parallel` | Independent skill batches |
| `wrap` | `serial` | Setup/teardown around sub-workflow |
| `conditional` | `serial` | Branch based on condition |
| `subagent` | `serial` | Multi-agent workflows with wave parallelism |

**Note**: `interleaved` execution is deferred and requires OpenCode yield protocol support.