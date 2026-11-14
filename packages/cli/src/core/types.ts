import type { ADDONS, FRONTEND_FRAMEWORKS } from '../constants/frameworks.js'
import type { PACKAGE_MANAGER } from '../constants/package-manager.js'
import type { TOOLCHAIN_PACKAGE } from '../constants/toolchains.js'

export type PackageManager = keyof typeof PACKAGE_MANAGER

/** A set of lint and format tools, published as one config package. */
export type Toolchain = keyof typeof TOOLCHAIN_PACKAGE

/** A Framework with its own Framework rules. */
export type Framework = keyof typeof FRONTEND_FRAMEWORKS

/** An Add-on with its own tooling on top of the Framework. */
export type Addon = keyof typeof ADDONS

/** A Framework candidate: `node` is a backend with no Framework rules in v1. */
export type FrameworkCandidate = Framework | 'node'

export interface Snapshot {
  conflictFiles: string[]
  dependencies: string[]
  /** Declared version of each dependency, by name. */
  dependencyVersions: Record<string, string>
  existingFiles: string[]
  hasGit: boolean
  hasPackageJson: boolean
  hasPrettierKey: boolean
  hasSrcDirectory: boolean
  huskyFiles: string[]
  /** Whether package.json sets `"type": "module"`. */
  isModule: boolean
  lockfiles: string[]
  /** Contents of the package manager config files that exist, by path. */
  packageManagerConfigs: Record<string, string>
  productionDependencies: string[]
  /** `.js` files in the project root that the Tooling layer neither writes nor deletes. */
  rootJsFiles: string[]
  /** `package.json` scripts, by name. */
  scripts: Record<string, string>
  /** Contents of the lint and format config files that import a Toolchain package, by path. */
  toolchainConfigs: Record<string, string>
  /** Contents of the tsconfig files that exist, by path. */
  tsconfigs: Record<string, string>
  /** Installed TypeScript version, or the declared range when it is not installed. */
  typescriptVersion: string | null
  userAgent: string | undefined
  viteConfig: { content: string; path: string } | null
}

export interface Detection {
  addons: Addon[]
  frameworks: FrameworkCandidate[]
  packageManager: PackageManager | null
  /** The Toolchain of the Tooling layer the project already has, `null` when it has none. */
  toolchain: Toolchain | null
}

export interface Choices {
  addons: Addon[]
  alias: boolean
  framework: Framework | null
  packageManager: PackageManager
  toolchain: Toolchain
}

export interface ToolchainMetadata {
  engines?: { node?: string }
  name: string
  peerDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
  version: string
}

export interface Environment {
  nodeLts: string | null
  nodeVersion: string
  /** Version of the chosen package manager, `null` when it can't be read. */
  packageManagerVersion: string | null
}

export type Operation =
  | { content: string; path: string; type: 'create-file' }
  | { dependencies: Record<string, string>; type: 'add-dev-dependencies' }
  | { content: string; path: string; type: 'update-file' }
  | { path: string; type: 'delete-file' }
  | { key: string; type: 'remove-package-json-key' }
  | { type: 'set-module-type' }
  | { dependencies: string[]; type: 'remove-dependencies' }
  | { content: string; path: string; type: 'set-minimum-release-age' }
  | { scripts: Record<string, string>; type: 'set-scripts' }

export interface Plan {
  errors: string[]
  manualSteps: string[]
  operations: Operation[]
  warnings: string[]
}
