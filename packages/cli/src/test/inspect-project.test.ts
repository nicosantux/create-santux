import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { inspectProject } from '../io/inspect-project.js'

describe('inspectProject', () => {
  let cwd: string

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'santux-'))
  })

  afterEach(() => rm(cwd, { force: true, recursive: true }))

  it('treats a Toolchain config path as a conflict only when it does not import a Toolchain package', async () => {
    await writeFile(join(cwd, 'package.json'), '{}')
    await writeFile(join(cwd, 'eslint.config.js'), 'export default []\n')

    await writeFile(
      join(cwd, 'prettier.config.js'),
      "export { default } from '@santux/eslint-config/format'\n",
    )

    const snapshot = await inspectProject(cwd)

    expect(snapshot.conflictFiles).toContain('eslint.config.js')
    expect(snapshot.existingFiles).not.toContain('eslint.config.js')
    expect(snapshot.existingFiles).toContain('prettier.config.js')
    expect(snapshot.conflictFiles).not.toContain('prettier.config.js')
  })

  it('reads the package manager config files that exist', async () => {
    await writeFile(join(cwd, 'package.json'), '{}')
    await writeFile(join(cwd, '.npmrc'), 'min-release-age=7\n')

    const snapshot = await inspectProject(cwd)

    expect(snapshot.packageManagerConfigs).toEqual({ '.npmrc': 'min-release-age=7\n' })
  })
})
