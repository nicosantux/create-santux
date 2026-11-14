import type {
  Addon,
  Environment,
  Framework,
  PackageManager,
  Snapshot,
  Toolchain,
  ToolchainMetadata,
} from '../core/types.js'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { ADDON_PEERS, FRAMEWORK_PEERS } from '../constants/frameworks.js'
import { TYPESCRIPT_COMPAT_PACKAGE } from '../constants/typescript.js'
import { detect } from '../core/detect.js'
import { plan } from '../core/plan.js'

const metadata: ToolchainMetadata = {
  name: '@santux/eslint-config',
  version: '1.0.0',
  engines: { node: '>=22.18' },
  peerDependencies: {
    '@commitlint/cli': '20.1.0',
    eslint: '9.39.1',
    husky: '9.1.7',
    'typescript-eslint': '8.46.3',
    '@typescript/typescript6': '6.0.2',
    'eslint-plugin-astro': '1.7.0',
    'eslint-plugin-jsx-a11y': '6.10.2',
    'eslint-plugin-react': '7.37.5',
    'eslint-plugin-react-hooks': '7.1.1',
    globals: '17.13.0',
    'prettier-plugin-astro': '0.14.1',
    'prettier-plugin-tailwindcss': '0.7.2',
    '@shadcn/lint': '0.2.5',
  },
  peerDependenciesMeta: {
    '@shadcn/lint': { optional: true },
    '@typescript/typescript6': { optional: true },
    'eslint-plugin-astro': { optional: true },
    'eslint-plugin-jsx-a11y': { optional: true },
    'eslint-plugin-react': { optional: true },
    'eslint-plugin-react-hooks': { optional: true },
    globals: { optional: true },
    'prettier-plugin-astro': { optional: true },
    'prettier-plugin-tailwindcss': { optional: true },
  },
}

const oxcMetadata: ToolchainMetadata = {
  name: '@santux/oxc-config',
  version: '1.0.0',
  engines: { node: '>=22.18' },
  peerDependencies: {
    '@astrojs/compiler-rs': '0.5.2',
    '@commitlint/cli': '20.1.0',
    '@commitlint/config-conventional': '20.0.0',
    '@shadcn/lint': '0.2.5',
    'eslint-plugin-check-file': '3.3.1',
    'eslint-plugin-react': '7.37.5',
    husky: '9.1.7',
    oxfmt: '0.75.0',
    oxlint: '1.90.0',
    'oxlint-tsgolint': '7.0.2005',
  },
  peerDependenciesMeta: {
    '@astrojs/compiler-rs': { optional: true },
    '@shadcn/lint': { optional: true },
    'eslint-plugin-react': { optional: true },
  },
}

const environment: Environment = {
  nodeLts: '24.22.1',
  nodeVersion: 'v22.18.0',
  packageManagerVersion: '11.0.0',
}

const snapshot: Snapshot = {
  conflictFiles: [],
  dependencies: [],
  dependencyVersions: {},
  existingFiles: [],
  hasGit: true,
  hasPackageJson: true,
  hasPrettierKey: false,
  hasSrcDirectory: false,
  huskyFiles: [],
  isModule: true,
  lockfiles: [],
  packageManagerConfigs: { 'pnpm-workspace.yaml': 'minimumReleaseAge: 1440\n' },
  productionDependencies: [],
  rootJsFiles: [],
  scripts: {},
  toolchainConfigs: {},
  tsconfigs: {},
  typescriptVersion: null,
  userAgent: 'pnpm/10.0.0 npm/? node/v24',
  viteConfig: null,
}

const run = (
  overrides: Partial<Snapshot> = {},
  env: Environment = environment,
  framework: Framework | null = null,
  addons: Addon[] = [],
  toolchain: Toolchain = 'eslint',
) =>
  plan(
    { ...snapshot, ...overrides },
    { addons, alias: false, framework, packageManager: 'pnpm', toolchain },
    toolchain === 'eslint' ? metadata : oxcMetadata,
    env,
  )

const fileContent = ({ operations }: ReturnType<typeof run>, path: string) => {
  const file = operations.find(
    (operation) => operation.type === 'create-file' && operation.path === path,
  )

  return file?.type === 'create-file' ? file.content : ''
}

describe('detect', () => {
  it.each([
    ['pnpm/10.0.0 npm/? node/v24.0.0 darwin arm64', 'pnpm'],
    ['yarn/1.22.0 npm/? node/v24.0.0 darwin arm64', 'yarn'],
    ['bun/1.2.0 npm/? node/v24.0.0 darwin arm64', 'bun'],
    ['npm/11.0.0 node/v24.0.0 darwin arm64', 'npm'],
  ])('reads the package manager from the user agent %s', (userAgent, expected) => {
    expect(detect({ ...snapshot, userAgent }).packageManager).toBe(expected)
  })

  it.each([
    ['pnpm-lock.yaml', 'pnpm'],
    ['bun.lock', 'bun'],
    ['yarn.lock', 'yarn'],
    ['package-lock.json', 'npm'],
  ])('reads the package manager from the lockfile %s', (lockfile, expected) => {
    expect(
      detect({ ...snapshot, lockfiles: [lockfile], userAgent: undefined }).packageManager,
    ).toBe(expected)
  })

  it('follows the lockfile priority when there are several', () => {
    expect(
      detect({ ...snapshot, lockfiles: ['package-lock.json', 'pnpm-lock.yaml'] }).packageManager,
    ).toBe('pnpm')
  })

  it('prefers the lockfile over the user agent', () => {
    expect(detect({ ...snapshot, lockfiles: ['yarn.lock'] }).packageManager).toBe('yarn')
  })

  it('returns null when there is no lockfile and no user agent', () => {
    expect(detect({ ...snapshot, userAgent: undefined }).packageManager).toBeNull()
  })
})

describe('detect framework', () => {
  const frameworks = (dependencies: string[], productionDependencies = dependencies) =>
    detect({ ...snapshot, dependencies, productionDependencies }).frameworks

  it('detects Next.js from the dependencies', () => {
    expect(frameworks(['next', 'react'])).toEqual(['next'])
  })

  it('detects Next.js in devDependencies', () => {
    expect(frameworks(['next'], [])).toEqual(['next'])
  })

  it('ranks the frontend framework before a backend library', () => {
    expect(frameworks(['next', 'express'])).toEqual(['next', 'node'])
  })

  it('detects a backend library only in dependencies', () => {
    expect(frameworks(['express'])).toEqual(['node'])
    expect(frameworks(['express'], [])).toEqual([])
  })

  it('returns no candidates when nothing is recognized', () => {
    expect(frameworks(['react'])).toEqual([])
  })

  it('ranks TanStack Start before React + Vite', () => {
    expect(frameworks(['@tanstack/react-start', 'vite', 'react'])).toEqual([
      'tanstack-start',
      'react-vite',
    ])
  })

  it('detects React + Vite only when both vite and react are present', () => {
    expect(frameworks(['vite', 'react'], [])).toEqual(['react-vite'])
    expect(frameworks(['vite'])).toEqual([])
  })
})

