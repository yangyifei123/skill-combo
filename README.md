# Skill-Combo

Chain multiple skills into devastating combos, like a fighting game.

[![npm version](https://img.shields.io/npm/v/skill-combo?style=flat-square)](https://www.npmjs.com/package/skill-combo)
[![License: MIT](https://img.shields.io/npm/l/skill-combo?style=flat-square)](https://opensource.org/licenses/MIT)
[![Test Status](https://img.shields.io/github/actions/workflow/status/yangyifei123/skill-combo/test.yml?branch=main&style=flat-square&label=tests)](https://github.com/yangyifei123/skill-combo/actions)

---

## The Problem

You have 100+ skills installed. Nobody memorizes what each one does.

You find a skill that works, but alone it can only do so much. The real value comes from chaining skills together into powerful combos. But manually chaining them is tedious, and you never know if it will actually work until you run it.

**Skill-Combo** solves this. It automatically discovers your skills, recommends the best combos, and executes them with automatic context passing, parallel execution, and error recovery.

---

## Features

- **Automatic Discovery** — Scan `~/.config/opencode/skills/` and `~/.agents/skills/` to find all installed skills
- **Smart Combo Matching** — Detect multi-skill tasks and recommend optimal combos
- **5 Execution Modes** — chain, parallel, wrap, conditional, and subagent
- **Context Passing** — Output from one skill automatically becomes input to the next
- **Wave-based Execution** — Subagent combos run steps in dependency-ordered waves
- **Dry Run** — Preview execution plans before running
- **Error Recovery** — Automatic retry with configurable attempts for transient failures
- **Session Mining** — Extract patterns from history to generate new SKILL.md files
- **OpenCode Integration** — Auto-enabled every session, like caveman mode

---

## Installation

```bash
# Install dependencies and build
npm install && npm run build

# Copy to OpenCode skills directory
cp -r skill-combo ~/.config/opencode/skills/

# Or create a symlink (Linux/macOS)
ln -s $(pwd)/skill-combo ~/.config/opencode/skills/skill-combo

# Windows
mklink /D %USERPROFILE%\.config\opencode\skills\skill-combo E:\AI_field\skill-combo
```

---

## Quick Start

```bash
# Step 1: Scan your environment to discover installed skills
node dist/cli.js scan --save

# Step 2: View available combos and validate them
node dist/cli.js combos --validate

# Step 3: Run a combo (dry run first to preview)
node dist/cli.js run frontend-dev --dry-run
node dist/cli.js run frontend-dev
```

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `scan [--save] [--remote]` | Scan for local skills; `--remote` discovers remote via ClawHub |
| `list [--source=all\|local\|remote]` | List discovered skills by source |
| `search <query>` | Search local and remote skills |
| `combos [--validate]` | List all combos and validate them |
| `run <name> [--dry-run]` | Execute a combo; `--dry-run` previews the plan |
| `extract [options]` | Mine patterns from session history to generate SKILL.md |

---

## Combo Types

### chain

Steps execute sequentially. Each step receives the output from the previous step as input.

```
Step 1 → Step 2 → Step 3 → ... → Step N
```

Example: `frontend-design → ts-react-nextjs`

### parallel

Steps execute concurrently. Results are aggregated when all complete.

```
┌─ Step 1 ─┐
├─ Step 2 ─┤ → Aggregated Result
└─ Step 3 ─┘
```

Example: `security-auditor + security-best-practices + clawdefender`

### wrap

A header and footer step surround the middle steps. Useful for setup and teardown.

```
Header → Middle Steps → Footer
```

Example: `init-environment → skill → cleanup`

### conditional

Branches based on conditions (e.g., environment: production vs development).

```
Condition → Branch A | Branch B
```

### subagent

Advanced combo using OpenCode's `task()` function. Each step spawns an independent subagent that loads one or more skills. Steps with no dependencies run in parallel (Wave 0), followed by dependent steps in subsequent waves.

Example: `subagent-fullstack` — research → design → implement → test → docs

---

## Subagent Orchestration

Subagent combos let a single AI agent achieve team-like results by spawning multiple subagents, each loading specific skills.

### How It Works

1. **Wave Scheduling** — Steps are grouped into waves based on dependencies. Wave 0 steps (no dependencies) run in parallel. Each subsequent wave waits for its dependencies before running.

```
Wave 0: [research]                    # Parallel (no dependencies)
Wave 1: [design]                      # Parallel (depends on research)
Wave 2: [implement]                  # Parallel (depends on design)
Wave 3: [test]                       # Parallel (depends on implement)
Wave 4: [docs]                       # Parallel (depends on test)
```

2. **Context Injection** — Steps receive output from dependencies via `context_from` fields.

3. **Error Strategies** — Choose from `fail-fast` (stop on error), `continue` (skip failed steps), or `partial` (aggregate what succeeded).

### YAML Format

```yaml
combos:
  - name: my-subagent-combo
    type: subagent
    execution: serial
    subagent_steps:
      - name: research
        skills:
          - context7
        prompt: "Research best practices..."
        depends_on: []

      - name: design
        skills:
          - architecture-designer
        prompt: "Design the system..."
        depends_on:
          - research
        context_from:
          - research

    subagent_aggregation: structured
    subagent_error_strategy: continue
    timeout: 600000
```

### Preset Subagent Combos

| Name | Description |
|------|-------------|
| `subagent-fullstack` | research → design → implement → test → docs |
| `subagent-security-audit` | vuln-scan ‖ auth-check ‖ dependency-audit → report |

---

## Configuration

Create custom combos in `combos/examples/` with YAML files:

```yaml
combos:
  - name: my-combo
    type: chain
    execution: serial
    skills:
      - frontend-design
      - ts-react-nextjs
```

Supported combo types: `chain`, `parallel`, `wrap`, `conditional`, `subagent`

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              Skill-Combo v3.0               │
├─────────────────────────────────────────────┤
│  Scanner    │  Registry  │  Engine           │
│  - Discovery│  - Storage │  - Serial exec    │
│  - Index    │  - Query   │  - Parallel exec  │
│  - Fallback │  - Persist │  - Retry          │
├─────────────────────────────────────────────┤
│  Planner    │  CLI       │  Cache/TTL        │
│  - Sorting  │  - scan    │  - Deduplication  │
│  - Optimize │  - run    │  - Expiration     │
├─────────────────────────────────────────────┤
│  SubagentOrchestrator │  WaveScheduler      │
│  - task() invocation  │  - Wave generation  │
│  - Skill loading      │  - Dependency resol │
│  - Error handling    │  - Parallel sched   │
├─────────────────────────────────────────────┤
│  SessionProvider │  PatternMiner           │
│  - Session list   │  - n-gram mining       │
│  - Session read   │  - Frequency stats     │
│  - JSONL fallback │  - Worthiness scoring  │
├─────────────────────────────────────────────┤
│  SkillGenerator                            │
│  - SKILL.md generation │  - YAML frontmatter │
├─────────────────────────────────────────────┤
│  ClawHubClient    │  RemoteScanner         │
│  - API calls      │  - Remote discovery    │
│  - Search/list    │  - Result merging     │
└─────────────────────────────────────────────┘
```

---

## Comparison

| Aspect | Without Skill-Combo | With Skill-Combo |
|--------|-------------------|------------------|
| Remember skills | Manually (100+) | Auto-scanned |
| Combine skills | Manual, one by one | Auto-recommended |
| Context passing | Repeat everything | Auto-piped |
| Parallel execution | Impossible | Security + perf checks run together |
| Validation | Run to find out | `--dry-run` preview |
| Dependency handling | Guess order | Auto topological sort |
| Failure recovery | Restart from scratch | Auto-retry transient errors |
| Turns per task | 5-8 | 1-2 |

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

[MIT](LICENSE)
