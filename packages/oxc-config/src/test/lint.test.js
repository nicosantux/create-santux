import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

import { format } from 'oxfmt'
import { afterAll, describe, expect, it } from 'vitest'

import formatAstro from '../format-astro.js'
import formatNext from '../format-next.js'
import formatTailwind from '../format-tailwind.js'
import formatConfig from '../format.js'

const run = promisify(execFile)
const oxlintBin = join(import.meta.dirname, '../../node_modules/.bin/oxlint')
const srcUrl = (entry) => pathToFileURL(join(import.meta.dirname, '..', entry)).href

const tsconfig =
  '{"compilerOptions":{"strict":true,"jsx":"react-jsx","module":"esnext","moduleResolution":"bundler","paths":{"@/*":["./src/*"]}},"include":["src"]}'

const fixtures = []

const lazy = (load) => {
  let result

  return () => (result ??= load())
}

/** Lints `files` in a throwaway project composed of the given entries and returns the rule ids per file. */
async function lint(entries, files, packageJson = '{"name":"fixture","type":"module"}') {
  const cwd = await mkdtemp(join(import.meta.dirname, 'fixture-'))

  fixtures.push(cwd)
  await writeFile(join(cwd, 'package.json'), packageJson)
  await writeFile(join(cwd, 'tsconfig.json'), tsconfig)

  const imports = entries.map((entry, index) => `import e${index} from '${srcUrl(entry)}'`)
  const extended = entries.map((_entry, index) => `e${index}`).join(', ')

  await writeFile(
    join(cwd, 'oxlint.config.ts'),
    `import { defineConfig } from 'oxlint'\n${imports.join('\n')}\n\nexport default defineConfig({ extends: [${extended}] })\n`,
  )

  await Promise.all(
    Object.entries(files).map(async ([path, source]) => {
      await mkdir(dirname(join(cwd, path)), { recursive: true })
      await writeFile(join(cwd, path), source)
    }),
  )

  const { stdout } = await run(oxlintBin, ['-c', 'oxlint.config.ts', '-f', 'json', 'src'], {
    cwd,
  }).catch((error) => error)

  const { diagnostics } = JSON.parse(stdout)

  // a throwing JS plugin turns off every JS rule in that file, so fail loudly instead
  const crash = diagnostics.find((diagnostic) =>
    diagnostic.message.startsWith('Error running JS plugin'),
  )

  if (crash) throw new Error(crash.message)

  return (suffix) =>
    diagnostics
      .filter((diagnostic) => diagnostic.filename.endsWith(suffix))
      .map((diagnostic) => diagnostic.code)
}

afterAll(() => Promise.all(fixtures.map((cwd) => rm(cwd, { recursive: true, force: true }))))

describe('lint entry', () => {
  const ruleIds = lazy(() =>
    lint(['lint.js'], {
      'src/a.ts': "import { b } from './b'\n\nexport const a = b\n",
      'src/b.ts': "import { a } from './a'\n\nexport const b = a\n",
      'src/lib/c.ts': "import { d } from '@/lib/d'\n\nexport const c = d\n",
      'src/lib/d.ts': "import { c } from '@/lib/c'\n\nexport const d = c\n",
      'src/self.ts': "import './self'\n",
      'src/BadName.ts': 'export const a = 1\n',
      'src/floating.ts': 'export function f(p: Promise<number>) {\n  void 0\n  p\n}\n',
      'src/floating.js': 'Promise.resolve(1)\n',
      'src/BadFolder/e.ts': 'export const e = 1\n',
      'src/padding.ts': 'export function f(a: number) {\n  const b = a\n  return b\n}\n',
    }),
  )

  it('reports import cycles in TypeScript files', async () => {
    expect((await ruleIds())('a.ts')).toContain('import(no-cycle)')
  })

  it('reports import cycles through the `@/` alias', async () => {
    expect((await ruleIds())('c.ts')).toContain('import(no-cycle)')
  })

  it('reports self imports', async () => {
    expect((await ruleIds())('self.ts')).toContain('import(no-self-import)')
  })

  it('reports file names outside kebab-case', async () => {
    expect((await ruleIds())('BadName.ts')).toContain('unicorn(filename-case)')
  })

  it('runs type-aware rules', async () => {
    expect((await ruleIds())('floating.ts')).toContain('typescript(no-floating-promises)')
  })

  it('skips type-aware rules in JS files', async () => {
    expect((await ruleIds())('floating.js')).not.toContain('typescript(no-floating-promises)')
  })

  it('reports folder names outside kebab-case', async () => {
    expect((await ruleIds())('BadFolder/e.ts')).toContain('check-file(folder-naming-convention)')
  })

  it('runs the stylistic padding rule', async () => {
    expect((await ruleIds())('padding.ts')).toContain('@stylistic(padding-line-between-statements)')
  })
})

