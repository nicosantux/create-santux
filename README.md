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

## Local development

Test the CLI against unpublished config packages with `SANTUX_LOCAL`. It reads the Toolchain package from this monorepo and installs it with `file:` instead of using the registry:

```sh
pnpm --filter santux dev
pnpm --filter santux link-cli
cd /path/to/test-project && SANTUX_LOCAL=1 santux init
```

Do not commit the resulting `file:` dependency in the test project.
