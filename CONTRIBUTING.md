# Contributing to RPG-MCP

Welcome! RPG-MCP is a rules-enforced RPG backend engine with 145+ MCP tools for complete D&D 5e mechanics. This guide will help you get started contributing to the project.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Architecture](#project-architecture)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Git Conventions](#git-conventions)
- [Submitting Changes](#submitting-changes)

---

## Tech Stack

### Core Runtime

| Library | Version | Purpose |
|---------|---------|---------|
| TypeScript | 5.9.3 | ES2022 strict compilation |
| @modelcontextprotocol/sdk | 1.23.0 | MCP protocol framework |
| better-sqlite3 | 12.4.6 | SQLite persistence layer |
| zod | 3.25.76 | Runtime schema validation |

### Math & Procedural Generation

| Library | Purpose |
|---------|---------|
| mathjs | Mathematical expressions (custom effects) |
| nerdamer | Symbolic algebra (spell formulas) |
| simplex-noise | Perlin-like noise (terrain generation) |
| seedrandom | Deterministic RNG (reproducible worlds) |

### Development Tools

| Tool | Purpose |
|------|---------|
| Vitest | Test framework (parallel, forked pools) |
| esbuild | Binary bundling |
| @yao-pkg/pkg | Standalone executable creation |
| ts-node | Direct TypeScript execution |

---

## Project Architecture

```
src/
├── api/              # MCP tool definitions (145+ tools)
│   ├── registry.ts   # ToolRegistry hub with Zod validation
│   ├── combat-tools.ts
│   ├── crud-tools.ts
│   ├── composite-tools.ts
│   └── [25+ specialized tool modules]
│
├── engine/           # Core game logic
│   ├── combat/       # D&D 5e combat (initiative, conditions, damage)
│   ├── spatial/      # Grid system (pathfinding, collision, LoS)
│   ├── magic/        # Spellcasting (concentration, auras, scrolls)
│   ├── dsl/          # Domain-specific language for custom effects
│   ├── social/       # Stealth/perception mechanics
│   ├── strategy/     # Nation simulation (diplomacy, fog of war)
│   ├── worldgen/     # Procedural generation (biomes, rivers, regions)
│   └── pubsub.ts     # Event streaming system
│
├── storage/          # Data persistence (30+ repositories)
│   ├── db.ts         # Database initialization
│   ├── migrations.ts # Schema versioning
│   └── repos/        # Repository pattern implementations
│
├── schema/           # Zod validation schemas (30+ schemas)
│   ├── base-schemas.ts
│   ├── character.ts
│   ├── encounter.ts
│   └── [domain-specific schemas]
│
├── data/             # Preset data
│   ├── creature-presets.ts   # 1100+ creatures
│   ├── encounter-presets.ts  # 50+ templates
│   └── item-presets.ts
│
├── math/             # Mathematical utilities
│   ├── dice.ts       # D&D dice notation (1d20+5)
│   └── physics.ts    # Projectile calculations
│
└── server/           # MCP server setup
    └── types.ts      # SessionContext wrapper
```

### Design Philosophy

**"LLM describes, engine validates"** - The database is the source of truth.

```
Intent Proposal (LLM)
       ↓
Validation (Engine enforces rules/physics)
       ↓
Execution (Database write)
       ↓
Event Publishing (PubSub for observers)
```

---

## Getting Started

### Prerequisites

- Node.js 18.x, 20.x, or 22.x
- npm

### Installation

```bash
git clone https://github.com/Mnehmos/rpg-mcp.git
cd rpg-mcp
npm install
```

### Build & Run

```bash
npm run build         # Compile TypeScript to dist/
npm run dev           # Development mode (ts-node)
npm run start         # Run compiled server
```

### Database Location

The SQLite database is created automatically at:

| Platform | Path |
|----------|------|
| Windows | `%APPDATA%/rpg-mcp/rpg.db` |
| macOS | `~/Library/Application Support/rpg-mcp/rpg.db` |
| Linux | `~/.local/share/rpg-mcp/rpg.db` |

---

## Development Workflow

### TDD Loop

We follow strict Test-Driven Development:

1. **RED** - Write a failing test
2. **GREEN** - Implement the fix
3. **REFACTOR** - Clean up if needed
4. **COMMIT** - Save state immediately
5. **REPEAT**

### Key Commands

```bash
npm test                           # Run all tests
npm test -- tests/specific.test.ts # Single test file
npm test -- --watch                # Watch mode
npm test:coverage                  # Coverage report
npm run build                      # Compile TypeScript
npm run build:binaries             # Create standalone executables
```

### Creating Binaries

```bash
npm run build:binaries
# Outputs:
#   dist-bundle/rpg-mcp-win.exe
#   dist-bundle/rpg-mcp-macos-x64
#   dist-bundle/rpg-mcp-linux-x64
```

---

## Testing

### Framework: Vitest

Configuration in `vitest.config.ts`:

```typescript
{
  globals: true,                    // describe/it/expect are global
  environment: 'node',
  setupFiles: ['./tests/setup.ts'], // crypto polyfill
  pool: 'forks',                    // Parallel test isolation
  maxConcurrency: 4,
  testTimeout: 30000
}
```

### Test Structure

Tests mirror the `src/` directory structure:

```
tests/
├── setup.ts           # Global test setup
├── fixtures.ts        # Deterministic timestamps
├── combat/            # Combat engine tests
├── engine/            # Engine subsystem tests
├── spatial/           # Grid/pathfinding tests
├── storage/           # Repository tests
├── mcp/               # Tool integration tests
├── schema/            # Validation tests
└── integration/       # End-to-end workflows
```

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';
import { FIXED_TIMESTAMP } from './fixtures';

describe('Feature X', () => {
  it('should do something', () => {
    const result = someFunction();
    expect(result).toBe(expectedValue);
  });
});
```

### Determinism

All tests use fixed timestamps and seeded RNG for reproducibility:

```typescript
export const FIXED_TIMESTAMP = '2025-01-01T00:00:00.000Z';
```

---

## Code Style

### TypeScript Configuration

Strict mode is enabled with all safety checks:

```json
{
  "target": "ES2022",
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noImplicitReturns": true,
  "forceConsistentCasingInFileNames": true
}
```

### Code Patterns

**1. Repository Pattern** (Data Access)

```typescript
// storage/repos/character.repo.ts
export function createCharacter(data: CharacterCreate): Character { ... }
export function getCharacter(id: string): Character | null { ... }
export function updateCharacter(id: string, data: Partial<Character>): Character { ... }
```

**2. Zod Validation**

```typescript
// schema/character.ts
export const CharacterSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  level: z.number().int().min(1).max(20),
  // ...
});
```

**3. Tool Handler Pattern**

```typescript
// api/combat-tools.ts
export function handleAttack(args: AttackArgs, ctx: SessionContext) {
  // Validate input
  // Execute game logic
  // Persist to database
  // Return result
}
```

**4. Session Context**

```typescript
withSession(schema, (args, ctx: SessionContext) => {
  // ctx.sessionId, ctx.userId, ctx.worldId available
});
```

### Editor Config

`.editorconfig` enforces:
- 2-space indentation
- LF line endings
- UTF-8 encoding
- Trim trailing whitespace

---

## Git Conventions

### Commit Messages

Use conventional commits:

```
fix(combat): resolve damage calculation overflow
feat(worldgen): add river generation algorithm
test(spatial): add pathfinding edge case coverage
refactor(storage): extract base repository class
docs(readme): update installation instructions
```

| Prefix | Use For |
|--------|---------|
| `fix` | Bug fixes |
| `feat` | New features |
| `test` | Test additions/changes |
| `refactor` | Code restructuring |
| `docs` | Documentation updates |
| `chore` | Build/config changes |

### The Git Pulse Rule

**After every successful test pass, commit immediately:**

```bash
git add . && git commit -m "type(scope): message"
```

Don't batch commits. Save state frequently.

### Branch Naming

- `main` - Production branch
- `development` - Integration branch
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches

---

## Submitting Changes

### Pull Request Process

1. **Fork** the repository
2. **Create a branch** from `development`:
   ```bash
   git checkout -b feature/your-feature development
   ```
3. **Make your changes** following TDD
4. **Run tests**:
   ```bash
   npm test
   ```
5. **Build** to verify compilation:
   ```bash
   npm run build
   ```
6. **Commit** with conventional commit messages
7. **Push** your branch
8. **Open a PR** against `development`

### PR Requirements

- [ ] All tests pass
- [ ] TypeScript compiles without errors
- [ ] Conventional commit messages used
- [ ] New features include tests
- [ ] Code follows existing patterns

### CI Pipeline

GitHub Actions runs on all PRs:

```yaml
Node versions: [18.x, 20.x, 22.x]
Steps:
  - npm ci
  - npm run build
  - npm run test:ci