describe('next entry', () => {
  const ruleIds = lazy(() =>
    lint(['lint.js', 'next.js'], {
      'src/app/[id]/page.tsx':
        'export default function Page() {\n  return <img src="/a.png" />\n}\n',
      'src/app/not_kebab.ts': 'export const a = 1\n',
    }),
  )

  it('reports Next.js and accessibility rules', async () => {
    expect((await ruleIds())('page.tsx')).toEqual(
      expect.arrayContaining(['next(no-img-element)', 'jsx-a11y(alt-text)']),
    )
  })

  it('keeps the file name rule', async () => {
    expect((await ruleIds())('not_kebab.ts')).toContain('unicorn(filename-case)')
  })

  it('allows App Router folder names', async () => {
    expect((await ruleIds())('page.tsx')).not.toContain('check-file(folder-naming-convention)')
  })
})

describe('react-vite entry', () => {
  it('reports react-refresh and accessibility rules', async () => {
    const ruleIds = await lint(['lint.js', 'react-vite.js'], {
      'src/page.tsx':
        'export const helper = () => 1\n\nexport function Page({ count }: { count: number }) {\n  return <img alt="" src="/a.png" width={1} height={count && 1} />\n}\n',
      'src/leaked.tsx':
        'export function Leaked({ count }: { count: number }) {\n  return <div>{count && <span />}</div>\n}\n',
    })

    expect(ruleIds('page.tsx')).toEqual(
      expect.arrayContaining(['react(only-export-components)', 'react-js(jsx-sort-props)']),
    )
    expect(ruleIds('leaked.tsx')).toContain('react-js(jsx-no-leaked-render)')
  })
})

describe('tanstack-start entry', () => {
  const ruleIds = lazy(() =>
    lint(['lint.js', 'tanstack-start.js'], {
      'src/routes/$postId.tsx': 'export const Route = 1\n',
      'src/routes/Posts_/index.tsx': 'export const Route = 1\n',
      'src/BadName.tsx': 'export const Route = 1\n',
      'src/page.tsx': 'export function Page() {\n  return <img src="/a.png" />\n}\n',
    }),
  )

  it('reports accessibility rules', async () => {
    expect((await ruleIds())('page.tsx')).toContain('jsx-a11y(alt-text)')
  })

  it('allows file names outside kebab-case only under routes', async () => {
    expect((await ruleIds())('$postId.tsx')).not.toContain('unicorn(filename-case)')
    expect((await ruleIds())('BadName.tsx')).toContain('unicorn(filename-case)')
  })

  it('allows folder names outside kebab-case under routes', async () => {
    expect((await ruleIds())('Posts_/index.tsx')).not.toContain(
      'check-file(folder-naming-convention)',
    )
  })
})

describe('tailwind entry', () => {
  it('reports classes Tailwind cannot generate, raw colors, arbitrary values and inline styles', async () => {
    const ruleIds = await lint(
      ['lint.js', 'react-vite.js', 'tailwind.js'],
      {
        'src/index.css': '@import "tailwindcss";\n@theme {\n  --color-brand: #f00;\n}\n',
        'src/card.tsx':
          "export function Card() {\n  return <div className='rounded-huge bg-pink-500 p-[13px]' style={{ color: 'red' }} />\n}\n",
      },
      '{"name":"fixture","type":"module","dependencies":{"tailwindcss":"4.1.12"}}',
    )

    expect(ruleIds('card.tsx')).toEqual(
      expect.arrayContaining([
        'shadcn(no-unknown-classes)',
        'shadcn(no-raw-colors)',
        'shadcn(no-arbitrary-values)',
        'shadcn(no-inline-styles)',
      ]),
    )
  })
})

