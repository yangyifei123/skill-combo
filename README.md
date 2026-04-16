# Skill-Combo Plugin

**Version**: 0.1.0
**Type**: OpenCode Plugin
**Description**: Skill orchestration framework that chains multiple skills together like fighting game combos, enabling serial, parallel, and composite skill execution for token efficiency.

## Features

- **Skill Discovery**: Scans and indexes all skills from OpenCode skill directories
- **Skill Registry**: Central catalog with query capabilities (by category, capability, input, output)
- **Combo Engine**: Execute skill chains serially with shared context
- **CLI**: Scan, list, and run skill combos from command line

## Installation

```bash
# Copy plugin to OpenCode skills directory
cp -r skill-combo ~/.config/opencode/skills/

# Or create symlink
ln -s $(pwd)/skill-combo ~/.config/opencode/skills/skill-combo
```

## Usage

### CLI Commands

```bash
# Scan and index all skills
skill-combo scan

# List discovered skills
skill-combo list

# List registered combos
skill-combo combos
```

### As a Module

```typescript
import { CLI, Engine, Planner, Registry, scanSkills } from 'skill-combo';

// Create CLI instance
const cli = new CLI();

// Scan for skills
const { skills, errors } = await cli.scan();

// List all skills
const { skills: allSkills } = cli.listSkills();

// Create and execute a combo
const combo = {
  name: 'research-write',
  description: 'Research then write report',
  type: 'chain',
  execution: 'serial',
  skills: ['market-research-1.0.0', 'seo-content-writer'],
};

const planner = cli.getPlanner();
const engine = cli.getEngine();
const invoker = new DefaultInvoker();

const plan = planner.plan(combo, []);
const result = await engine.execute(combo, plan, invoker);
```

## Combo Types

| Type | Description |
|------|-------------|
| `chain` | Skills chained - output feeds to next |
| `parallel` | Skills run independently (planned) |
| `wrap` | Wrapper skill around sub-combo (planned) |
| `conditional` | Branch based on condition (planned) |

## Execution Modes

| Mode | Description |
|------|-------------|
| `serial` | One skill after another ✅ |
| `parallel` | Multiple skills simultaneously (planned) |
| `interleaved` | Control alternates at yield points (planned) |

## Configuration

```yaml
# config/default-combos.yaml
combos:
  - name: research-report
    type: chain
    execution: serial
    skills:
      - market-research-1.0.0
      - seo-content-writer
```

## Architecture

```
┌─────────────────────────────────────────────┐
│               Skill-Combo                   │
├─────────────────────────────────────────────┤
│  Scanner    │  Registry   │  Engine        │
│  - Discover │  - Store    │  - Serial     │
│  - Index    │  - Query    │  - Parallel*   │
│  - Profile  │             │  - Interleaved* │
├─────────────────────────────────────────────┤
│  Planner    │  CLI        │  Invoker      │
│  - Sequence │  - scan     │  - OpenCode*  │
│  - Optimize │  - list     │  - Mock       │
│              │  - run      │               │
└─────────────────────────────────────────────┘
* = In development
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Type check
npm run build
```

## License

MIT