describe('plan', () => {
  it('installs the package and its required peers in one operation at exact versions', () => {
    const additions = run().operations.filter(({ type }) => type === 'add-dev-dependencies')

    expect(additions).toEqual([
      {
        type: 'add-dev-dependencies',
        dependencies: {
          '@santux/eslint-config': '1.0.0',
          '@commitlint/cli': '20.1.0',
          eslint: '9.39.1',
          husky: '9.1.7',
          'typescript-eslint': '8.46.3',
        },
      },
    ])
  })

  describe('Next.js', () => {
    const files = (framework: Framework | null) =>
      Object.fromEntries(
        run({}, environment, framework).operations.flatMap((operation) =>
          operation.type === 'create-file' ? [[operation.path, operation.content]] : [],
        ),
      )

    it('composes the base and the Next.js lint entries', () => {
      expect(files('next')['eslint.config.js']).toContain(
        "import next from '@santux/eslint-config/next'",
      )
      expect(files('next')['eslint.config.js']).toContain('defineConfig([santux, next])')
    })

    it('uses only the base lint entry without a Framework', () => {
      expect(files(null)['eslint.config.js']).not.toContain('next')
      expect(files(null)['eslint.config.js']).toContain('defineConfig([santux])')
    })

    it('plans a create-next-app 16.4 project: detects Next.js and replaces its ESLint setup', () => {
      const createNextApp: Partial<Snapshot> = {
        conflictFiles: ['eslint.config.mjs'],
        dependencies: [
          'next',
          'react',
          'react-dom',
          '@tailwindcss/postcss',
          '@types/node',
          '@types/react',
          '@types/react-dom',
          'eslint',
          'eslint-config-next',
          'tailwindcss',
          'typescript',
        ],
        lockfiles: ['pnpm-lock.yaml'],
        productionDependencies: ['next', 'react', 'react-dom'],
      }

      const framework = detect({ ...snapshot, ...createNextApp }).frameworks[0]

      expect(framework).toBe('next')
      expect(run(createNextApp, environment, 'next').operations.slice(0, 2)).toEqual([
        { type: 'delete-file', path: 'eslint.config.mjs' },
        { type: 'remove-dependencies', dependencies: ['eslint-config-next'] },
      ])
    })

    it('adds the Framework optional peers only when the Framework is selected', () => {
      const dependencies = (framework: Framework | null) =>
        run({}, environment, framework).operations.find(
          ({ type }) => type === 'add-dev-dependencies',
        )

      expect(dependencies('next')).toMatchObject({
        dependencies: { 'eslint-plugin-react': '7.37.5', globals: '17.13.0' },
      })
      expect(JSON.stringify(dependencies(null))).not.toContain('eslint-plugin-react')
    })
  })

  describe('React + Vite', () => {
    it('composes the base and the React + Vite lint entries', () => {
      const content = fileContent(run({}, environment, 'react-vite'), 'eslint.config.js')

      expect(content).toContain("import reactVite from '@santux/eslint-config/react-vite'")
      expect(content).toContain('defineConfig([santux, reactVite])')
    })

    it('plans a create-vite 9.3 react-ts project: detects React + Vite and replaces its Oxlint setup', () => {
      const createVite: Partial<Snapshot> = {
        conflictFiles: ['.oxlintrc.json'],
        dependencies: [
          'react',
          'react-dom',
          '@types/react',
          '@types/react-dom',
          '@vitejs/plugin-react',
          'oxlint',
          'typescript',
          'vite',
        ],
        existingFiles: ['tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json'],
        lockfiles: ['pnpm-lock.yaml'],
        productionDependencies: ['react', 'react-dom'],
      }

      expect(detect({ ...snapshot, ...createVite }).frameworks).toEqual(['react-vite'])
      expect(run(createVite, environment, 'react-vite').operations.slice(0, 2)).toEqual([
        { type: 'delete-file', path: '.oxlintrc.json' },
        { type: 'remove-dependencies', dependencies: ['oxlint'] },
      ])
    })
  })

  describe('TanStack Start', () => {
    it('composes the base and the TanStack Start lint entries', () => {
      const content = fileContent(run({}, environment, 'tanstack-start'), 'eslint.config.js')

      expect(content).toContain("import tanstackStart from '@santux/eslint-config/tanstack-start'")
      expect(content).toContain('defineConfig([santux, tanstackStart])')
    })

    it('plans a @tanstack/cli 0.72 project: detects TanStack Start and replaces its ESLint setup', () => {
      const tanstackCli: Partial<Snapshot> = {
        conflictFiles: ['eslint.config.js', 'prettier.config.js'],
        dependencies: [
          '@tailwindcss/vite',
          '@tanstack/react-router',
          '@tanstack/react-router-devtools',
          '@tanstack/react-start',
          '@tanstack/eslint-config',
          '@tanstack/router-plugin',
          '@types/react',
          '@types/react-dom',
          '@vitejs/plugin-react',
          'eslint',
          'prettier',
          'react',
          'react-dom',
          'tailwindcss',
          'typescript',
          'vite',
        ],
        existingFiles: ['tsconfig.json'],
        lockfiles: ['pnpm-lock.yaml'],
        productionDependencies: [
          '@tanstack/react-router',
          '@tanstack/react-start',
          'react',
          'react-dom',
        ],
      }

      expect(detect({ ...snapshot, ...tanstackCli }).frameworks[0]).toBe('tanstack-start')
      expect(run(tanstackCli, environment, 'tanstack-start').operations.slice(0, 2)).toMatchObject([
        { type: 'delete-file' },
        { type: 'delete-file' },
      ])
    })
  })

  describe('Astro', () => {
    const astroTsconfig =
      '{\n  "extends": "astro/tsconfigs/strict",\n  "include": [".astro/types.d.ts", "**/*"],\n  "exclude": ["dist"]\n}\n'

    /** A create-astro 5.3 minimal project, plus `astro add react` and `astro add tailwind` when asked. */
    const createAstro = ({ react = false, tailwind = false } = {}): Partial<Snapshot> => {
      const dependencies = [
        'astro',
        ...(react
          ? ['@astrojs/react', '@types/react', '@types/react-dom', 'react', 'react-dom']
          : []),
        ...(tailwind ? ['@tailwindcss/vite', 'tailwindcss'] : []),
      ]

      return {
        dependencies,
        existingFiles: ['astro.config.mjs', 'tsconfig.json'],
        hasSrcDirectory: true,
        lockfiles: ['pnpm-lock.yaml'],
        productionDependencies: dependencies,
        tsconfigs: { 'tsconfig.json': astroTsconfig },
      }
    }

    const planAstro = (
      overrides: Partial<Snapshot>,
      toolchain: Toolchain,
      { alias = false, packageManager = 'pnpm' as const } = {},
    ) => {
      const { addons, frameworks } = detect({ ...snapshot, ...overrides })

      return plan(
        { ...snapshot, ...overrides },
        { addons, alias, framework: frameworks[0] as Framework, packageManager, toolchain },
        toolchain === 'eslint' ? metadata : oxcMetadata,
        environment,
      )
    }

    const installed = (result: ReturnType<typeof run>) =>
      result.operations.find((operation) => operation.type === 'add-dev-dependencies')
        ?.dependencies ?? {}

    const installs = (result: ReturnType<typeof run>) => Object.keys(installed(result))

    it('detects Astro from a create-astro 5.3 project, with React islands as an Add-on', () => {
      expect(detect({ ...snapshot, ...createAstro() })).toMatchObject({
        addons: [],
        frameworks: ['astro'],
      })
      expect(
        detect({ ...snapshot, ...createAstro({ react: true, tailwind: true }) }),
      ).toMatchObject({ addons: ['tailwind', 'react'], frameworks: ['astro'] })
    })

    it('ranks Astro before React + Vite', () => {
      expect(detect({ ...snapshot, dependencies: ['astro', 'vite', 'react'] }).frameworks).toEqual([
        'astro',
        'react-vite',
      ])
    })

    it('offers the react Add-on only with Astro', () => {
      expect(
        detect({ ...snapshot, dependencies: ['@astrojs/react', 'vite', 'react'] }).addons,
      ).toEqual([])
    })

    it.each([
      [{}, 'defineConfig([santux, astro])'],
      [{ react: true }, 'defineConfig([santux, astro, astroReact])'],
      [{ tailwind: true }, 'defineConfig([santux, astro, tailwind])'],
    ])('composes the eslint lint entries for %o', (options, expected) => {
      const content = fileContent(planAstro(createAstro(options), 'eslint'), 'eslint.config.js')

      expect(content).toContain("import astro from '@santux/eslint-config/astro'")
      expect(content).toContain(expected)
    })

    it.each([
      [{}, 'extends: [santux, astro]'],
      [{ react: true }, 'extends: [santux, astro, astroReact]'],
      [{ tailwind: true }, 'extends: [santux, astro, tailwind]'],
    ])('composes the oxc lint entries for %o and ignores .astro', (options, expected) => {
      const content = fileContent(planAstro(createAstro(options), 'oxc'), 'oxlint.config.ts')

      expect(content).toContain("import astro from '@santux/oxc-config/astro'")
      expect(content).toContain(expected)
      expect(content).toContain("ignorePatterns: ['**/build', '**/dist', '**/.astro/**']")
    })

    it.each(['eslint', 'oxc'] as const)(
      'sorts the %s lint config imports by path, so astro comes before lint',
      (toolchain) => {
        const [lintPath, packageName] =
          toolchain === 'eslint'
            ? ['eslint.config.js', '@santux/eslint-config']
            : ['oxlint.config.ts', '@santux/oxc-config']

        expect(fileContent(planAstro(createAstro({ react: true }), toolchain), lintPath)).toMatch(
          new RegExp(
            `^import astro from '${packageName}/astro'\nimport astroReact from '${packageName}/astro-react'\nimport santux from '${packageName}/lint'\n`,
          ),
        )
      },
    )

    it('adds the Astro Prettier plugin, keeping the Tailwind plugin last', () => {
      expect(fileContent(planAstro(createAstro(), 'eslint'), 'prettier.config.js')).toBe(
        "import santux from '@santux/eslint-config/format'\nimport formatAstro from '@santux/eslint-config/format-astro'\n\nexport default { ...santux, ...formatAstro }\n",
      )
      expect(
        fileContent(planAstro(createAstro({ tailwind: true }), 'eslint'), 'prettier.config.js'),
      ).toBe(
        [
          "import santux from '@santux/eslint-config/format'",
          "import formatAstro from '@santux/eslint-config/format-astro'",
          "import formatTailwind from '@santux/eslint-config/format-tailwind'",
          '',
          'export default {',
          '  ...santux,',
          '  ...formatAstro,',
          '  ...formatTailwind,',
          '  plugins: [...formatAstro.plugins, ...formatTailwind.plugins],',
          '}',
          '',
        ].join('\n'),
      )
    })

    it('composes the Astro oxfmt entry', () => {
      expect(
        fileContent(planAstro(createAstro({ tailwind: true }), 'oxc'), 'oxfmt.config.ts'),
      ).toContain('defineConfig({ ...santux, ...formatAstro, ...formatTailwind })')
    })

    it.each([
      [
        'eslint',
        {},
        ['eslint-plugin-astro', 'eslint-plugin-jsx-a11y', 'globals', 'prettier-plugin-astro'],
        ['eslint-plugin-react'],
      ],
      ['eslint', { react: true }, ['eslint-plugin-react', 'eslint-plugin-react-hooks'], []],
      ['oxc', {}, ['@astrojs/compiler-rs'], ['eslint-plugin-react']],
      ['oxc', { react: true }, ['@astrojs/compiler-rs', 'eslint-plugin-react'], []],
    ] as const)('installs the %s Astro peers for %o', (toolchain, options, included, excluded) => {
      const names = installs(planAstro(createAstro(options), toolchain))

      expect(names).toEqual(expect.arrayContaining([...included]))
      for (const name of excluded) expect(names).not.toContain(name)
    })

    it('adds the alias to the root tsconfig, creating compilerOptions, without a Vite edit', () => {
      const { manualSteps, operations } = planAstro(createAstro(), 'eslint', { alias: true })

      const tsconfig = operations.find(
        (operation) => operation.type === 'update-file' && operation.path === 'tsconfig.json',
      )

      expect(tsconfig?.type === 'update-file' && tsconfig.content).toBe(
        '{\n  "extends": "astro/tsconfigs/strict",\n  "include": [".astro/types.d.ts", "**/*"],\n  "exclude": ["dist"],\n  "compilerOptions": {\n    "paths": {\n      "@/*": ["./src/*"]\n    }\n  }\n}\n',
      )
      expect(operations.filter((operation) => operation.type === 'update-file')).toHaveLength(1)
      expect(manualSteps).toEqual([])
    })

    it.each(['eslint', 'oxc'] as const)(
      'installs only the react Add-on peers and prints the astro-react line on a %s re-run after astro add react',
      (toolchain) => {
        const [lintPath, formatPath] =
          toolchain === 'eslint'
            ? ['eslint.config.js', 'prettier.config.js']
            : ['oxlint.config.ts', 'oxfmt.config.ts']

        const first = planAstro(createAstro(), toolchain)

        const configs = {
          [lintPath]: fileContent(first, lintPath),
          [formatPath]: fileContent(first, formatPath),
        }

        const astroReact = createAstro({ react: true })

        const result = planAstro(
          {
            ...astroReact,
            dependencies: [...(astroReact.dependencies ?? []), ...installs(first)],
            dependencyVersions: installed(first),
            existingFiles: [
              ...(astroReact.existingFiles ?? []),
              ...first.operations.flatMap((operation) =>
                operation.type === 'create-file' ? [operation.path] : [],
              ),
            ],
            toolchainConfigs: configs,
          },
          toolchain,
        )

        const packageName = toolchain === 'eslint' ? '@santux/eslint-config' : '@santux/oxc-config'
        const target = toolchain === 'eslint' ? 'the `defineConfig([...])` array' : '`extends`'

        expect(result.operations).toEqual([
          {
            type: 'add-dev-dependencies',
            dependencies:
              toolchain === 'eslint'
                ? { 'eslint-plugin-react': '7.37.5', 'eslint-plugin-react-hooks': '7.1.1' }
                : { 'eslint-plugin-react': '7.37.5' },
          },
        ])
        expect(result.manualSteps).toEqual([
          `Add \`import astroReact from '${packageName}/astro-react'\` to ${lintPath} and \`astroReact\` to ${target}`,
        ])
      },
    )

    it('prints the Tailwind lines and the merged plugins, keeping local overrides, when a re-run adds Tailwind to Astro', () => {
      const first = planAstro(createAstro(), 'eslint')
      const tailwind = createAstro({ tailwind: true })

      const result = planAstro(
        {
          ...tailwind,
          dependencies: [...(tailwind.dependencies ?? []), ...installs(first)],
          dependencyVersions: installed(first),
          existingFiles: [
            ...(tailwind.existingFiles ?? []),
            'eslint.config.js',
            'prettier.config.js',
          ],
          toolchainConfigs: {
            'eslint.config.js': fileContent(first, 'eslint.config.js'),
            'prettier.config.js': fileContent(first, 'prettier.config.js'),
          },
        },
        'eslint',
      )

      expect(result.manualSteps).toContain(
        "Add `import formatTailwind from '@santux/eslint-config/format-tailwind'` to prettier.config.js and spread `...formatTailwind` into its exported config, then set its `plugins` to `[...formatAstro.plugins, ...formatTailwind.plugins]`",
      )
    })
  })

  describe('Tailwind', () => {
    const prettierConfig = (addons: Addon[]) =>
      fileContent(run({}, environment, null, addons), 'prettier.config.js')

    it('detects Tailwind from the dependencies', () => {
      expect(detect({ ...snapshot, dependencies: ['tailwindcss'] }).addons).toEqual(['tailwind'])
    })

    it('detects no Add-ons when Tailwind is absent', () => {
      expect(detect({ ...snapshot, dependencies: ['react'] }).addons).toEqual([])
    })

    it('composes the Tailwind format entry into the Prettier config when selected', () => {
      const content = prettierConfig(['tailwind'])

      expect(content).toContain(
        "import formatTailwind from '@santux/eslint-config/format-tailwind'",
      )
      expect(content).toContain('export default { ...santux, ...formatTailwind }')
    })

    it('composes the Tailwind lint entry after the Framework entry', () => {
      const content = fileContent(run({}, environment, 'next', ['tailwind']), 'eslint.config.js')

      expect(content).toContain("import tailwind from '@santux/eslint-config/tailwind'")
      expect(content).toContain('defineConfig([santux, next, tailwind])')
    })

    it('keeps the plain format re-export without Add-ons', () => {
      expect(prettierConfig([])).toBe("export { default } from '@santux/eslint-config/format'\n")
    })

    it('adds the Prettier Tailwind plugin only when the Add-on is selected', () => {
      const dependencies = (addons: Addon[]) =>
        run({}, environment, null, addons).operations.find(
          ({ type }) => type === 'add-dev-dependencies',
        )

      expect(dependencies(['tailwind'])).toMatchObject({
        dependencies: { '@shadcn/lint': '0.2.5', 'prettier-plugin-tailwindcss': '0.7.2' },
      })
      expect(JSON.stringify(dependencies([]))).not.toContain('prettier-plugin-tailwindcss')
      expect(JSON.stringify(dependencies([]))).not.toContain('@shadcn/lint')
    })
  })

  it('keeps the Framework and Add-on peers in sync with the Toolchain packages optional peers', () => {
    const optionalPeers = ['eslint-config', 'oxc-config'].flatMap((name) => {
      const toolchainPackage = JSON.parse(
        readFileSync(join(import.meta.dirname, `../../../${name}/package.json`), 'utf8'),
      ) as { peerDependenciesMeta: Record<string, { optional?: boolean }> }

      return Object.entries(toolchainPackage.peerDependenciesMeta)
        .filter(([peer, meta]) => meta.optional === true && peer !== TYPESCRIPT_COMPAT_PACKAGE)
        .map(([peer]) => peer)
    })

    expect(
      new Set([...Object.values(FRAMEWORK_PEERS).flat(), ...Object.values(ADDON_PEERS).flat()]),
    ).toEqual(new Set(optionalPeers))
  })

  it('creates the lint and format configs extending the package entries', () => {
    const files = Object.fromEntries(
      run().operations.flatMap((operation) =>
        operation.type === 'create-file' ? [[operation.path, operation.content]] : [],
      ),
    )

    expect(Object.keys(files).sort()).toEqual([
      '.editorconfig',
      '.husky/commit-msg',
      '.node-version',
      '.prettierignore',
      'commitlint.config.js',
      'eslint.config.js',
      'prettier.config.js',
    ])
    expect(files['eslint.config.js']).toContain("from '@santux/eslint-config/lint'")
    expect(files['prettier.config.js']).toContain("from '@santux/eslint-config/format'")
    expect(files['commitlint.config.js']).toContain("from '@santux/eslint-config/commitlint'")
    expect(files['.husky/commit-msg']).toContain('commitlint --edit $1')
  })

  it('sets the lint, format and prepare scripts', () => {
    const scripts = run().operations.find(({ type }) => type === 'set-scripts')

    expect(scripts).toMatchObject({
      scripts: {
        lint: 'eslint .',
        'lint:fix': 'eslint . --fix',
        format: 'prettier . --check',
        'format:fix': 'prettier . --write',
        prepare: 'husky',
      },
    })
  })

  it('warns about the existing scripts it replaces with a different command', () => {
    const { warnings } = run({ scripts: { lint: 'eslint .', prepare: 'npm run build' } })

    expect(warnings).toContain('package.json scripts replaced: prepare (was `npm run build`)')
  })

  it('writes the latest Node LTS to .node-version', () => {
    expect(run().operations).toContainEqual({
      type: 'create-file',
      path: '.node-version',
      content: '24.22.1\n',
    })
  })

  it('falls back to the running Node major when the LTS is unknown', () => {
    expect(run({}, { ...environment, nodeLts: null }).operations).toContainEqual({
      type: 'create-file',
      path: '.node-version',
      content: '22\n',
    })
  })

  it('leaves existing files untouched and warns about them', () => {
    const result = run({ existingFiles: ['.editorconfig'] })

    expect(result.operations).not.toContainEqual(
      expect.objectContaining({ type: 'create-file', path: '.editorconfig' }),
    )
    expect(result.warnings).toEqual(['.editorconfig already exists and was left untouched'])
  })

  it('adds a manual step when the project is not a git repository', () => {
    expect(run({ hasGit: false }).manualSteps).toEqual([
      'Run `git init` and then `pnpm run prepare` to enable git hooks',
    ])
    expect(run().manualSteps).toEqual([])
  })

  it('has no blocking errors on a supported environment', () => {
    expect(run().errors).toEqual([])
  })

  it('blocks when the running Node is below engines.node', () => {
    expect(run({}, { ...environment, nodeVersion: 'v22.17.9' }).errors).toEqual([
      '@santux/eslint-config requires Node >=22.18, but you are running v22.17.9',
    ])
    expect(run({}, { ...environment, nodeVersion: 'v20.19.0' }).errors).toHaveLength(1)
  })

  it('accepts a Node at or above engines.node', () => {
    expect(run({}, { ...environment, nodeVersion: 'v22.18.0' }).errors).toEqual([])
    expect(run({}, { ...environment, nodeVersion: 'v24.1.0' }).errors).toEqual([])
  })

  it('blocks when there is no package.json', () => {
    const result = run({ hasPackageJson: false })

    expect(result.errors).toEqual(['No package.json found in the current directory'])
    expect(result.operations).toEqual([])
  })

  describe('conflicting setups', () => {
    it('removes the oxlint config of a create-vite project and its dependencies', () => {
      const { errors, operations } = run({
        conflictFiles: ['.oxlintrc.json'],
        dependencies: ['react', 'oxlint', 'vite'],
      })

      expect(errors).toEqual([])
      expect(operations.slice(0, 2)).toEqual([
        { type: 'delete-file', path: '.oxlintrc.json' },
        { type: 'remove-dependencies', dependencies: ['oxlint'] },
      ])
    })

    it('sets "type": "module" when package.json lacks it and warns about root .js files', () => {
      const { operations, warnings } = run({ isModule: false, rootJsFiles: ['next.config.js'] })

      expect(operations).toContainEqual({ type: 'set-module-type' })
      expect(warnings).toContain(
        'Setting "type": "module" makes Node load next.config.js as ES modules. Rename any that use require or module.exports to .cjs',
      )
    })

    it('sets "type": "module" without a warning when there are no root .js files', () => {
      const { operations, warnings } = run({ isModule: false })

      expect(operations).toContainEqual({ type: 'set-module-type' })
      expect(warnings.some((warning) => warning.includes('"type": "module"'))).toBe(false)
    })

    it('leaves "type" alone when package.json already sets it to module', () => {
      expect(run().operations.some(({ type }) => type === 'set-module-type')).toBe(false)
    })

    it('removes an existing Prettier and ESLint setup, including the prettier key', () => {
      const { operations } = run({
        conflictFiles: ['.eslintrc.json', '.prettierrc', '.eslintignore'],
        dependencies: ['eslint-plugin-react', '@typescript-eslint/parser', 'eslint'],
        hasPrettierKey: true,
      })

      expect(operations.filter(({ type }) => type !== 'create-file')).toEqual([
        { type: 'delete-file', path: '.eslintrc.json' },
        { type: 'delete-file', path: '.prettierrc' },
        { type: 'delete-file', path: '.eslintignore' },
        { type: 'remove-package-json-key', key: 'prettier' },
        {
          type: 'remove-dependencies',
          dependencies: ['eslint-plugin-react', '@typescript-eslint/parser'],
        },
        expect.objectContaining({ type: 'set-scripts' }),
        expect.objectContaining({ type: 'add-dev-dependencies' }),
      ])
    })

    it('removes Biome', () => {
      const { operations } = run({
        conflictFiles: ['biome.json'],
        dependencies: ['@biomejs/biome'],
      })

      expect(operations.slice(0, 2)).toEqual([
        { type: 'delete-file', path: 'biome.json' },
        { type: 'remove-dependencies', dependencies: ['@biomejs/biome'] },
      ])
    })

    it('replaces an eslint.config.js that is not ours and removes its dependencies', () => {
      const { operations } = run({
        conflictFiles: ['eslint.config.js'],
        dependencies: ['eslint-plugin-react'],
      })

      expect(operations.slice(0, 3)).toEqual([
        { type: 'delete-file', path: 'eslint.config.js' },
        { type: 'remove-dependencies', dependencies: ['eslint-plugin-react'] },
        expect.objectContaining({ type: 'create-file', path: 'eslint.config.js' }),
      ])
    })

    it('keeps the dependencies when an existing santux config file is left untouched', () => {
      const { operations } = run({
        dependencies: ['eslint-plugin-react'],
        existingFiles: ['eslint.config.js'],
      })

      expect(operations.some(({ type }) => type === 'remove-dependencies')).toBe(false)
    })

    it('adds no removals on a clean project', () => {
      expect(
        run({ dependencies: ['react', 'vite'] }).operations.some(
          ({ type }) => type.startsWith('remove') || type === 'delete-file',
        ),
      ).toBe(false)
    })

    it('blocks on husky hooks other than ours and plans nothing', () => {
      const result = run({
        conflictFiles: ['.eslintrc.json'],
        huskyFiles: ['.husky/commit-msg', '.husky/pre-commit'],
      })

      expect(result.errors).toEqual([
        'Found unrecognized files in .husky/: .husky/pre-commit. Remove or migrate them and run santux again',
      ])
      expect(result.operations).toEqual([])
    })

    it('accepts a husky folder with only our hook', () => {
      expect(run({ huskyFiles: ['.husky/commit-msg'] }).errors).toEqual([])
    })
  })
})

