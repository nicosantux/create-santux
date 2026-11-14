import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { ESLint } from 'eslint'
import { format } from 'prettier'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import astroReact from '../astro-react.js'
import astro from '../astro.js'
import formatAstro from '../format-astro.js'
import formatTailwind from '../format-tailwind.js'
import formatConfig from '../format.js'
import base from '../lint.js'
import next from '../next.js'
import reactVite from '../react-vite.js'
import tailwind from '../tailwind.js'
import tanstackStart from '../tanstack-start.js'

describe('lint entry', () => {
  let cwd
  let results

  beforeAll(async () => {
    cwd = await mkdtemp(join(import.meta.dirname, 'fixture-'))
    await mkdir(join(cwd, 'src'))
    await writeFile(join(cwd, 'package.json'), '{"name":"fixture","type":"module"}')
    await writeFile(
      join(cwd, 'tsconfig.json'),
      '{"compilerOptions":{"strict":true,"module":"esnext","moduleResolution":"bundler"}}',
    )
    await writeFile(join(cwd, 'src/a.ts'), "import { b } from './b'\n\nexport const a = b\n")
    await writeFile(join(cwd, 'src/b.ts'), "import { a } from './a'\n\nexport const b = a\n")
    await writeFile(join(cwd, 'src/self.ts'), "import './self'\n")
    await writeFile(join(cwd, 'src/extraneous.ts'), "import 'vitest'\n")

    const eslint = new ESLint({ cwd, overrideConfigFile: true, overrideConfig: base })

    results = await eslint.lintFiles(['src/*.ts'])
  })

  afterAll(() => rm(cwd, { recursive: true, force: true }))

  const ruleIds = (file) =>
    results
      .find((result) => result.filePath.endsWith(file))
      .messages.map((message) => message.ruleId)

  it('reports import cycles in TypeScript files', () => {
    expect(ruleIds('a.ts')).toContain('import-x/no-cycle')
  })

  it('reports self imports in TypeScript files', () => {
    expect(ruleIds('self.ts')).toContain('import-x/no-self-import')
  })

  it('reports undeclared dependencies in TypeScript files', () => {
    expect(ruleIds('extraneous.ts')).toContain('import-x/no-extraneous-dependencies')
  })
})

describe('next entry', () => {
  let cwd
  let results

  beforeAll(async () => {
    cwd = await mkdtemp(join(import.meta.dirname, 'fixture-'))
    await mkdir(join(cwd, 'src/app/[id]'), { recursive: true })
    await writeFile(join(cwd, 'package.json'), '{"name":"fixture","type":"module"}')
    await writeFile(
      join(cwd, 'tsconfig.json'),
      '{"compilerOptions":{"strict":true,"jsx":"react-jsx","module":"esnext","moduleResolution":"bundler"}}',
    )
    await writeFile(
      join(cwd, 'src/app/[id]/page.tsx'),
      'export default function Page() {\n  return <img src="/a.png" />\n}\n',
    )
    await writeFile(join(cwd, 'src/app/not_kebab.ts'), 'export const a = 1\n')

    const eslint = new ESLint({ cwd, overrideConfigFile: true, overrideConfig: [...base, ...next] })

    results = await eslint.lintFiles(['src/**/*.{ts,tsx}'])
  })

  afterAll(() => rm(cwd, { recursive: true, force: true }))

  const ruleIds = (file) =>
    results
      .find((result) => result.filePath.endsWith(file))
      .messages.map((message) => message.ruleId)

  it('reports Next.js and accessibility rules', () => {
    expect(ruleIds('page.tsx')).toEqual(
      expect.arrayContaining(['@next/next/no-img-element', 'jsx-a11y/alt-text']),
    )
  })

  it('accepts App Router folder names', () => {
    expect(ruleIds('page.tsx')).not.toContain('check-file/folder-naming-convention')
  })
})

describe('react-vite entry', () => {
  let cwd
  let results

  beforeAll(async () => {
    cwd = await mkdtemp(join(import.meta.dirname, 'fixture-'))
    await mkdir(join(cwd, 'src'))
    await writeFile(join(cwd, 'package.json'), '{"name":"fixture","type":"module"}')
    await writeFile(
      join(cwd, 'tsconfig.json'),
      '{"compilerOptions":{"strict":true,"jsx":"react-jsx","module":"esnext","moduleResolution":"bundler"}}',
    )
    await writeFile(
      join(cwd, 'src/page.tsx'),
      'export const helper = () => 1\n\nexport function Page() {\n  return <img src="/a.png" />\n}\n',
    )

    const eslint = new ESLint({
      cwd,
      overrideConfigFile: true,
      overrideConfig: [...base, ...reactVite],
    })

    results = await eslint.lintFiles(['src/*.tsx'])
  })

  afterAll(() => rm(cwd, { recursive: true, force: true }))

  it('reports react-refresh and accessibility rules', () => {
    const ruleIds = results[0].messages.map((message) => message.ruleId)

    expect(ruleIds).toEqual(
      expect.arrayContaining(['react-refresh/only-export-components', 'jsx-a11y/alt-text']),
    )
  })
})

