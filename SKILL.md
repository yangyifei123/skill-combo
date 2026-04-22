---
name: skill-combo
description: Skill orchestration framework for OpenCode that enables multiple skills to work together in combos. Use when you need to chain, parallelize, or compose multiple skills into coordinated workflows. Triggers on "orchestrate skills", "chain skills", "run skills in parallel", "skill combo", "skill pipeline", "execute multiple skills together", or when a task naturally decomposes into sequential or parallel skill invocations.
---

Skill-Combo is a skill orchestration framework that treats skill composition like fighting game combos — multiple skills chained together into powerful coordinated attacks that reduce token usage and improve task completion speed.

## When to Use

Use skill-combo when a task requires multiple skills to work together:

- **Chaining**: Output of one skill feeds into the next (e.g., research → write)
- **Parallelizing**: Independent skills run simultaneously (e.g., security audit + performance check)
- **Wrapping**: Setup/teardown around a sub-workflow (e.g., initialize context → run skills → cleanup)
- **Conditional**: Branch based on context or environment (e.g., run tests only if lint passes)

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
```

### Mode 2: OpenCode Plugin

When loaded as an OpenCode plugin, skill-combo auto-detects the OpenCode runtime and uses real skill execution via the `skill()` tool.

**For AI agents running inside OpenCode:**

Simply use the commands directly — the plugin handles skill execution automatically:

- **Scan skills**: `node dist/cli.js scan --save` or just run `scan` via the CLI
- **List combos**: `node dist/cli.js combos`
- **Run a combo**: `node dist/cli.js run <combo-name>` (e.g., `node dist/cli.js run frontend-dev`)

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

## CLI Commands

| Command | Description |
|---------|-------------|
| `scan` | Scan and index all skills from OpenCode skill directories |
| `list` | List discovered skills with metadata |
| `combos` | List registered combos |
| `run <name>` | Execute a combo by name |
| `help [cmd]` | Show help for a command |

### Options

| Flag | Description |
|------|-------------|
| `--dry-run` | Preview execution plan without running skills |
| `--verbose` | Show per-step token usage and timing |
| `--debug` | Enable debug logging |

## Core Exports

- `CLI` — Command-line interface and registry management
- `Engine` — Combo execution engine
- `Planner` — Execution plan generation
- `Registry` — Skill and combo catalog
- `scanSkills()` — Scan skill directories
- `loadDefaultCombos()` — Load built-in combo definitions
- `DefaultInvoker` — Mock invoker for testing
- `OpenCodeInvoker` — Real OpenCode runtime invoker

## Capabilities

- **Skill Discovery**: Automatically scans `~/.config/opencode/skills/` and `~/.agents/skills/`
- **Skill Registry**: Central catalog queryable by category, capability, input, and output
- **Combo Execution**: Chain, parallel, wrap, and conditional execution patterns
- **Context Passing**: Automatic output-to-input context flow between chained skills
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

## Creating Combos

Create combos as YAML files in `combos/examples/`:

```yaml
name: my-combo              # Unique identifier
description: Research then write  # One-liner
type: chain                 # chain|parallel|wrap|conditional
execution: serial           # serial|parallel
skills:                     # Ordered list of skill names
  - content-research-writer
  - humanizer
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

## Runtime Requirements

- **OpenCode runtime**: Uses `OpenCodeInvoker` for real skill execution via the `skill()` tool
- **Local testing**: Uses `DefaultInvoker` for mock execution without OpenCode

## Combo Type Reference

| Type | Execution | Use Case |
|------|-----------|----------|
| `chain` | `serial` | Sequential skill pipelines |
| `parallel` | `parallel` | Independent skill batches |
| `wrap` | `serial` | Setup/teardown around sub-workflow |
| `conditional` | `serial` | Branch based on condition |

**Note**: `interleaved` execution is deferred and requires OpenCode yield protocol support.