```

---

## Adding New Features

### Adding a New MCP Tool

1. Create/update tool file in `src/api/`:

```typescript
// src/api/my-tools.ts
import { z } from 'zod';
import { withSession } from '../server/types';

export const MyToolSchema = z.object({
  param: z.string(),
});

export function handleMyTool(args: z.infer<typeof MyToolSchema>, ctx: SessionContext) {
  // Implementation
}
```

2. Register in `src/api/tool-registry.ts`

3. Add tests in `tests/mcp/my-tools.test.ts`

### Adding a New Schema

1. Create schema in `src/schema/`:

```typescript
// src/schema/my-entity.ts
import { z } from 'zod';
import { IdField, TimestampFields } from './base-schemas';

export const MyEntitySchema = z.object({
  ...IdField,
  ...TimestampFields,
  name: z.string(),
});
```

2. Add validation tests in `tests/schema/`

### Adding a New Repository

1. Create repo in `src/storage/repos/`:

```typescript
// src/storage/repos/my-entity.repo.ts
import { db } from '../db';

export function create(data: MyEntityCreate): MyEntity { ... }
export function getById(id: string): MyEntity | null { ... }
export function update(id: string, data: Partial<MyEntity>): MyEntity { ... }
export function remove(id: string): void { ... }
```

2. Add migration if schema changes
3. Add tests in `tests/storage/`

---

## Questions?

- Open an issue for bugs or feature requests
- Check existing tests for usage examples
- Review `CLAUDE.md` for development guidelines

Thank you for contributing!
