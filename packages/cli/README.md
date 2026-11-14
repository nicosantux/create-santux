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

## Migrating from `create-santux`

`santux` replaces the deprecated `create-santux` package. It no longer creates projects from templates: create the project with the official tool of your framework (for example `create-next-app` or `create-vite`), then run `npx santux init` inside it.

Projects created with `create-santux` can run `npx santux init` too. It replaces their lint and format configs with the ones from the config package of the chosen Toolchain, and lists every file it removes or replaces before applying the plan.