describe('path alias', () => {
  const alias = (
    overrides: Partial<Snapshot>,
    framework: Framework | null = null,
    enabled = true,
  ) =>
    plan(
      { ...snapshot, hasSrcDirectory: true, ...overrides },
      { addons: [], alias: enabled, framework, packageManager: 'pnpm', toolchain: 'eslint' },
      metadata,
      environment,
    )

  const updated = ({ operations }: ReturnType<typeof alias>) =>
    Object.fromEntries(
      operations.flatMap((operation) =>
        operation.type === 'update-file' ? [[operation.path, operation.content]] : [],
      ),
    )

  const rootTsconfig = '{\n  "compilerOptions": {\n    "strict": true\n  }\n}\n'

  const viteAppTsconfig = `{
  "compilerOptions": {
    // Bundler mode
    "moduleResolution": "bundler",
    /* Linting */
    "strict": true
  },
  "include": ["src"]
}
`

  const viteConfig = `import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
`

  it('adds @/* without baseUrl to the root tsconfig for Next.js', () => {
    const result = updated(alias({ tsconfigs: { 'tsconfig.json': rootTsconfig } }, 'next'))

    expect(Object.keys(result)).toEqual(['tsconfig.json'])
    expect(JSON.parse(result['tsconfig.json'] ?? '')).toEqual({
      compilerOptions: { strict: true, paths: { '@/*': ['./src/*'] } },
    })
    expect(result['tsconfig.json']).not.toContain('baseUrl')
  })

  it('adds @/* to the root tsconfig without a Framework', () => {
    const result = updated(alias({ tsconfigs: { 'tsconfig.json': rootTsconfig } }))

    expect(
      (JSON.parse(result['tsconfig.json'] ?? '') as { compilerOptions: object }).compilerOptions,
    ).toMatchObject({ paths: { '@/*': ['./src/*'] } })
  })

  it('creates compilerOptions when the tsconfig has none', () => {
    const result = updated(alias({ tsconfigs: { 'tsconfig.json': '{}' } }, 'next'))

    expect(JSON.parse(result['tsconfig.json'] ?? '')).toEqual({
      compilerOptions: { paths: { '@/*': ['./src/*'] } },
    })
  })

  it('adds @/* to tsconfig.app.json for React + Vite and leaves the solution tsconfig alone', () => {
    const result = updated(
      alias(
        {
          tsconfigs: {
            'tsconfig.json': '{ "files": [], "references": [{ "path": "./tsconfig.app.json" }] }',
            'tsconfig.app.json': viteAppTsconfig,
          },
          viteConfig: { content: viteConfig, path: 'vite.config.ts' },
        },
        'react-vite',
      ),
    )

    expect(Object.keys(result)).toEqual(['tsconfig.app.json', 'vite.config.ts'])
    expect(result['tsconfig.app.json']).toContain('"@/*"')
  })

  it('preserves the comments and formatting of a commented tsconfig', () => {
    const result = updated(
      alias(
        {
          tsconfigs: { 'tsconfig.app.json': viteAppTsconfig },
          viteConfig: { content: viteConfig, path: 'vite.config.ts' },
        },
        'react-vite',
      ),
    )

    expect(result['tsconfig.app.json']).toBe(`{
  "compilerOptions": {
    // Bundler mode
    "moduleResolution": "bundler",
    /* Linting */
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
`)
  })

  it('keeps tab indentation', () => {
    const result = updated(
      alias(
        {
          tsconfigs: { 'tsconfig.json': '{\n\t"compilerOptions": {\n\t\t"strict": true\n\t}\n}\n' },
        },
        'next',
      ),
    )

    expect(result['tsconfig.json']).toContain('\t\t"paths": {\n\t\t\t"@/*": ["./src/*"]\n\t\t}')
  })

  it('leaves an existing @/* untouched and warns', () => {
    const result = alias(
      {
        tsconfigs: {
          'tsconfig.json': '{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }',
        },
      },
      'next',
    )

    expect(updated(result)).toEqual({})
    expect(result.warnings).toContain('tsconfig.json already defines @/* and was left untouched')
  })

  it('leaves an existing @/* that points elsewhere untouched and warns', () => {
    const result = alias(
      {
        tsconfigs: {
          'tsconfig.json': '{ "compilerOptions": { "paths": { "@/*": ["./app/*"] } } }',
        },
      },
      'tanstack-start',
    )

    expect(updated(result)).toEqual({})
    expect(result.warnings).toContain('tsconfig.json already defines @/* and was left untouched')
  })

  it('skips the alias with a warning when there is no src/ folder', () => {
    const result = alias(
      { hasSrcDirectory: false, tsconfigs: { 'tsconfig.json': rootTsconfig } },
      'next',
    )

    expect(updated(result)).toEqual({})
    expect(result.warnings).toContain('No src/ folder found, the @/* path alias was skipped')
  })

  it('skips the alias with a warning when the tsconfig is missing', () => {
    const result = alias({}, 'react-vite')

    expect(updated(result)).toEqual({})
    expect(result.warnings).toContain('tsconfig.json not found, the @/* path alias was skipped')
  })

  it('skips the alias with --no-alias', () => {
    const result = alias({ tsconfigs: { 'tsconfig.json': rootTsconfig } }, 'next', false)

    expect(updated(result)).toEqual({})
    expect(result.warnings.filter((warning) => warning.includes('@/*'))).toEqual([])
  })

  describe('Vite config', () => {
    const vite = (
      config: string | null,
      tsconfigs: Record<string, string> = { 'tsconfig.app.json': viteAppTsconfig },
    ) =>
      alias(
        {
          tsconfigs,
          viteConfig: config === null ? null : { content: config, path: 'vite.config.ts' },
        },
        'react-vite',
      )

    it('enables tsconfig path resolution with an AST edit that keeps the rest of the file', () => {
      const result = vite(viteConfig)
      const config = updated(result)['vite.config.ts']

      expect(config).toContain('tsconfigPaths: true')
      expect(config).toMatch(/\}\)\n$/)
      expect(config).toContain('// https://vite.dev/config/')
      expect(config).toContain('plugins: [react()]')
      expect(result.manualSteps).toEqual([])
    })

    it('enables it for any Framework whose project has a Vite config', () => {
      const result = alias(
        {
          tsconfigs: { 'tsconfig.json': rootTsconfig },
          viteConfig: { content: viteConfig, path: 'vite.config.ts' },
        },
        'tanstack-start',
      )

      expect(Object.keys(updated(result))).toEqual(['tsconfig.json', 'vite.config.ts'])
    })

    it('falls back to the root tsconfig for React + Vite without tsconfig.app.json', () => {
      const result = vite(viteConfig, { 'tsconfig.json': rootTsconfig })

      expect(Object.keys(updated(result))).toEqual(['tsconfig.json', 'vite.config.ts'])
    })

    it('shows the exact line as a manual step when there is no Vite config', () => {
      expect(vite(null).manualSteps).toEqual([
        'Add `resolve: { tsconfigPaths: true }` to your Vite config so the @/* alias works in the dev server',
      ])
    })

    it('shows the exact line as a manual step when the config cannot be edited safely', () => {
      const result = vite(
        "import { defineConfig } from 'vite'\nexport default defineConfig(({ mode }) => ({ plugins: [] }))\n",
      )

      expect(updated(result)).not.toHaveProperty('vite.config.ts')
      expect(result.manualSteps).toHaveLength(1)
    })

    it('does not touch the Vite config when the alias is skipped', () => {
      const result = vite(viteConfig, {
        'tsconfig.app.json': '{ "compilerOptions": { "paths": { "@/*": ["./x/*"] } } }',
      })

      expect(updated(result)).toEqual({})
      expect(result.manualSteps).toEqual([])
    })
  })
})

