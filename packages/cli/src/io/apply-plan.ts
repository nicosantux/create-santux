import type { Operation, PackageManager, Plan } from '../core/types.js'

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { execa } from 'execa'

const ADD_ARGS: Record<PackageManager, string[]> = {
  bun: ['add', '--dev', '--exact'],
  npm: ['install', '--save-dev', '--save-exact'],
  pnpm: ['add', '--save-dev', '--save-exact'],
  yarn: ['add', '--dev', '--exact'],
}

async function updatePackageJson(
  cwd: string,
  update: (packageJson: Record<string, unknown>) => void,
) {
  const path = join(cwd, 'package.json')
  const raw = await readFile(path, 'utf8')
  const packageJson = JSON.parse(raw) as Record<string, unknown>
  const indent = /^[\t ]+(?=")/m.exec(raw)?.[0] ?? 2

  update(packageJson)

  await writeFile(path, `${JSON.stringify(packageJson, null, indent)}\n`, 'utf8')
}

const setScripts = (cwd: string, scripts: Record<string, string>) =>
  updatePackageJson(cwd, (packageJson) => {
    packageJson.scripts = { ...(packageJson.scripts as Record<string, string>), ...scripts }
  })

/** pnpm fails on unapproved build scripts (e.g. sharp in Next), none of which are needed here. */
const buildArgs = (packageManager: PackageManager) =>
  packageManager === 'pnpm' ? ['--config.strict-dep-builds=false'] : []

type InstallOperation = Extract<Operation, { type: 'add-dev-dependencies' }>

type ReleaseAgeOperation = Extract<Operation, { type: 'set-minimum-release-age' }>

async function applyOperation(
  operation: Exclude<Operation, InstallOperation | ReleaseAgeOperation>,
  cwd: string,
  packageManager: PackageManager,
) {
  switch (operation.type) {
    case 'create-file':
    case 'update-file':
      await mkdir(dirname(join(cwd, operation.path)), { recursive: true })
      await writeFile(join(cwd, operation.path), operation.content, 'utf8')

      return

    case 'set-scripts':
      return setScripts(cwd, operation.scripts)

    case 'delete-file':
      return rm(join(cwd, operation.path), { force: true, recursive: true })

    case 'remove-package-json-key':
      return updatePackageJson(cwd, (packageJson) => {
        Reflect.deleteProperty(packageJson, operation.key)
      })

    case 'set-module-type':
      return updatePackageJson(cwd, (packageJson) => {
        packageJson.type = 'module'
      })

    case 'remove-dependencies':
      await execa(
        packageManager,
        ['remove', ...buildArgs(packageManager), ...operation.dependencies],
        {
          cwd,
        },
      )
  }
}

/**
 * Applies every operation except the dependency install and the minimum release age, in planned order.
 */
export async function applyEdits(plan: Plan, cwd: string, packageManager: PackageManager) {
  for (const operation of plan.operations) {
    if (operation.type === 'add-dev-dependencies' || operation.type === 'set-minimum-release-age') {
      continue
    }

    // eslint-disable-next-line no-await-in-loop -- operations depend on the order they were planned in
    await applyOperation(operation, cwd, packageManager)
  }
}

async function run(command: string, args: string[], cwd: string, onOutput: (line: string) => void) {
  const subprocess = execa(command, args, { all: true, buffer: false, cwd })

  for await (const line of subprocess.iterable({ from: 'all' })) onOutput(line)

  await subprocess
}

/**
 * Installs the planned dependencies, then runs the `prepare` script so husky
 * installs the git hooks. It runs after `applyEdits` so the package manager
 * sees the final `package.json`. Command output is streamed to `onOutput`.
 * The minimum release age is written last, so it can't block a Toolchain
 * package published less than a day ago.
 */
export async function installDependencies(
  plan: Plan,
  cwd: string,
  packageManager: PackageManager,
  onOutput: (line: string) => void,
) {
  const install = plan.operations.find(
    (operation): operation is InstallOperation => operation.type === 'add-dev-dependencies',
  )

  if (install) {
    const packages = Object.entries(install.dependencies).map(
      ([name, version]) => `${name}@${version}`,
    )

    await run(
      packageManager,
      [...ADD_ARGS[packageManager], ...buildArgs(packageManager), ...packages],
      cwd,
      onOutput,
    )
  }

  await run(packageManager, ['run', 'prepare'], cwd, onOutput)

  const releaseAge = plan.operations.find(
    (operation): operation is ReleaseAgeOperation => operation.type === 'set-minimum-release-age',
  )

  if (releaseAge) await writeFile(join(cwd, releaseAge.path), releaseAge.content, 'utf8')
}
