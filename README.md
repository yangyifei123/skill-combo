# Skill-Combo Plugin

**Version**: 1.0.0
**Type**: OpenCode Plugin
**Description**: Skill orchestration framework that chains multiple skills together like fighting game combos, enabling serial, parallel, and composite skill execution for token efficiency.

## Quick Start

```bash
npm install && npm run build
node dist/cli.js scan --save
node dist/cli.js combos --validate
node dist/cli.js run frontend-dev --dry-run
```

## Features

- **Scanner with Fallback**: Incremental scan auto-falls back to full scan if no skills found
- **Registry Persistence**: Scan results saved to `.skill-combo-registry.json` with `--save`
- **10 Pre-configured Combos**: Ready-to-use skill chains for common workflows
- **JSON Output**: Machine-readable output with `--json` flag
- **Error Recovery**: Automatic retry with configurable delay for transient failures
- **Cache with TTL**: Per-entry TTL support for deduplicating skill results
- **Combo Validation**: `--validate` flag checks skill availability

## Installation

```bash
# Copy plugin to OpenCode skills directory
cp -r skill-combo ~/.config/opencode/skills/

# Or create symlink
ln -s $(pwd)/skill-combo ~/.config/opencode/skills/skill-combo
```

## CLI Commands

```bash
skill-combo scan [--save] [--json]     # Scan and index skills
skill-combo list [--json]              # List discovered skills
skill-combo combos [--json] [--validate]  # List/validate combos
skill-combo run <name> [--dry-run] [--json] [--verbose]  # Execute a combo
```

## Available Combos

| Combo | Type | Skills |
|-------|------|--------|
| `frontend-dev` | chain | frontend-design → ts-react-nextjs |
| `frontend-vue` | chain | frontend-design → ts-vue-svelte |
| `api-first` | chain | api-rest-design → python-patterns → testing-strategies |
| `deploy-pipeline` | chain | testing-strategies → docker-patterns → kubernetes-patterns |
| `code-review-partial` | parallel | performance-optimization, testing-strategies |
| `skill-audit` | parallel | skill-creator, skill-judge |
| `docs-pipeline` | chain | code-docs → project-docs |
| `git-workflow` | chain | git-commit → git-release |
| `content-creation` | chain | content-research-writer → humanizer |
| `research-report` | chain | content-research-writer → humanizer |

## Architecture

```
┌─────────────────────────────────────────────┐
│               Skill-Combo                   │
├─────────────────────────────────────────────┤
│  Scanner    │  Registry   │  Engine        │
│  - Discover │  - Store    │  - Serial     │
│  - Index    │  - Query    │  - Parallel   │
│  - Fallback │  - Persist  │  - Retry       │
├─────────────────────────────────────────────┤
│  Planner    │  CLI        │  Cache/TTL    │
│  - Sequence │  - scan     │  - Dedup      │
│  - Optimize │  - run      │  - Expiry     │
└─────────────────────────────────────────────┘
```

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT
