# @santux/oxc-config

Shared oxlint, oxfmt and commitlint config for TypeScript projects. It follows the opinions of [`@santux/eslint-config`](../eslint-config) with native oxlint rules, plus JS plugins for the few rules oxlint has no native version of.

## Entries

| Entry                                | Tool       | Export        |
| ------------------------------------ | ---------- | ------------- |
| `@santux/oxc-config/lint`            | oxlint     | Config object |
| `@santux/oxc-config/next`            | oxlint     | Config object |
| `@santux/oxc-config/react-vite`      | oxlint     | Config object |
| `@santux/oxc-config/tanstack-start`  | oxlint     | Config object |
| `@santux/oxc-config/astro`           | oxlint     | Config object |
| `@santux/oxc-config/astro-react`     | oxlint     | Config object |
| `@santux/oxc-config/tailwind`        | oxlint     | Config object |
| `@santux/oxc-config/format`          | oxfmt      | Config object |
| `@santux/oxc-config/format-next`     | oxfmt      | Config object |
| `@santux/oxc-config/format-astro`    | oxfmt      | Config object |
| `@santux/oxc-config/format-tailwind` | oxfmt      | Config object |
| `@santux/oxc-config/commitlint`      | commitlint | Config object |

The lint entry enables type-aware rules (`options.typeAware`, run by `oxlint-tsgolint`) with the equivalents of typescript-eslint `strictTypeChecked` + `stylisticTypeChecked`, plus `import`, unicorn and `unicorn/filename-case` (kebab-case). Type-aware rules are off in `.js`, `.cjs` and `.mjs` files, as with typescript-eslint `disableTypeChecked`.

Rules oxlint has no native version of run as [JS plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html), which oxlint marks as alpha. Only rules that need no type information are used:

| Rule id                                                    | Source                                          |
| ---------------------------------------------------------- | ----------------------------------------------- |
| `check-file/folder-naming-convention`                      | `eslint-plugin-check-file`                      |
| `react-js/jsx-sort-props`, `react-js/jsx-no-leaked-render` | `eslint-plugin-react`, in the Framework entries |
| `@stylistic/padding-line-between-statements`               | `@stylistic/eslint-plugin`                      |
| `shadcn/*`                                                 | `@shadcn/lint`, in the `tailwind` entry         |

The `next`, `react-vite` and `tanstack-start` entries build on the lint entry with react, react-hooks and jsx-a11y rules (`react.version` is `19`). `next` adds the Next.js rules and allows App Router folder names, `react-vite` adds `react/only-export-components`, and `tanstack-start` turns off the file and folder name rules under `routes`. Compose them after the base: `defineConfig({ extends: [santux, next] })`. They need `eslint-plugin-react`, an optional peer dependency.

The `astro` entry adds browser and Node globals and turns off the file and folder name rules under `pages`, plus the file name rule for `.astro` components. oxlint only lints the script blocks of `.astro` files (the frontmatter and `<script>` tags), without type-aware rules, and has no Astro rules or template checks. Set `**/.astro/**` in your own `ignorePatterns`.

The `astro-react` entry adds the React rules of the Framework entries to the `.jsx` and `.tsx` files of an Astro project with React islands (`@astrojs/react`), without `only-export-components`. Compose it after the `astro` entry: `defineConfig({ extends: [santux, astro, astroReact] })`. It needs `eslint-plugin-react`.

The `tailwind` entry adds [`@shadcn/lint`](https://github.com/shadcn-ui/lint) (an optional peer dependency) with every rule except `require-static-classes`: `no-unknown-classes`, `no-raw-colors`, `no-arbitrary-values`, `no-inline-styles` and `no-restyle`. It needs no shadcn/ui: it finds the stylesheet that imports Tailwind, and it reads `components.json` when there is one. `no-restyle` only knows your design system components through `components.json` or `settings.shadcn.componentImports`.

The entries set no `ignorePatterns`, because oxlint does not inherit them through `extends`. oxlint already skips what `.gitignore` lists; set `ignorePatterns` in your own `oxlint.config.ts` for anything else.

oxfmt has no `extends`, so the format entries are plain objects that you import and spread. The `format` entry uses the same Prettier options as the `eslint` package, with `endOfLine: 'lf'` (oxfmt doesn't support `auto`), and sorts imports to reproduce the `eslint` import order: `type`, `react`, `builtin`, `external`, `internal`, `alias` (`@/**`), `parent`, `sibling`, `index`, with a blank line between groups, case-insensitive ascending order, and side-effect imports sorted too. Outside Next.js the `react` group is `react`, `react-dom` and `react-dom/**`. In a Next.js project spread `format-next` after `format` to add `next` and `next/**` to that group. The `format-tailwind` entry enables oxfmt Tailwind class sorting, so no plugin is needed. The `format-astro` entry turns on `.astro` formatting, which oxfmt leaves off by default. It needs `@astrojs/compiler-rs`, an optional peer dependency that oxfmt does not bundle.

## Usage

Every tool is an exact-version peer dependency and must be installed in your project:

```sh
pnpm add -D @santux/oxc-config @commitlint/cli @commitlint/config-conventional @stylistic/eslint-plugin eslint-plugin-check-file husky oxfmt oxlint oxlint-tsgolint
```

```ts
// oxlint.config.ts
import santux from '@santux/oxc-config/lint'
import next from '@santux/oxc-config/next'
import { defineConfig } from 'oxlint'

export default defineConfig({
  extends: [santux, next],
  // Override, disable or add rules locally
  rules: { 'no-console': 'off' },
})
```

```ts
// oxfmt.config.ts
import santux from '@santux/oxc-config/format'
import formatNext from '@santux/oxc-config/format-next'
import formatTailwind from '@santux/oxc-config/format-tailwind'
import { defineConfig } from 'oxfmt'

export default defineConfig({ ...santux, ...formatNext, ...formatTailwind, printWidth: 120 })
```

```js
// commitlint.config.js
export { default } from '@santux/oxc-config/commitlint'
```

Requires Node `>=22.18`, which oxlint needs to auto-discover TypeScript config files.

## Differences from `@santux/eslint-config`

The `eslint` package is the reference. The differences left are:

- File names are checked with `unicorn/filename-case` instead of check-file.
- react-hooks `config` and `gating` are dropped. They validate React Compiler options, not your code.
- `import/no-extraneous-dependencies` and `import/no-useless-path-segments` are dropped. oxlint has no native version, and `eslint-plugin-import-x` loads ESLint at runtime.

`import/order` is replaced by oxfmt import sorting. ESLint's `import/order` does not move imports across side-effect imports, while oxfmt with side-effect sorting does, so files with CSS or `server-only` imports can end up ordered differently between the two packages.

`import/no-cycle` was verified on a sample project: it detects cycles through `.ts` files and `@/` imports, so it stays enabled.

## Versioning

This package follows strict semver: **any change that can make previously passing code fail is a major release**. That includes a new error-level rule, a rule moving from warning to error, and a newer required tool or Node version. Projects can stay on an older major for as long as they want.
