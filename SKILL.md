# Skill-Combo

**Plugin for OpenCode** - Skill orchestration framework that enables multiple skills to work together in combos.

## Description

Skill-Combo is a **skill orchestration framework** for OpenCode that enables multiple skills to work together dynamically, like a fighting game's combo system. Instead of skills being isolated, Skill-Combo allows them to chain, parallelize, and compose into powerful "combo attacks" that reduce token usage and improve task completion speed.

## Capabilities

- **Skill Discovery**: Automatically scans and indexes all skills from OpenCode skill directories
- **Skill Registry**: Central catalog with query by category, capability, input, and output
- **Combo Execution**: Execute skill chains with shared context for token efficiency
- **CLI Interface**: Scan, list, and run skill combos

## Use Cases

- Chain research → analysis → writing skills for automated reports
- Parallel execution of independent skills (planned)
- Wrapper skills for common patterns (planned)

## Usage

### Commands

```
skill-combo scan     # Scan and index all skills
skill-combo list     # List discovered skills
skill-combo combos   # List registered combos
```

### As Module

```typescript
import { CLI, Engine, Planner } from 'skill-combo';

const cli = new CLI();
await cli.scan();
const { skills } = cli.listSkills();
```

## Installation

This is an OpenCode plugin. Install by copying to your skills directory:

```bash
cp -r skill-combo ~/.config/opencode/skills/
```

## Technical Details

**Combo Types**:
- `chain`: Skills chained - output feeds to next
- `parallel`: Skills run simultaneously (in development)
- `wrap`: Wrapper around sub-combo (in development)
- `conditional`: Branch based on condition (in development)

**Execution Modes**:
- `serial`: One skill after another ✅
- `parallel`: Multiple simultaneously (in development)
- `interleaved`: Control alternation (in development)

## Examples

See `combos/examples/` for combo definitions.