describe('tanstack-start entry', () => {
  let cwd
  let results

  beforeAll(async () => {
    cwd = await mkdtemp(join(import.meta.dirname, 'fixture-'))
    await mkdir(join(cwd, 'src/routes/_auth'), { recursive: true })
    await writeFile(join(cwd, 'package.json'), '{"name":"fixture","type":"module"}')
    await writeFile(
      join(cwd, 'tsconfig.json'),
      '{"compilerOptions":{"strict":true,"jsx":"react-jsx","module":"esnext","moduleResolution":"bundler"}}',
    )
    await writeFile(join(cwd, 'src/routes/__root.tsx'), 'export const Route = 1\n')
    await writeFile(join(cwd, 'src/routes/_auth/dashboard.tsx'), 'export const Route = 1\n')
    await writeFile(join(cwd, 'src/BadName.tsx'), 'export const Route = 1\n')
    await writeFile(
      join(cwd, 'src/page.tsx'),
      'export const Route = 1\n\nexport function Page() {\n  return <img src="/a.png" />\n}\n',
    )

    const eslint = new ESLint({
      cwd,
      overrideConfigFile: true,
      overrideConfig: [...base, ...tanstackStart],
    })

    results = await eslint.lintFiles(['src/**/*.tsx'])
  })

  afterAll(() => rm(cwd, { recursive: true, force: true }))

  const ruleIds = (suffix) =>
    results
      .find((result) => result.filePath.endsWith(suffix))
      .messages.map((message) => message.ruleId)

  it('reports accessibility rules', () => {
    expect(ruleIds('page.tsx')).toContain('jsx-a11y/alt-text')
  })

  it('allows route file and folder names outside kebab-case only under routes', () => {
    expect(ruleIds('__root.tsx')).not.toContain('check-file/filename-naming-convention')
    expect(ruleIds('dashboard.tsx')).not.toContain('check-file/folder-naming-convention')
    expect(ruleIds('BadName.tsx')).toContain('check-file/filename-naming-convention')
  })
})

describe('tailwind entry', () => {
  let cwd
  let results

  beforeAll(async () => {
    cwd = await mkdtemp(join(import.meta.dirname, 'fixture-'))
    await mkdir(join(cwd, 'src'))
    await writeFile(
      join(cwd, 'package.json'),
      '{"name":"fixture","type":"module","dependencies":{"tailwindcss":"4.3.5"}}',
    )
    await writeFile(
      join(cwd, 'tsconfig.json'),
      '{"compilerOptions":{"strict":true,"jsx":"react-jsx","module":"esnext","moduleResolution":"bundler"}}',
    )
    await writeFile(
      join(cwd, 'src/index.css'),
      '@import "tailwindcss";\n@theme {\n  --color-brand: #f00;\n}\n',
    )
    await writeFile(
      join(cwd, 'src/card.tsx'),
      "export function Card() {\n  return <div className='rounded-huge bg-pink-500 p-[13px]' style={{ color: 'red' }} />\n}\n",
    )

    const eslint = new ESLint({
      cwd,
      overrideConfigFile: true,
      overrideConfig: [...base, ...reactVite, ...tailwind],
    })

    results = await eslint.lintFiles(['src/*.tsx'])
  })

  afterAll(() => rm(cwd, { recursive: true, force: true }))

  it('reports classes Tailwind cannot generate, raw colors, arbitrary values and inline styles', () => {
    const ruleIds = results[0].messages.map((message) => message.ruleId)

    expect(ruleIds).toEqual(
      expect.arrayContaining([
        'shadcn/no-unknown-classes',
        'shadcn/no-raw-colors',
        'shadcn/no-arbitrary-values',
        'shadcn/no-inline-styles',
      ]),
    )
  })
})

