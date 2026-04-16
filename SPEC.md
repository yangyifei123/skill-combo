# Skill-Combo System Specification

**Version**: 1.1 (Revised based on Oracle/Momus review)
**Changelog**:
- v1.1: Clarified Combo Type vs Execution Mode distinction, added ResultAggregation, defined Wrap/Conditional combo semantics, added OpenCode integration hooks, measurable success criteria
- v1.0: Initial draft

## 1. Concept & Vision

**Skill-Combo** is a **skill orchestration framework** for OpenCode that enables multiple skills to work together dynamically, like a fighting game's combo system. Instead of skills being isolated, Skill-Combo allows them to chain, parallelize, and compose into powerful "combo attacks" that reduce token usage and improve task completion speed.

**Core Metaphor**: Fighting game combo system where you chain special moves into devastating combos. Each skill is a "move", and the combo system determines when and how to chain them.

**Key Differentiator**: Unlike Claude Code hooks (which are event-based scripts) or standalone skills, Skill-Combo is an **active orchestrator** that analyzes tasks, selects appropriate skill chains, and executes them with optimal ordering and parallelism.

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        SKILL-COMBO CORE                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Skill Scanner│  │ Skill Registry│  │  Combo Engine        │  │
│  │ - Discovery  │  │ - Metadata    │  │  - Serial execution  │  │
│  │ - Indexing   │  │ - Tags        │  │  - Parallel execution│  │
│  │ - Profiling  │  │ - Deps        │  │  - Interleaved exec  │  │
│  └──────────────┘  └──────────────┘  │  - Combo composition │  │
│                                       └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Task Analyzer│  │ Combo Planner │  │  Execution Monitor  │  │
│  │ - Intent     │  │ - Sequencing  │  │  - Status tracking  │  │
│  │ - Scope      │  │ - Parallelism │  │  - Error recovery   │  │
│  │ - Strategy   │  │ - Optimization│  │  - Result aggreg.   │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 3. Component Data Flow

Components communicate via typed interfaces:

```
┌──────────────┐     ScanResult      ┌──────────────┐
│ Skill Scanner│────────────────────▶│   Registry   │
│ (read files) │                     │ (in-memory)  │
└──────────────┘                     └──────┬───────┘
                                            │ Registry.lookup()
┌──────────────┐                           │              ┌──────────────┐
│ Task Analyzer│◀──────────────────────────┼──────────────│ Combo Planner│
│(parse intent)│                           │              │(build plan)  │
└──────┬───────┘                           │              └──────┬───────┘
       │ User request                       │                     │
       │ (natural language)                 │                     │ ExecutionPlan
       ▼                                    │                     ▼
┌──────────────┐     ExecutionPlan        │              ┌──────────────┐
│Task Analyzer │───────────────────────────▶│─────────────▶│   Engine     │
│ (capabilities)                            │              │(execute combo)│
└────────────────                            │              └──────┬───────┘
                                                  │                     │
                                                  │                     │ SkillContext
                                                  │                     ▼
                                                  │              ┌──────────────┐
                                                  └──────────────│   Monitor    │
                                                                 │(track status)│
                                                                 └──────────────┘
```

### Data Types Exchanged

| From → To | Data Type | Description |
|-----------|-----------|-------------|
| Scanner → Registry | `ScanResult` | List of discovered skills with metadata |
| Registry → Planner | `Skill[]` | Queried skills for planning |
| Task Analyzer → Planner | `UserRequest` | Parsed user intent with required capabilities |
| Planner → Engine | `ExecutionPlan` | Ordered steps with dependencies |
| Engine → Monitor | `ComboResult` | Execution results with outputs/errors |

### Execution Semantics

**Serial Execution:**
```
Step 1 (Skill A) → Step 2 (Skill B) → Step 3 (Skill C)
     │                  │                  │
     └──────────────────┴──────────────────┘
                    Shared Context
Skill B can read outputs from Skill A via context
Skill C can read outputs from Skill A and B
```

**Parallel Execution:**
```
Step 1 ──┬── Skill A ──┬── Output A ─┐
         ├── Skill B ──┼── Output B ─┼──▶ Aggregation ──▶ Final Output
         └── Skill C ──┘── Output C ─┘
All skills start simultaneously
Results merged according to ResultAggregation strategy
```

**Interleaved Execution:**
```
Skill A: start ──▶ yield ──▶ resume ──▶ complete
                    │           │
         Skill B:       start ──▶ yield ──▶ complete
                                        │
                      (control alternates at yield points)
```

## 3. Core Components

### 3.1 Skill Scanner
- **Purpose**: Discovers skills in OpenCode's skill directories
- **Locations**:
  - `~/.config/opencode/skills/`
  - `~/.agents/skills/`
- **Function**: Parses SKILL.md files, extracts metadata, profiles capabilities
- **Output**: Indexed skill catalog with capability tags

