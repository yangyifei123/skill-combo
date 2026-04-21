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

### Via skill() Tool

Invoke skill-combo through the skill tool:

```javascript
// Run a pre-defined combo
await skill({ name: 'skill-combo', user_message: 'run research-report' });

// Scan for available skills
await skill({ name: 'skill-combo', user_message: 'scan' });

// List discovered skills
await skill({ name: 'skill-combo', user_message: 'list' });

// List registered combos
await skill({ name: 'skill-combo', user_message: 'combos' });

// Dry-run to preview execution plan
await skill({ name: 'skill-combo', user_message: 'run research-report --dry-run' });

// Verbose execution with per-step stats
await skill({ name: 'skill-combo', user_message: 'run research-report --verbose' });
```

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
name: research-report
type: chain
execution: serial
skills:
  - market-research-1.0.0
  - seo-content-writer
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
  - market-research-1.0.0
  - seo-content-writer
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
market-research-1.0.0 outputs: { keywords: [...], trends: [...] }
  ↓
Context for seo-content-writer:
  {
    "market-research-1.0.0.output": { keywords: [...], trends: [...] },
    "step.inputs": {}
  }
  ↓
seo-content-writer can access: context["market-research-1.0.0.output"].keywords
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

### Research to Report

```javascript
await skill({ name: 'skill-combo', user_message: 'run research-report' });
```

Runs `market-research-1.0.0` then feeds its output into `seo-content-writer`.

### Parallel Code Review

```javascript
await skill({ name: 'skill-combo', user_message: 'run code-review-full --verbose' });
```

Runs `security-auditor` and `performance-optimization` simultaneously.

### Frontend Pipeline

```javascript
await skill({ name: 'skill-combo', user_message: 'run frontend-dev' });
```

Chains `frontend-design` → `ts-react-nextjs` for design-to-code workflow.

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
| `list` returns 0 skills | Registry not persisted between CLI invocations | Use programmatic API or run scan+list in same process |
| `run` fails: combo not found | Combo name typo or not loaded | Run `combos` to list available names |
| `run` fails: skill not found | Skill missing from registry | Run `scan` first to discover skills |
| Timeout during execution | Skill takes too long | Use `--verbose` to identify slow skill, increase timeout |
| Context missing between steps | Previous skill returned no output | Check previous skill's success status with `--verbose` |

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
