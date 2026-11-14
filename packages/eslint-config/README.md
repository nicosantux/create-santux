# @santux/eslint-config

Shared ESLint, Prettier and commitlint config for TypeScript projects.

## Entries

| Entry                                   | Tool       | Export            |
| --------------------------------------- | ---------- | ----------------- |
| `@santux/eslint-config/lint`            | ESLint 9   | Flat config array |
| `@santux/eslint-config/next`            | ESLint 9   | Flat config array |
| `@santux/eslint-config/react-vite`      | ESLint 9   | Flat config array |
| `@santux/eslint-config/tanstack-start`  | ESLint 9   | Flat config array |
| `@santux/eslint-config/astro`           | ESLint 9   | Flat config array |
| `@santux/eslint-config/astro-react`     | ESLint 9   | Flat config array |
| `@santux/eslint-config/tailwind`        | ESLint 9   | Flat config array |
| `@santux/eslint-config/format`          | Prettier   | Config object     |
| `@santux/eslint-config/format-astro`    | Prettier   | Config object     |
| `@santux/eslint-config/format-tailwind` | Prettier   | Config object     |
| `@santux/eslint-config/commitlint`      | commitlint | Config object     |

The lint entry uses typescript-eslint `strictTypeChecked` + `stylisticTypeChecked`, `eslint-plugin-import-x` (with the TypeScript import resolver, so `no-cycle`, `no-self-import` and `no-extraneous-dependencies` work on `.ts`/`.tsx`), unicorn and check-file naming.

The `next` entry builds on the lint entry with react, react-hooks, jsx-a11y and Next.js rules (`react.version` is `19`). Compose it after the base: `defineConfig([santux, next])`. Its plugins (`@next/eslint-plugin-next`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `globals`) are optional peer dependencies, needed only when you use it.

The `react-vite` entry builds on the lint entry the same way, with react, react-hooks, jsx-a11y and react-refresh rules. Its plugins (`eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `eslint-plugin-react-refresh`, `globals`) are optional peer dependencies.

The `tanstack-start` entry builds on the lint entry the same way, with react, react-hooks and jsx-a11y rules and browser plus Node globals. Its plugins (`eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `globals`) are optional peer dependencies.

The `astro` entry builds on the lint entry with the `eslint-plugin-astro` recommended rules and its jsx-a11y rules for `.astro` files, plus browser and Node globals. It parses `.astro` files with TypeScript and runs the type-aware rules there too, allows the `Props` interface Astro reads component props from, ignores `.astro/` and turns off the file and folder name rules under `pages`. Its plugins (`eslint-plugin-astro`, `eslint-plugin-jsx-a11y`, `globals`) are optional peer dependencies. `eslint-plugin-astro` stays on 1.7.0, the last version that supports ESLint 9, until this package moves to ESLint 10.

The `astro-react` entry adds the react, react-hooks and jsx-a11y rules to the `.jsx` and `.tsx` files of an Astro project with React islands (`@astrojs/react`), without react-refresh. Compose it after the `astro` entry: `defineConfig([santux, astro, astroReact])`. It needs `eslint-plugin-react` and `eslint-plugin-react-hooks`, optional peer dependencies.

The `tailwind` entry adds [`@shadcn/lint`](https://github.com/shadcn-ui/lint) (an optional peer dependency) with every rule except `require-static-classes`: `no-unknown-classes`, `no-raw-colors`, `no-arbitrary-values`, `no-inline-styles` and `no-restyle`. It needs no shadcn/ui: it finds the stylesheet that imports Tailwind, and it reads `components.json` when there is one. `no-restyle` only knows your design system components through `components.json` or `settings.shadcn.componentImports`. Compose it after the Framework entry: `defineConfig([santux, next, tailwind])`.

The `format-tailwind` entry is a Prettier config fragment that sorts Tailwind classes with `prettier-plugin-tailwindcss` (an optional peer dependency). Spread it after the format entry: `export default { ...santux, ...formatTailwind }`. For Tailwind v4 projects with a custom stylesheet, also set `tailwindStylesheet` in your Prettier config.

The `format-astro` entry formats `.astro` files with `prettier-plugin-astro` (an optional peer dependency), pinned to 0.14.1 because `prettier-plugin-tailwindcss` does not sort classes in `.astro` files with its 1.x. Spreading two entries keeps only the last `plugins`, so merge them with the Tailwind plugin last:

```js
export default {
  ...santux,
  ...formatAstro,
  ...formatTailwind,
  plugins: [...formatAstro.plugins, ...formatTailwind.plugins],
}
```

## Usage

Every tool is an exact-version peer dependency and must be installed in your project:

```sh
pnpm add -D @santux/eslint-config @commitlint/cli @commitlint/config-conventional @eslint/js @stylistic/eslint-plugin eslint eslint-config-prettier eslint-import-resolver-typescript eslint-plugin-check-file eslint-plugin-import-x eslint-plugin-unicorn husky prettier typescript typescript-eslint
```

```js
// eslint.config.js
import santux from '@santux/eslint-config/lint'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  santux,
  // Override, disable or add rules locally
  { rules: { 'no-console': 'off', 'unicorn/prefer-node-protocol': 'error' } },
  { files: ['**/*.test.ts'], rules: { '@typescript-eslint/no-non-null-assertion': 'off' } },
])
```

```js
// prettier.config.js
import santux from '@santux/eslint-config/format'

export default { ...santux, printWidth: 120 }
```

```js
// commitlint.config.js
export { default } from '@santux/eslint-config/commitlint'
```

Requires Node `>=22.18`.

## Versioning

This package follows strict semver: **any change that can make previously passing code fail is a major release**. That includes a new error-level rule, a rule moving from warning to error, and a newer required tool or Node version. Projects can stay on an older major for as long as they want.
