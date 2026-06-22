#!/usr/bin/env bash
# Scaffold a new SDD module: folder + AGENTS.md (from template) + CLAUDE.md symlink.
# The spec comes FIRST (root Rule 12-13); add schema.ts + index.ts + *.integration.test.ts after.
#
# Usage: scripts/new-module.sh <dir> <name>
#   scripts/new-module.sh packages/api/src/routers/watchlist watchlist
set -euo pipefail

dir="${1:?usage: new-module.sh <dir> <name>}"
name="${2:?usage: new-module.sh <dir> <name>}"
agents="$dir/AGENTS.md"

mkdir -p "$dir"
if [ -e "$agents" ]; then
  echo "refusing to overwrite existing $agents" >&2
  exit 1
fi

cat >"$agents" <<EOF
# $name router (\`$name\`)

> One-line summary. Contract format + error codes: \`packages/api/AGENTS.md\`.

## Procedures

### \`proc\` — description
- **Access:** public | protected
- **Input:** <named Zod schema in schema.ts>
- **Output:** <shape>
- **Errors:** CODE (when)
- **Side effects:** ...

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
|      |     |

## Dependencies

- **Calls / Reads / Writes / Feeds:** ...

## Hardest invariant(s)

What the colocated \`*.integration.test.ts\` must assert.

## Links

Tree / parent / related specs.
EOF

ln -sf AGENTS.md "$dir/CLAUDE.md"
echo "created $agents (+ CLAUDE.md symlink)"
echo "next (TDD): write the spec, then schema.ts + index.ts + $name.integration.test.ts."