### 3.2 Skill Registry
- **Purpose**: Central catalog of all discovered skills
- **Schema**:
```yaml
skill:
  id: string (unique name)
  name: string
  description: string
  location: string (file path)
  category: string[] (tags for classification)
  capabilities: string[] (what it can do)
  dependencies: string[] (other skills it needs)
  inputs: string[] (what it expects)
  outputs: string[] (what it produces)
  compatibility: string[] (works well with)
  load_skills: string[] (skill dependencies)
  category_priority: number (1-10)
```

### 3.3 Combo Engine
The heart of Skill-Combo - determines how skills execute together.

**Combo Type** (structural pattern - HOW skills are composed):
| Type | Description | Example |
|------|-------------|---------|
| `chain` | Skills chained - output feeds to next | A → B → C |
| `parallel` | Skills run independently | A ‖ B ‖ C |
| `wrap` | Wrapper skill around sub-combo | A → [B → C] → A |
| `conditional` | Branch based on condition | A ? {condition} → B : C |

**Execution Mode** (temporal pattern - WHEN skills run):
| Mode | Description | Use Case |
|------|-------------|----------|
| `serial` | One skill after another completes | Chain dependencies |
| `parallel` | Multiple skills simultaneously | Independent tasks |
| `interleaved` | Skills yield control periodically | Long-running tasks, collaborative |

**Key Distinction:**
- **Combo Type** defines the structural relationship between skills
- **Execution Mode** defines the temporal execution order

**Result Aggregation** (for parallel execution):
| Strategy | Behavior |
|----------|----------|
| `merge` | Deep merge all outputs (default) |
| `override` | Later skills override earlier |
| `fail-on-conflict` | Error if keys overlap |
| `first-win` | First non-null value wins |

**Wrap Combo Detail:**
```
A → [B → C] → A
│           │
└───────────┘
Wrapper skill A:
1. Executes once at start (setup)
2. Then runs sub-combo [B → C] as a unit
3. Executes again at end (teardown)
Data flows through B→C using A's context
```

**Conditional Combo Detail:**
```yaml
combo:
  name: "code-review-action"
  type: conditional
  condition: "issue.severity"
  branches:
    security: ["security-auditor", "security-fix"]
    performance: ["performance-optimization", "benchmark"]
    general: ["code-review"]
```

### 3.4 Task Analyzer
- Parses user requests to understand intent
- Identifies required capabilities
- Determines optimal combo strategy

### 3.5 Combo Planner
- Maps tasks to skill sequences
- Optimizes for:
  - Token efficiency
  - Execution speed
  - Dependency satisfaction
- Outputs execution plan

### 3.6 Execution Monitor
- Tracks combo execution state
- Handles errors and recovery
- Aggregates results from parallel skills
- Reports progress back to user

## 4. Combo Definition Format

Combos are defined in `combos.yaml` files that users can create:

```yaml
# Example: Full-Stack Web Development Combo
combo:
  name: "fullstack-web-dev"
  description: "Complete web application development"
  execution: parallel  # or serial, interleaved
  skills:
    - frontend-design      # UI/UX design
    - ts-react-nextjs      # React implementation
    - api-rest-design      # API design
    - postgresql-patterns  # Database

# Example: Chain Combo with data flow
combo:
  name: "market-research-report"
  description: "Research → Analyze → Write"
  execution: serial
  skills:
    - market-research-1.0.0  # Output: market data
    - seo-content-writer       # Input: market data → Output: report
    - copywriting             # Input: report → Output: final copy

# Example: Conditional Combo
combo:
  name: "code-review-action"
  execution: conditional
  condition: "issue_type"
  branches:
    security: security-auditor
    performance: performance-optimization
    general: code-review
```

## 5. Plugin System

Skill-Combo itself is a **plugin** that users can install/uninstall.

### 5.1 Plugin Structure
```
skill-combo/
├── SKILL.md           # Plugin manifest
├── combos/            # User-defined combos
│   └── *.yaml
├── core/               # Combo engine
│   ├── scanner.ts
│   ├── registry.ts
│   ├── engine.ts
│   ├── planner.ts
│   └── monitor.ts
├── runtime/            # Execution runtime
│   └── executor.ts
├── config/
│   └── default-combos.yaml
└── tests/
```

### 5.2 Installation
```bash
# User installs skill-combo
op skill install skill-combo

# Auto-discovers existing skills
# Builds skill registry
# Registers combo commands
```

### 5.3 Uninstallation
```bash
# Clean removal
op skill uninstall skill-combo
# Removes plugin but preserves user combos
```

## 6. Skill Metadata Enhancement

To enable smart combo planning, skills can include enhanced metadata:

```yaml
# Enhanced SKILL.md section (optional)
combo:
  capabilities:
    - web-development
    - frontend
    - typescript
  inputs:
    - requirements
    - design-files
  outputs:
    - source-code
    - tests
  works_well_with:
    - api-rest-design
    - postgresql-patterns
  execution_hints:
    parallel_safe: true
    token_cost: medium
    estimated_time: short
```

## 7. Command Interface

### 7.1 Core Commands

