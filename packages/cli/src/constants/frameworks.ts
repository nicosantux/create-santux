/** Frontend frameworks mapped to the dependencies that must all be present to identify them, in detection priority. */
export const FRONTEND_FRAMEWORKS = {
  next: ['next'],
  'tanstack-start': ['@tanstack/react-start'],
  astro: ['astro'],
  'react-vite': ['vite', 'react'],
} as const satisfies Record<string, readonly string[]>

/** Backend libraries that mark a project as a Node backend when listed in `dependencies`. */
export const BACKEND_LIBRARIES = ['express', 'fastify', 'hono', 'koa', '@nestjs/core']

/** Peer dependencies of the Toolchain package that only a Framework needs. */
export const FRAMEWORK_PEERS = {
  next: [
    '@next/eslint-plugin-next',
    'eslint-plugin-jsx-a11y',
    'eslint-plugin-react',
    'eslint-plugin-react-hooks',
    'globals',
  ],
  'tanstack-start': [
    'eslint-plugin-jsx-a11y',
    'eslint-plugin-react',
    'eslint-plugin-react-hooks',
    'globals',
  ],
  astro: [
    '@astrojs/compiler-rs',
    'eslint-plugin-astro',
    'eslint-plugin-jsx-a11y',
    'globals',
    'prettier-plugin-astro',
  ],
  'react-vite': [
    'eslint-plugin-jsx-a11y',
    'eslint-plugin-react',
    'eslint-plugin-react-hooks',
    'eslint-plugin-react-refresh',
    'globals',
  ],
} as const satisfies Record<keyof typeof FRONTEND_FRAMEWORKS, readonly string[]>

/** Patterns the oxlint config ignores, as oxlint does not inherit `ignorePatterns` through `extends`. */
export const OXLINT_IGNORE_PATTERNS = {
  base: ['**/build', '**/dist'],
  next: ['**/.next/**', '**/out/**', '**/next-env.d.ts'],
  'tanstack-start': ['**/.output/**', '**/.tanstack/**', '**/routeTree.gen.ts'],
  astro: ['**/.astro/**'],
  'react-vite': [],
} as const satisfies Record<string, readonly string[]>

/** Generated files of a Framework that `.prettierignore` lists, so neither Prettier nor oxfmt formats them. */
export const FORMAT_IGNORE_PATTERNS: Partial<Record<keyof typeof FRONTEND_FRAMEWORKS, string[]>> = {
  'tanstack-start': ['routeTree.gen.ts'],
}

/** Add-ons mapped to the dependencies that must all be present to identify them. */
export const ADDONS = {
  tailwind: ['tailwindcss'],
  react: ['@astrojs/react'],
} as const satisfies Record<string, readonly string[]>

/** Add-ons offered only with one Framework, as the other Frameworks already include their rules. */
export const ADDON_FRAMEWORK: Partial<
  Record<keyof typeof ADDONS, keyof typeof FRONTEND_FRAMEWORKS>
> = { react: 'astro' }

/** Peer dependencies of the Toolchain package that only an Add-on needs. */
export const ADDON_PEERS = {
  tailwind: ['@shadcn/lint', 'prettier-plugin-tailwindcss'],
  react: ['eslint-plugin-react', 'eslint-plugin-react-hooks'],
} as const satisfies Record<keyof typeof ADDONS, readonly string[]>

/** Lint entry of each Add-on. */
export const ADDON_LINT_ENTRY = {
  tailwind: 'tailwind',
  react: 'astro-react',
} as const satisfies Record<keyof typeof ADDONS, string>