describe('TypeScript 7', () => {
  const devDependencies = (result: ReturnType<typeof plan>) =>
    result.operations.find(({ type }) => type === 'add-dev-dependencies')

  it.each(['5.9.3', '^5.9.0', '6.0.2', null])('leaves TypeScript %s untouched', (version) => {
    const result = run({ typescriptVersion: version })

    expect(devDependencies(result)).not.toHaveProperty(['dependencies', 'typescript'])
    expect(result.warnings).toEqual([])
  })

  it.each(['7.0.2', '^7.0.0', '8.1.0'])(
    'aliases typescript to the TS 6 package and keeps %s as typescript-7 in the same install',
    (version) => {
      expect(devDependencies(run({ typescriptVersion: version }))).toMatchObject({
        dependencies: {
          typescript: 'npm:@typescript/typescript6@6.0.2',
          'typescript-7': `npm:typescript@${version}`,
        },
      })
    },
  )

  it('shows the alias lines as a manual step with npm, which links tsc to TypeScript 6', () => {
    const result = plan(
      { ...snapshot, typescriptVersion: '7.0.2' },
      { addons: [], alias: false, framework: null, packageManager: 'npm', toolchain: 'eslint' },
      metadata,
      environment,
    )

    expect(devDependencies(result)).not.toHaveProperty(['dependencies', 'typescript'])
    expect(result.manualSteps).toHaveLength(1)
    expect(result.manualSteps[0]).toContain('"typescript": "npm:@typescript/typescript6@6.0.2"')
    expect(result.manualSteps[0]).toContain('"typescript-7": "npm:typescript@7.0.2"')
  })

  it('does not install the TS 6 package as a plain dependency', () => {
    expect(devDependencies(run({ typescriptVersion: '7.0.2' }))).not.toHaveProperty([
      'dependencies',
      TYPESCRIPT_COMPAT_PACKAGE,
    ])
  })

  it('warns and skips the alias when the Toolchain package declares no TS 6 package', () => {
    const result = plan(
      { ...snapshot, typescriptVersion: '7.0.2' },
      { addons: [], alias: false, framework: null, packageManager: 'pnpm', toolchain: 'eslint' },
      { ...metadata, peerDependencies: { eslint: '9.39.1' } },
      environment,
    )

    expect(devDependencies(result)).not.toHaveProperty(['dependencies', 'typescript'])
    expect(result.warnings).toHaveLength(1)
  })

  it.each(['latest', 'catalog:'])(
    'warns when the TypeScript version %s has no number',
    (version) => {
      const result = run({ typescriptVersion: version })

      expect(devDependencies(result)).not.toHaveProperty(['dependencies', 'typescript'])
      expect(result.warnings).toHaveLength(1)
    },
  )
})