describe('astro entry', () => {
  let cwd
  let results
  let warn

  beforeAll(async () => {
    cwd = await mkdtemp(join(import.meta.dirname, 'fixture-'))
    await mkdir(join(cwd, 'src/pages/[lang]'), { recursive: true })
    await mkdir(join(cwd, 'src/components'))
    await mkdir(join(cwd, '.astro'))
    await writeFile(
      join(cwd, 'package.json'),
      '{"name":"fixture","type":"module","dependencies":{"astro":"7.4.7"}}',
    )
    await writeFile(
      join(cwd, 'tsconfig.json'),
      '{"compilerOptions":{"strict":true,"jsx":"react-jsx","module":"esnext","moduleResolution":"bundler","target":"esnext"},"include":["**/*"]}',
    )
    await writeFile(join(cwd, '.astro/types.d.ts'), 'declare const BadName: any\n')
    await writeFile(join(cwd, 'src/pages/[slug].ts'), 'export const a = 1\n')
    await writeFile(join(cwd, 'src/BadName.ts'), 'export const a = 1\n')
    await writeFile(
      join(cwd, 'src/pages/[lang]/index.astro'),
      [
        '---',
        "import { getCollection } from 'astro:content'",
        '',
        "import { Counter } from '../../components/counter'",
        '',
        'interface Props {',
        '  title: string',
        '}',
        '',
        'export function load(p: Promise<number>) {',
        '  p',
        '}',
        '',
        "export const posts = getCollection('blog')",
        '---',
        '',
        '<img src="/a.png" />',
        '<Counter client:load />',
        '<script>',
        '  const count: number = 1',
        '',
        '  console.log(count)',
        '</script>',
        '',
      ].join('\n'),
    )
    await writeFile(
      join(cwd, 'src/components/counter.tsx'),
      'export function Counter() {\n  return <img src="/a.png" />\n}\n',
    )

    const eslint = new ESLint({
      cwd,
      overrideConfigFile: true,
      overrideConfig: [...base, ...astro, ...astroReact],
    })

    warn = vi.spyOn(globalThis.console, 'warn')
    results = await eslint.lintFiles(['src/**/*.{ts,tsx,astro}'])
  })

  afterAll(async () => {
    warn.mockRestore()
    await rm(cwd, { recursive: true, force: true })
  })

  const messages = (suffix) => results.find((result) => result.filePath.endsWith(suffix)).messages

  const ruleIds = (suffix) => messages(suffix).map((message) => message.ruleId)

  it('parses TypeScript in .astro files and runs type-aware rules there', () => {
    expect(messages('index.astro').filter((message) => message.fatal)).toEqual([])
    expect(ruleIds('index.astro')).toContain('@typescript-eslint/no-floating-promises')
  })

  it('parses the modules imported from .astro files with the TypeScript parser', () => {
    expect(warn).not.toHaveBeenCalled()
  })

  it('lints <script> blocks as TypeScript without type information', () => {
    expect(ruleIds('index.astro')).toEqual(
      expect.arrayContaining(['no-console', '@typescript-eslint/no-inferrable-types']),
    )
  })

  it('reports Astro accessibility rules', () => {
    expect(ruleIds('index.astro')).toContain('astro/jsx-a11y/alt-text')
  })

  it('accepts the Props interface and astro: virtual modules', () => {
    expect(ruleIds('index.astro')).not.toContain('@typescript-eslint/naming-convention')
    expect(ruleIds('index.astro')).not.toContain('import-x/no-extraneous-dependencies')
  })

  it('allows route file and folder names outside kebab-case only under pages', () => {
    expect(ruleIds('[slug].ts')).toEqual([])
    expect(ruleIds('index.astro')).not.toContain('check-file/folder-naming-convention')
    expect(ruleIds('BadName.ts')).toContain('check-file/filename-naming-convention')
  })

  it('ignores the generated .astro folder', () => {
    expect(results.some((result) => result.filePath.includes('/.astro/'))).toBe(false)
  })

  it('applies the React rules from the astro-react entry to .tsx files only', () => {
    expect(ruleIds('counter.tsx')).toContain('jsx-a11y/alt-text')
    expect(ruleIds('index.astro')).not.toContain('jsx-a11y/alt-text')
  })
})

describe('format-astro entry', () => {
  const source = '---\nconst a = "b"\n---\n<div   class="p-4 flex">{a}</div>\n'

  it('formats .astro files', async () => {
    const options = { ...formatConfig, ...formatAstro, filepath: 'page.astro' }

    expect(await format(source, options)).toBe(
      "---\nconst a = 'b'\n---\n\n<div class='p-4 flex'>{a}</div>\n",
    )
  })

  it('keeps the Tailwind plugin last when composed with format-tailwind', async () => {
    const options = {
      ...formatConfig,
      ...formatAstro,
      ...formatTailwind,
      plugins: [...formatAstro.plugins, ...formatTailwind.plugins],
      filepath: 'page.astro',
    }

    expect(await format(source, options)).toContain("<div class='flex p-4'>")
  })
})

describe('format-tailwind entry', () => {
  it('sorts Tailwind classes when composed with the format entry', async () => {
    const source = 'export const a = <div className="p-4 flex" />\n'
    const options = { ...formatConfig, ...formatTailwind, filepath: 'page.tsx' }

    expect(await format(source, options)).toBe("export const a = <div className='flex p-4' />\n")
  })
})
