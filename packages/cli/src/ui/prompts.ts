import type {
  Addon,
  Framework,
  FrameworkCandidate,
  PackageManager,
  Toolchain,
} from '../core/types.js'

import { cancel, confirm, isCancel, multiselect, select } from '@clack/prompts'

import { ADDONS, FRONTEND_FRAMEWORKS } from '../constants/frameworks.js'
import { PACKAGE_MANAGER } from '../constants/package-manager.js'
import { isAddonAvailable } from '../core/detect.js'

function unwrap<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel('santux aborted')

    process.exit(0)
  }

  return value as T
}

export async function promptPackageManager() {
  return unwrap<PackageManager>(
    await select<PackageManager>({
      message: 'Which package manager do you want to use?',
      options: Object.values(PACKAGE_MANAGER).map((value) => ({ label: value, value })),
    }),
  )
}

const TOOLCHAIN_LABELS: Record<Toolchain, string> = {
  oxc: 'oxlint + oxfmt',
  eslint: 'ESLint + Prettier',
}

export async function promptToolchain(initialValue: Toolchain) {
  return unwrap<Toolchain>(
    await select<Toolchain>({
      message: 'Which toolchain do you want to use?',
      options: (Object.keys(TOOLCHAIN_LABELS) as Toolchain[]).map((value) => ({
        label: TOOLCHAIN_LABELS[value],
        value,
      })),
      initialValue,
    }),
  )
}

export async function confirmPlan() {
  return unwrap<boolean>(await confirm({ message: 'Apply these changes?' }))
}

const FRAMEWORK_LABELS: Record<Framework, string> = {
  next: 'Next.js',
  'tanstack-start': 'TanStack Start',
  astro: 'Astro',
  'react-vite': 'React + Vite',
}

const ADDON_LABELS: Record<Addon, string> = {
  tailwind: 'Tailwind CSS',
  react: 'React (Astro islands)',
}

/**
 * Asks which Framework and Add-ons to apply, with the detected ones preselected.
 * A `null` Framework applies the base layer alone.
 */
export async function promptStack(candidates: FrameworkCandidate[], detectedAddons: Addon[]) {
  const frameworks = Object.keys(FRONTEND_FRAMEWORKS) as Framework[]
  const detected = frameworks.find((name) => candidates.includes(name)) ?? null

  const framework = unwrap<Framework | null>(
    await select<Framework | null>({
      message: 'Which framework does the project use?',
      options: [
        ...frameworks.map((value) => ({
          label: FRAMEWORK_LABELS[value],
          value,
          ...(value === detected && { hint: 'detected' }),
        })),
        { label: 'None', value: null, hint: 'base layer only' },
      ],
      initialValue: detected,
    }),
  )

  const available = (Object.keys(ADDONS) as Addon[]).filter((name) =>
    isAddonAvailable(name, framework),
  )

  if (available.length === 0) return { addons: [], framework }

  const addons = unwrap<Addon[]>(
    await multiselect<Addon>({
      message: 'Which add-ons does the project use?',
      options: available.map((value) => ({
        label: ADDON_LABELS[value],
        value,
        ...(detectedAddons.includes(value) && { hint: 'detected' }),
      })),
      initialValues: available.filter((name) => detectedAddons.includes(name)),
      required: false,
    }),
  )

  return { addons, framework }
}