describe('astro entry', () => {
  const ruleIds = lazy(() =>
    lint(
      ['lint.js', 'astro.js', 'astro-react.js'],
      {
        'src/pages/[lang]/index.astro': [
          '---',
          "import { getCollection } from 'astro:content'",
          '',
          "export const posts = getCollection('blog')",
          '---',
          '',
          '<img src="/a.png" />',
          '<script>',
          '  console.log(1)',
          '</script>',
          '',
        ].join('\n'),
        'src/pages/[slug].ts': 'export const a = 1\n',
        'src/components/Card.astro': '<div />\n',
        'src/BadName.ts': 'export const a = 1\n',
        'src/components/counter.tsx':
          'export function Counter() {\n  return <img src="/a.png" />\n}\n',
      },
      '{"name":"fixture","type":"module","dependencies":{"astro":"7.4.7"}}',
    ),
  )

  it('lints the script blocks of .astro files', async () => {
    expect((await ruleIds())('index.astro')).toContain('eslint(no-console)')
  })

  it('allows route names under pages and PascalCase components, and keeps the rule elsewhere', async () => {
    expect((await ruleIds())('[slug].ts')).toEqual([])
    expect((await ruleIds())('index.astro')).not.toContain('check-file(folder-naming-convention)')
    expect((await ruleIds())('Card.astro')).toEqual([])
    expect((await ruleIds())('BadName.ts')).toContain('unicorn(filename-case)')
  })

  it('applies the React rules from the astro-react entry to .tsx files only', async () => {
    expect((await ruleIds())('counter.tsx')).toContain('jsx-a11y(alt-text)')
    expect((await ruleIds())('index.astro')).not.toContain('jsx-a11y(alt-text)')
  })
})

describe('format entry', () => {
  const source = [
    "import './globals.css'",
    "import { z } from 'zod'",
    "import type { Foo } from 'react'",
    "import { useState } from 'react'",
    "import path from 'node:path'",
    "import { b } from './b'",
    "import { a } from '../a'",
    "import { x } from '@/lib/x'",
    "import Link from 'next/link'",
    "import type { Bar } from '@/types'",
    '',
    'export const A = <div className="p-4 flex">{[z, path, b, a, x, Link, useState]}</div>',
    '',
  ].join('\n')

  it('sorts imports into the layout of the eslint import order', async () => {
    const { code } = await format('page.tsx', source, formatConfig)

    expect(code).toBe(
      [
        "import type { Bar } from '@/types'",
        "import type { Foo } from 'react'",
        '',
        "import { useState } from 'react'",
        '',
        "import path from 'node:path'",
        '',
        "import Link from 'next/link'",
        "import { z } from 'zod'",
        '',
        "import { x } from '@/lib/x'",
        '',
        "import { a } from '../a'",
        '',
        "import { b } from './b'",
        "import './globals.css'",
        '',
        "export const A = <div className='p-4 flex'>{[z, path, b, a, x, Link, useState]}</div>",
        '',
      ].join('\n'),
    )
  })

  it('groups next with react when composed with the next format entry', async () => {
    const { code } = await format('page.tsx', source, { ...formatConfig, ...formatNext })

    expect(code).toContain("import Link from 'next/link'\nimport { useState } from 'react'\n")
  })

  it('sorts Tailwind classes when composed with the format-tailwind entry', async () => {
    const { code } = await format('page.tsx', source, { ...formatConfig, ...formatTailwind })

    expect(code).toContain("<div className='flex p-4'>")
  })

  it('formats .astro files when composed with the format-astro entry, sorting Tailwind classes too', async () => {
    const astroSource = '---\nconst a = "b"\n---\n<div   class="p-4 flex">{a}</div>\n'

    const { code, errors } = await format('page.astro', astroSource, {
      ...formatConfig,
      ...formatAstro,
      ...formatTailwind,
    })

    expect(errors).toEqual([])
    expect(code).toBe("---\nconst a = 'b'\n---\n\n<div class='flex p-4'>{a}</div>\n")
  })
})
