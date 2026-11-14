# santux

Applies an opinionated tooling setup (lint, format, commit message linting, git hooks, editor settings and Node version pin) to an existing TypeScript project.

## Usage

Run it inside a project that has a `package.json`:

```sh
npx santux init
```

## CLI Options

- `--dry-run`: print the plan and exit without changing anything.
- `--toolchain oxc|eslint`: choose the lint and format Toolchain without being asked (`oxc` is the default). `oxc` installs `@santux/oxc-config` with oxlint and oxfmt.
- `--yes`: accept the plan without asking for confirmation.

Use `-h` or `--help` to see all available options.

## Updating

After a config package update, run `npx santux init` again: it installs the latest config package and the tool versions it pins, and never rewrites your config files.