describe('oxc Toolchain', () => {
  const planOxc = (
    overrides: Partial<Snapshot> = {},
    framework: Framework | null = null,
    addons: Addon[] = [],
  ) => run(overrides, environment, framework, addons, 'oxc')

  const files = (framework: Framework | null, addons: Addon[] = []) =>
    Object.fromEntries(
      planOxc({}, framework, addons).operations.flatMap((operation) =>
        operation.type === 'create-file' ? [[operation.path, operation.content]] : [],
      ),
    )

  it('installs the oxc package with the peers from its metadata', () => {
    expect(planOxc().operations.find(({ type }) => type === 'add-dev-dependencies')).toEqual({
      type: 'add-dev-dependencies',
      dependencies: {
        '@santux/oxc-config': '1.0.0',
        '@commitlint/cli': '20.1.0',
        '@commitlint/config-conventional': '20.0.0',
        'eslint-plugin-check-file': '3.3.1',
        husky: '9.1.7',
        oxfmt: '0.75.0',
        oxlint: '1.90.0',
        'oxlint-tsgolint': '7.0.2005',
      },
    })
  })

  it('keeps the ESLint plugins its JS plugins need while removing the rest of an ESLint setup', () => {
    const { operations } = planOxc(
      {
        dependencies: ['eslint', 'eslint-plugin-react', 'eslint-config-next'],
        conflictFiles: ['eslint.config.mjs'],
      },
      'next',
    )

    expect(operations).toContainEqual({
      type: 'remove-dependencies',
      dependencies: ['eslint', 'eslint-config-next'],
    })
  })

  it('writes the oxlint and oxfmt configs instead of the eslint and prettier ones', () => {
    expect(Object.keys(files(null))).toEqual(
      expect.arrayContaining(['oxlint.config.ts', 'oxfmt.config.ts', 'commitlint.config.js']),
    )
    expect(Object.keys(files(null))).not.toContain('eslint.config.js')
    expect(Object.keys(files(null))).not.toContain('prettier.config.js')
    expect(files(null)['commitlint.config.js']).toBe(
      "export { default } from '@santux/oxc-config/commitlint'\n",
    )
  })

  it('composes the base and the Framework lint entries', () => {
    expect(files('react-vite')['oxlint.config.ts']).toContain(
      "import reactVite from '@santux/oxc-config/react-vite'",
    )
    expect(files('react-vite')['oxlint.config.ts']).toContain('extends: [santux, reactVite]')
    expect(files(null)['oxlint.config.ts']).toContain('extends: [santux]')
  })

  it.each([
    [null, ["'**/build'", "'**/dist'"], ['.next', '.output']],
    ['react-vite', ["'**/build'", "'**/dist'"], ['.next', '.output']],
    [
      'next',
      ["'**/build'", "'**/dist'", "'**/.next/**'", "'**/out/**'", "'**/next-env.d.ts'"],
      ['.output'],
    ],
    [
      'tanstack-start',
      ["'**/build'", "'**/dist'", "'**/.output/**'", "'**/.tanstack/**'", "'**/routeTree.gen.ts'"],
      ['.next'],
    ],
  ] as const)('sets the ignore patterns itself for %s', (framework, included, excluded) => {
    const config = files(framework)['oxlint.config.ts'] ?? ''

    for (const pattern of included) expect(config).toContain(pattern)
    for (const pattern of excluded) expect(config).not.toContain(pattern)
  })

  it('keeps the generated route tree of TanStack Start out of formatting', () => {
    expect(files('tanstack-start')['.prettierignore']).toContain('\nrouteTree.gen.ts\n')
    expect(files('react-vite')['.prettierignore']).not.toContain('routeTree.gen.ts')
  })

  it('re-exports the format entry without Framework or Add-ons', () => {
    expect(files(null)['oxfmt.config.ts']).toBe(
      "export { default } from '@santux/oxc-config/format'\n",
    )
    expect(files('react-vite')['oxfmt.config.ts']).toBe(
      "export { default } from '@santux/oxc-config/format'\n",
    )
  })

  it('maps Next.js and Tailwind to the matching format entries', () => {
    const config = files('next', ['tailwind'])['oxfmt.config.ts']

    expect(config).toContain("import formatNext from '@santux/oxc-config/format-next'")
    expect(config).toContain("import formatTailwind from '@santux/oxc-config/format-tailwind'")
    expect(config).toContain('defineConfig({ ...santux, ...formatNext, ...formatTailwind })')
  })

  it('composes the Tailwind lint entry into the oxlint config', () => {
    const config = files('next', ['tailwind'])['oxlint.config.ts']

    expect(config).toContain("import tailwind from '@santux/oxc-config/tailwind'")
    expect(config).toContain('extends: [santux, next, tailwind]')
  })

  it('does not add the format-next entry outside Next.js', () => {
    expect(files('react-vite', ['tailwind'])['oxfmt.config.ts']).not.toContain('format-next')
  })

  it('sets the oxlint and oxfmt scripts', () => {
    expect(planOxc().operations).toContainEqual({
      type: 'set-scripts',
      scripts: expect.objectContaining({
        lint: 'oxlint',
        format: 'oxfmt --check',
        prepare: 'husky',
      }) as Record<string, string>,
    })
  })

  it('leaves TypeScript 7 as is', () => {
    const result = planOxc({ typescriptVersion: '7.0.0' })

    expect(result.warnings).toEqual([])
    expect(JSON.stringify(result.operations)).not.toContain(TYPESCRIPT_COMPAT_PACKAGE)
  })

  it('removes the eslint and prettier configs of the other Toolchain', () => {
    expect(
      planOxc({ existingFiles: ['eslint.config.js', 'prettier.config.js'] }).operations.slice(0, 2),
    ).toEqual([
      { type: 'delete-file', path: 'eslint.config.js' },
      { type: 'delete-file', path: 'prettier.config.js' },
    ])
  })

  it('still cleans up the eslint dependencies when both Toolchain configs exist', () => {
    const result = planOxc({
      dependencies: ['typescript-eslint', 'oxlint-tsgolint'],
      existingFiles: ['eslint.config.js', 'oxlint.config.ts'],
    })

    expect(result.operations).toContainEqual({
      type: 'remove-dependencies',
      dependencies: ['typescript-eslint'],
    })
  })

  it('points the commitlint config at the new package when switching Toolchains', () => {
    const result = planOxc({
      dependencies: ['@santux/eslint-config'],
      existingFiles: ['eslint.config.js', 'commitlint.config.js'],
    })

    expect(result.operations).toContainEqual({
      type: 'update-file',
      path: 'commitlint.config.js',
      content: "export { default } from '@santux/oxc-config/commitlint'\n",
    })
    expect(result.operations).toContainEqual({
      type: 'remove-dependencies',
      dependencies: ['@santux/eslint-config'],
    })
  })

  it('removes the oxc package when switching to the eslint Toolchain', () => {
    expect(
      run({ dependencies: ['@santux/oxc-config'], existingFiles: ['oxlint.config.ts'] }).operations,
    ).toContainEqual({ type: 'remove-dependencies', dependencies: ['@santux/oxc-config'] })
  })

  it('removes the oxlint and oxfmt configs when planning the eslint Toolchain', () => {
    expect(
      run({ existingFiles: ['oxlint.config.ts', 'oxfmt.config.ts'] }).operations.slice(0, 2),
    ).toEqual([
      { type: 'delete-file', path: 'oxlint.config.ts' },
      { type: 'delete-file', path: 'oxfmt.config.ts' },
    ])
  })
})

