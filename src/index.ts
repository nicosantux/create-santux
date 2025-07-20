#!/usr/bin/env node

import { Command } from '@commander-js/extra-typings'

import pkgJson from '../package.json' with { type: 'json' }

import { createProject } from './generators/create-project.js'
import { showIntro, showOutro } from './utils/intro-outro.js'

const program = new Command('create-santux')
  .description('Generators for bootstrapping your project configurations.')
  .version(pkgJson.version)
  .action(async () => {
    showIntro()
    await createProject()
    showOutro()
  })

program
  .command('react')
  .description('Initialize a React project with Vite')
  .option('--ts, --typescript', 'Initialize the project with TypeScript')
  .option('--no-ts, --no-typescript', 'Initialize the project with JavaScript')
  // TODO: Implement Tailwindcss
  // .option('-tw, --tailwind', 'Use Tailwindcss')
  .action(async ({ typescript }) => {
    showIntro()
    await createProject({ framework: 'react', typescript })
    showOutro()
  })

program
  .command('next')
  .description('Initialize a Next project')
  .option('--ts, --typescript', 'Initialize the project with TypeScript')
  .option('--no-ts, --no-typescript', 'Initialize the project with JavaScript')
  // TODO: Implement Tailwindcss
  // .option('-tw, --tailwind', 'Use Tailwindcss')
  .action(async ({ typescript }) => {
    showIntro()
    await createProject({ framework: 'next', typescript })
    showOutro()
  })

program.parse(process.argv)
