import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

interface Manifest {
  devDependencies: Record<string, string>
  peerDependencies: Record<string, string>
}

describe('config packages', () => {
  it.each(['eslint-config', 'oxc-config'])(
    '%s pins every peer at the version it is developed and tested with',
    (name) => {
      const { devDependencies, peerDependencies } = JSON.parse(
        readFileSync(new URL(`../../../${name}/package.json`, import.meta.url), 'utf8'),
      ) as Manifest

      const tested = Object.fromEntries(
        Object.entries(devDependencies).filter(([tool]) => tool in peerDependencies),
      )

      expect(peerDependencies).toMatchObject(tested)
    },
  )
})
