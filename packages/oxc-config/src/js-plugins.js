import { fileURLToPath } from 'node:url'

/**
 * An oxlint `jsPlugins` item resolved from this package, so the plugin loads from wherever the
 * package manager installed this package's peers.
 */
export const jsPlugin = (name, specifier) => ({
  name,
  specifier: fileURLToPath(import.meta.resolve(specifier)),
})