| Command | Description |
|---------|-------------|
| `skill-combo scan` | Scan and index all skills |
| `skill-combo list` | List all discovered skills |
| `skill-combo combo list` | List available combos |
| `skill-combo combo create <name>` | Create new combo |
| `skill-combo combo run <name>` | Execute a combo |
| `skill-combo plan <task>` | Plan best combo for task |
| `skill-combo suggest` | Suggest combos for current task |

### 7.2 Natural Language Interface

When integrated with OpenCode, users can say:
- "Build me a full-stack app" → triggers `fullstack-web-dev` combo
- "Research and write about X" → triggers `market-research-report` combo
- "Fix the bug and test it" → triggers `debug-test` combo

## 8. Token Optimization

Skill-Combo reduces token usage by:

1. **Shared Context**: Skills share context instead of each re-loading
2. **Parallel Execution**: Independent skills run simultaneously
3. **Smart Caching**: Skill outputs cached and reused
4. **Minimal Redundancy**: No duplicate capability execution

## 9. OpenCode Integration Points

Skill-Combo integrates with OpenCode via:

1. **Skill Loader**: Hooks into skill discovery
2. **Execution API**: Uses OpenCode's task() function
3. **Context Sharing**: Leverages session context
4. **Tool Integration**: Uses existing tools (grep, read, write, etc.)

## 10. First Implementation Scope (MVP)

For iteration 1, we implement:

1. ✅ Skill Scanner - discover and index skills
2. ✅ Skill Registry - store and query skill metadata
3. ✅ Basic Combo Engine - serial execution
4. ✅ CLI commands - scan, list, run
5. ✅ Plugin structure - installable SKILL.md

**Deferred to later iterations**:
- Parallel execution
- Interleaved execution
- Conditional combos
- Natural language integration
- Token optimization
- Error recovery

## 11. File Structure

```
E:/AI_field/skill-combo/
├── SKILL.md                    # Plugin manifest
├── SPEC.md                     # This specification
├── README.md                   # User documentation
├── combos/                     # User combo definitions
│   └── examples/
│       └── example-combo.yaml
├── src/
│   ├── index.ts               # Entry point
│   ├── scanner.ts             # Skill discovery
│   ├── registry.ts            # Skill catalog
│   ├── engine.ts              # Combo execution
│   ├── planner.ts             # Combo planning
│   ├── types.ts               # TypeScript types
│   └── cli.ts                 # CLI interface
├── tests/
│   ├── scanner.test.ts
│   ├── registry.test.ts
│   └── engine.test.ts
├── config/
│   └── default-combos.yaml
└── package.json
```

## 12. Success Criteria (Measurable)

| Criterion | Measure | Verification Method |
|-----------|---------|---------------------|
| Skill Discovery | Scans and catalogs all skills in skill directories | Unit test with mock filesystem, verify all test skills found |
| Skill Metadata | Extracts name, description, categories, capabilities, inputs, outputs | Unit tests verify each field extracted correctly |
| Combo Execution | Runs a serial combo of 2+ skills successfully | Integration test with mock skills, verify sequential execution |
| CLI Functionality | All commands (scan, list, run) work | CLI tests verify command output |
| Plugin Installation | Can be installed as OpenCode skill | Manual verification via skill install command |
| Result Aggregation | Parallel outputs merge according to aggregation strategy | Unit tests for each ResultAggregation strategy |

### Token Efficiency Measurement

Token efficiency is measured by:
1. **Baseline**: Sum of tokens for each skill invoked individually
2. **Combo**: Tokens used when skills run as a combo
3. **Formula**: `efficiency = (baseline - combo) / baseline * 100%`

Target: **≥20% token reduction** through:
- Shared context (skills don't reload state)
- Parallel execution (concurrent skill runs)
- Reduced redundant processing

---

## 13. OpenCode Integration Points

Skill-Combo integrates with OpenCode via:

1. **Skill Loader Hook**: Intercepts skill discovery to build registry
2. **Execution API**: Uses OpenCode's `task()` function to invoke skills
3. **Context Sharing**: Shares session context between chained skills
4. **Tool Integration**: Uses existing tools (grep, read, write, etc.)

### Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenCode Runtime                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │ Skill Loader │───▶│ Skill-Combo │◀───│  task()    │   │
│  │   (hooks)    │    │   Plugin    │    │  (invoke)  │   │
│  └─────────────┘    └──────┬──────┘    └─────────────┘   │
│                            │                                │
│                     ┌──────▼──────┐                        │
│                     │   Context   │                        │
│                     │   Store     │                        │
│                     └─────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### Hook Points

| OpenCode Hook | Skill-Combo Usage |
|---------------|-------------------|
| `skill.discovered` | Add skill to registry |
| `skill.loaded` | Track skill dependencies |
| `tool.execute.before` | Intercept skill invocation |
| `tool.execute.after` | Capture skill outputs |

---

**Document Version**: 1.1
**Last Updated**: 2026-04-17
**Status**: Revised based on Oracle/Momus review
