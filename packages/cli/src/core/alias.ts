import type { Framework, Operation, Snapshot } from './types.js'

import { applyEdits, modify, parse } from 'jsonc-parser'
import { generateCode, parseModule } from 'magicast'
import { getDefaultExportOptions } from 'magicast/helpers'

const ALIAS = '@/*'
const ALIAS_TARGET = ['./src/*']
const VITE_LINE = 'resolve: { tsconfigPaths: true }'

interface AliasPlan {
  manualSteps: string[]
  operations: Operation[]
  warnings: string[]
}

interface TsConfig {
  compilerOptions?: { paths?: Record<string, unknown> }
}

/**
 * Puts the string arrays that jsonc-parser expands back on one line, as Prettier and oxfmt print them.
 * shortcut: ignores the print width, upgrade if an edit ever writes arrays too long for one line.
 */
const inlineStringArrays = (json: string) =>
  json.replaceAll(
    /\[\s*("(?:[^"\\\n]|\\.)*"(?:\s*,\s*"(?:[^"\\\n]|\\.)*")*)\s*\]/g,
    (_, items: string) => `[${(items.match(/"(?:[^"\\\n]|\\.)*"/g) ?? []).join(', ')}]`,
  )

function addAlias(source: string) {
  const indent = /^[\t ]+(?=\S)/m.exec(source)?.[0] ?? '  '
  const usesTabs = indent.startsWith('\t')

  const edits = modify(source, ['compilerOptions', 'paths', ALIAS], ALIAS_TARGET, {
    formattingOptions: { insertSpaces: !usesTabs, tabSize: usesTabs ? 1 : indent.length },
  })

  return applyEdits(
    source,
    edits.map((edit) => ({ ...edit, content: inlineStringArrays(edit.content) })),
  )
}

interface ViteOptions {
  resolve?: { tsconfigPaths?: boolean }
}

const viteOptions = (module_: ReturnType<typeof parseModule>): ViteOptions =>
  getDefaultExportOptions(module_) as ViteOptions

const hasTsconfigPaths = (code: string) =>
  viteOptions(parseModule(code)).resolve?.tsconfigPaths === true

/** Returns the edited Vite config, or `null` when the edit can't be done safely. */
function enableTsconfigPaths(source: string) {
  try {
    const module_ = parseModule(source)
    const options = viteOptions(module_)

    options.resolve ??= {}
    options.resolve.tsconfigPaths = true

    const code = generateCode(module_).code.trimEnd()

    return hasTsconfigPaths(code) ? `${code}\n` : null
  } catch {
    return null
  }
}

/** Plans the `@/*` path alias in the tsconfig that covers the app sources. */
export function planAlias(snapshot: Snapshot, framework: Framework | null): AliasPlan {
  const result: AliasPlan = { manualSteps: [], operations: [], warnings: [] }
  const path = 'tsconfig.app.json' in snapshot.tsconfigs ? 'tsconfig.app.json' : 'tsconfig.json'
  const source = snapshot.tsconfigs[path]

  if (!snapshot.hasSrcDirectory) {
    result.warnings.push(`No src/ folder found, the ${ALIAS} path alias was skipped`)

    return result
  }

  if (source === undefined) {
    result.warnings.push(`${path} not found, the ${ALIAS} path alias was skipped`)

    return result
  }

  if ((parse(source) as TsConfig | undefined)?.compilerOptions?.paths?.[ALIAS] !== undefined) {
    result.warnings.push(`${path} already defines ${ALIAS} and was left untouched`)

    return result
  }

  result.operations.push({ type: 'update-file', path, content: addAlias(source) })

  const { viteConfig } = snapshot

  if (viteConfig || framework === 'react-vite') {
    const content = viteConfig ? enableTsconfigPaths(viteConfig.content) : null

    if (viteConfig && content !== null) {
      result.operations.push({ type: 'update-file', path: viteConfig.path, content })
    } else {
      result.manualSteps.push(
        `Add \`${VITE_LINE}\` to your Vite config so the ${ALIAS} alias works in the dev server`,
      )
    }
  }

  return result
}