describe('re-running on a configured project', () => {
  const eslintConfigs = {
    'eslint.config.js':
      "import santux from '@santux/eslint-config/lint'\nimport next from '@santux/eslint-config/next'\n",
    'prettier.config.js': "export { default } from '@santux/eslint-config/format'\n",
  }

  const dependencies = [
    '@santux/eslint-config',
    '@commitlint/cli',
    'eslint',
    'husky',
    'typescript-eslint',
    '@next/eslint-plugin-next',
    'eslint-plugin-jsx-a11y',
    'eslint-plugin-react',
    'eslint-plugin-react-hooks',
    'globals',
  ]

  const configured = {
    dependencies,
    dependencyVersions: Object.fromEntries(
      dependencies.map((name) => [name, metadata.peerDependencies?.[name] ?? metadata.version]),
    ),
    existingFiles: [
      ...Object.keys(eslintConfigs),
      'commitlint.config.js',
      '.husky/commit-msg',
      '.editorconfig',
      '.prettierignore',
      '.node-version',
    ],
    toolchainConfigs: eslintConfigs,
  }

  it('detects the Toolchain of the existing Tooling layer', () => {
    expect(detect({ ...snapshot, ...configured }).toolchain).toBe('eslint')
    expect(detect({ ...snapshot, existingFiles: ['oxlint.config.ts'] }).toolchain).toBe('oxc')
    expect(detect(snapshot).toolchain).toBeNull()
  })

  it('plans nothing when there are no new selections', () => {
    const result = run(configured, environment, 'next')

    expect(result.operations).toEqual([])
    expect(result.manualSteps).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it('reinstalls a dependency whose declared version differs from the one the package pins', () => {
    const result = run(
      {
        ...configured,
        dependencyVersions: { ...configured.dependencyVersions, eslint: '^8.57.0' },
      },
      environment,
      'next',
    )

    expect(result.operations).toEqual([
      { type: 'add-dev-dependencies', dependencies: { eslint: '9.39.1' } },
    ])
  })

  it('installs only the missing Tailwind peers and prints the lint line and the format config to replace the re-export with', () => {
    const result = run(configured, environment, 'next', ['tailwind'])

    expect(result.operations).toEqual([
      {
        type: 'add-dev-dependencies',
        dependencies: { 'prettier-plugin-tailwindcss': '0.7.2', '@shadcn/lint': '0.2.5' },
      },
    ])
    expect(result.manualSteps).toEqual([
      "Add `import tailwind from '@santux/eslint-config/tailwind'` to eslint.config.js and `tailwind` to the `defineConfig([...])` array",
      "Replace prettier.config.js with:\nimport santux from '@santux/eslint-config/format'\nimport formatTailwind from '@santux/eslint-config/format-tailwind'\n\nexport default { ...santux, ...formatTailwind }\n",
    ])
  })

  it('prints the lines to add to the lint config for a newly selected Framework', () => {
    const result = run(
      { ...configured, dependencies: [...configured.dependencies, 'eslint-plugin-react-refresh'] },
      environment,
      'react-vite',
    )

    expect(result.operations).toEqual([])
    expect(result.manualSteps).toEqual([
      "Add `import reactVite from '@santux/eslint-config/react-vite'` to eslint.config.js and `reactVite` to the `defineConfig([...])` array",
    ])
  })

  it('prints the oxc config lines, including the ignore patterns', () => {
    const result = run(
      {
        ...configured,
        dependencies: ['@santux/oxc-config', '@commitlint/cli', 'husky', 'oxfmt', 'oxlint'],
        existingFiles: [
          'oxlint.config.ts',
          'oxfmt.config.ts',
          ...configured.existingFiles.slice(2),
        ],
        toolchainConfigs: {
          'oxlint.config.ts': "import santux from '@santux/oxc-config/lint'\n",
          'oxfmt.config.ts':
            "import santux from '@santux/oxc-config/format'\nimport formatNext from '@santux/oxc-config/format-next'\nimport { defineConfig } from 'oxfmt'\n\nexport default defineConfig({ ...santux, ...formatNext })\n",
        },
      },
      environment,
      'next',
      ['tailwind'],
      'oxc',
    )

    expect(result.manualSteps).toEqual([
      "Add `import next from '@santux/oxc-config/next'` to oxlint.config.ts and `next` to `extends`, plus these `ignorePatterns`: `**/build`, `**/dist`, `**/.next/**`, `**/out/**`, `**/next-env.d.ts` if they are missing",
      "Add `import tailwind from '@santux/oxc-config/tailwind'` to oxlint.config.ts and `tailwind` to `extends`",
      "Add `import formatTailwind from '@santux/oxc-config/format-tailwind'` to oxfmt.config.ts and spread `...formatTailwind` into its exported config",
    ])
  })
})

describe('minimum release age', () => {
  const planReleaseAge = (
    packageManager: PackageManager,
    packageManagerConfigs: Record<string, string>,
    packageManagerVersion: string | null = '99.0.0',
  ) =>
    plan(
      { ...snapshot, packageManagerConfigs },
      { addons: [], alias: false, framework: null, packageManager, toolchain: 'eslint' },
      metadata,
      { ...environment, packageManagerVersion },
    )

  const releaseAge = (result: ReturnType<typeof planReleaseAge>) =>
    result.operations.filter((operation) => operation.type === 'set-minimum-release-age')

  it.each([
    ['pnpm', 'pnpm-workspace.yaml', 'minimumReleaseAge: 1440\n'],
    ['npm', '.npmrc', 'min-release-age=1\n'],
    ['yarn', '.yarnrc.yml', 'npmMinimalAgeGate: 1440\n'],
    ['bun', 'bunfig.toml', '[install]\nminimumReleaseAge = 86400\n'],
  ] as const)('creates the %s config set to one day', (packageManager, path, content) => {
    expect(releaseAge(planReleaseAge(packageManager, {}))).toEqual([
      { type: 'set-minimum-release-age', path, content },
    ])
  })

  it('appends the setting to an existing config', () => {
    expect(
      releaseAge(planReleaseAge('pnpm', { 'pnpm-workspace.yaml': "packages:\n  - 'apps/*'" })),
    ).toEqual([
      {
        type: 'set-minimum-release-age',
        path: 'pnpm-workspace.yaml',
        content: "packages:\n  - 'apps/*'\nminimumReleaseAge: 1440\n",
      },
    ])
  })

  it('adds the bun setting to the existing install table', () => {
    const bunfig = '[install]\nexact = true\n\n[test]\ncoverage = true\n'

    expect(releaseAge(planReleaseAge('bun', { 'bunfig.toml': bunfig }))).toEqual([
      {
        type: 'set-minimum-release-age',
        path: 'bunfig.toml',
        content: '[install]\nminimumReleaseAge = 86400\nexact = true\n\n[test]\ncoverage = true\n',
      },
    ])
  })

  it.each([
    ['pnpm', { 'pnpm-workspace.yaml': 'minimumReleaseAge: 0\n' }],
    ['pnpm', { '.npmrc': 'minimum-release-age=10080\n' }],
    ['npm', { '.npmrc': 'min-release-age=7\n' }],
    ['npm', { '.npmrc': 'before=2026-01-01\n' }],
    ['yarn', { '.yarnrc.yml': 'npmMinimalAgeGate: 3d\n' }],
    ['bun', { 'bunfig.toml': '[install]\nminimumReleaseAge = 0\n' }],
  ] as const)('keeps the %s value the user already set in %o', (packageManager, configs) => {
    const result = planReleaseAge(packageManager, configs)

    expect(releaseAge(result)).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it('ignores a commented out setting', () => {
    expect(releaseAge(planReleaseAge('npm', { '.npmrc': '# min-release-age=7\n' }))).toHaveLength(1)
  })

  it.each([
    ['1.22.22', '1.22.22'],
    [null, 'an unknown version'],
  ])('warns instead of writing a setting yarn %s does not know', (version, found) => {
    const result = planReleaseAge('yarn', {}, version)

    expect(releaseAge(result)).toEqual([])
    expect(result.warnings).toEqual([
      `The minimum release age was not set, since it needs yarn 4.10.0 or later and found ${found}`,
    ])
  })
})
