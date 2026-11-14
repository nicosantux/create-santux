import type { Toolchain } from '../core/types.js'

import { cancel, log, spinner as createSpinner, taskLog } from '@clack/prompts'

import { detect } from '../core/detect.js'
import { NO_PACKAGE_JSON_ERROR, plan } from '../core/plan.js'
import { applyEdits, installDependencies } from '../io/apply-plan.js'
import { fetchPackageManagerVersion, fetchToolchainMetadata } from '../io/fetch-metadata.js'
import { fetchNodeLts } from '../io/fetch-node-lts.js'
import { inspectProject } from '../io/inspect-project.js'
import { showIntro, showOutro } from '../ui/intro-outro.js'
import { confirmPlan, promptPackageManager, promptStack, promptToolchain } from '../ui/prompts.js'
import { renderNextSteps, renderPlan } from '../ui/render-plan.js'

export interface InitOptions {
  alias?: boolean
  dryRun?: boolean
  toolchain?: Toolchain
  yes?: boolean
}

export async function init({ alias = true, dryRun, toolchain: toolchainOption, yes }: InitOptions) {
  const cwd = process.cwd()

  await showIntro()

  try {
    const snapshot = await inspectProject(cwd)

    if (!snapshot.hasPackageJson) {
      log.error(NO_PACKAGE_JSON_ERROR)

      process.exit(1)
    }

    const detection = detect(snapshot)
    const packageManager = detection.packageManager ?? (yes ? 'npm' : await promptPackageManager())

    const detectedToolchain = detection.toolchain ?? 'oxc'

    const toolchain =
      toolchainOption ?? (yes ? detectedToolchain : await promptToolchain(detectedToolchain))

    const { addons, framework } = yes
      ? {
          addons: detection.addons,
          framework: detection.frameworks.find((name) => name !== 'node') ?? null,
        }
      : await promptStack(detection.frameworks, detection.addons)

    const spinner = createSpinner()

    spinner.start('Resolving versions')

    const [metadata, nodeLts, packageManagerVersion] = await Promise.all([
      fetchToolchainMetadata(toolchain, packageManager, cwd),
      fetchNodeLts(),
      fetchPackageManagerVersion(packageManager, cwd),
    ]).catch((error: unknown) => {
      spinner.error('Failed to resolve versions')

      throw error
    })

    spinner.stop('Versions resolved')

    const result = plan(
      snapshot,
      { addons, alias, framework, packageManager, toolchain },
      metadata,
      { nodeLts, nodeVersion: process.version, packageManagerVersion },
    )

    if (result.errors.length > 0) {
      for (const error of result.errors) log.error(error)

      process.exit(1)
    }

    renderPlan(result)

    if (dryRun || result.operations.length === 0) {
      renderNextSteps(result.manualSteps)
      showOutro(dryRun ? 'Dry run, nothing written' : 'Bye 👋')

      return
    }

    if (!yes && !(await confirmPlan())) {
      cancel('santux aborted')

      return
    }

    spinner.start('Updating project files')
    await applyEdits(result, cwd, packageManager).catch((error: unknown) => {
      spinner.error('Failed to update project files')

      throw error
    })
    spinner.stop('Project files updated')

    const install = taskLog({ title: 'Installing dependencies', limit: 8 })

    try {
      await installDependencies(result, cwd, packageManager, (line) => {
        install.message(line)
      })
    } catch (error) {
      install.error('Failed to install dependencies')

      throw error
    }

    install.success('Dependencies installed')

    renderNextSteps(result.manualSteps)
    showOutro('Done ✨')
  } catch (error) {
    cancel(error instanceof Error ? error.message : String(error))

    process.exit(1)
  }
}
