import type {
  Addon,
  Detection,
  Framework,
  FrameworkCandidate,
  Snapshot,
  Toolchain,
} from './types.js'

import {
  ADDON_FRAMEWORK,
  ADDONS,
  BACKEND_LIBRARIES,
  FRONTEND_FRAMEWORKS,
} from '../constants/frameworks.js'
import { LOCKFILES, PACKAGE_MANAGER } from '../constants/package-manager.js'
import { TOOLCHAIN_CONFIG_PATHS } from '../constants/toolchains.js'

/** Whether the Add-on can go with the Framework, as some are offered only with one. */
export function isAddonAvailable(addon: Addon, framework: Framework | null) {
  const required = ADDON_FRAMEWORK[addon]

  return required === undefined || required === framework
}

/**
 * Detects what can be inferred from the project snapshot.
 * Framework candidates come in priority order: frontend frameworks, then backend libraries.
 * Add-ons are found from the dependencies, and the ones tied to a Framework need it ranked first.
 * The Toolchain is the one whose config files the project already has.
 * The package manager comes from the lockfile, then the invoking user agent, `null` when unknown.
 */
export function detect(snapshot: Snapshot): Detection {
  const lockfilePackageManager = Object.entries(LOCKFILES).find(([name]) =>
    snapshot.lockfiles.includes(name),
  )?.[1]

  const packageManager =
    lockfilePackageManager ??
    Object.values(PACKAGE_MANAGER).find((name) => snapshot.userAgent?.startsWith(`${name}/`)) ??
    null

  const frontend = (Object.keys(FRONTEND_FRAMEWORKS) as Framework[]).filter((name) =>
    FRONTEND_FRAMEWORKS[name].every((dependency) => snapshot.dependencies.includes(dependency)),
  )

  const backend = BACKEND_LIBRARIES.some((library) =>
    snapshot.productionDependencies.includes(library),
  )
    ? (['node'] as const)
    : []

  const frameworks: FrameworkCandidate[] = [...frontend, ...backend]

  const addons = (Object.keys(ADDONS) as Addon[]).filter(
    (name) =>
      ADDONS[name].every((dependency) => snapshot.dependencies.includes(dependency)) &&
      isAddonAvailable(name, frontend[0] ?? null),
  )

  const toolchain =
    (Object.keys(TOOLCHAIN_CONFIG_PATHS) as Toolchain[]).find((name) =>
      TOOLCHAIN_CONFIG_PATHS[name].some((path) => snapshot.existingFiles.includes(path)),
    ) ?? null

  return { addons, frameworks, packageManager, toolchain }
}
