import type { PackageManager, Toolchain, ToolchainMetadata } from '../core/types.js'

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { execa } from 'execa'

import { TOOLCHAIN_PACKAGE } from '../constants/toolchains.js'

const VIEW_COMMANDS: Record<PackageManager, string[]> = {
  bun: ['bun', 'info'],
  npm: ['npm', 'view'],
  pnpm: ['pnpm', 'view'],
  // yarn 1 has no registry lookup with the same output, so npm, which ships with Node, does it
  yarn: ['npm', 'view'],
}

/**
 * Reads the latest metadata of the Toolchain package through the package manager.
 * With `SANTUX_LOCAL` set, it reads the monorepo copy instead and points `version`
 * at it with `file:`, so unpublished packages can be tested.
 */
export async function fetchToolchainMetadata(
  toolchain: Toolchain,
  packageManager: PackageManager,
  cwd: string,
): Promise<ToolchainMetadata> {
  const [command, ...args] = VIEW_COMMANDS[packageManager]
  const packageName = TOOLCHAIN_PACKAGE[toolchain]

  if (process.env.SANTUX_LOCAL) {
    // Resolved from build/index.js, so it only works from the monorepo build.
    const path = fileURLToPath(new URL(`../../${toolchain}-config`, import.meta.url))

    const metadata = JSON.parse(await readFile(`${path}/package.json`, 'utf8')) as ToolchainMetadata

    return { ...metadata, version: `file:${path}` }
  }

  try {
    const { stdout } = await execa(command ?? packageManager, [...args, packageName, '--json'], {
      cwd,
    })

    return JSON.parse(stdout) as ToolchainMetadata
  } catch (error) {
    throw new Error(`Could not read ${packageName} from the registry`, { cause: error })
  }
}

/** Version of the package manager as run in `cwd`, `null` when it can't be read. */
export async function fetchPackageManagerVersion(packageManager: PackageManager, cwd: string) {
  const { stdout } = await execa(packageManager, ['--version'], { cwd, reject: false })

  return /^\d+\.\d+\.\d+/.exec(stdout.trim())?.[0] ?? null
}
