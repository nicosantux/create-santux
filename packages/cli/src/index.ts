#!/usr/bin/env node

import type { Toolchain } from './core/types.js'

import { Command, Option } from '@commander-js/extra-typings'

import pkgJson from '../package.json' with { type: 'json' }

import { init } from './commands/init.js'
import { TOOLCHAIN_PACKAGE } from './constants/toolchains.js'

const program = new Command('santux')
  .description('Applies an opinionated tooling setup to an existing TypeScript project.')
  .version(pkgJson.version)

program
  .command('init')
  .description('Apply the tooling layer to the project in the current directory')
  .option('--dry-run', 'Print the plan and exit without changing anything')
  .option('--no-alias', 'Skip adding the @/* path alias')
  .addOption(
    new Option('--toolchain <name>', 'Lint and format toolchain to apply').choices(
      Object.keys(TOOLCHAIN_PACKAGE) as Toolchain[],
    ),
  )
  .option('--yes', 'Accept the plan without asking for confirmation')
  .action(init)

program.parse(process.argv)
