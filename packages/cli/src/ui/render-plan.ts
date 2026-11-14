import type { Operation, Plan } from '../core/types.js'

import { styleText } from 'node:util'

import { box, log, note } from '@clack/prompts'

const create = (text: string) => styleText('green', text)
const update = (text: string) => styleText('yellow', text)
const remove = (text: string) => styleText('red', text)

function describe(operation: Operation) {
  switch (operation.type) {
    case 'create-file':
      return [`${create('create')} ${operation.path}`]

    case 'update-file':
      return [`${update('update')} ${operation.path}`]

    case 'set-minimum-release-age':
      return [`${update('set')} minimum release age in ${operation.path}`]

    case 'set-scripts':
      return [`${update('set')} package.json scripts: ${Object.keys(operation.scripts).join(', ')}`]

    case 'delete-file':
      return [`${remove('remove')} ${operation.path}`]

    case 'remove-package-json-key':
      return [`${remove('remove')} "${operation.key}" from package.json`]

    case 'set-module-type':
      return [`${update('set')} package.json "type": "module"`]

    case 'remove-dependencies':
      return operation.dependencies.map((name) => `${remove('remove')} ${name}`)

    case 'add-dev-dependencies':
      return Object.entries(operation.dependencies).map(
        ([name, version]) => `${create('add')} ${name}${styleText('dim', `@${version}`)}`,
      )
  }
}

export function renderPlan({ operations, warnings }: Plan) {
  if (operations.length === 0) {
    log.success('Nothing to install or change')
  } else {
    box(operations.flatMap((operation) => describe(operation)).join('\n'), 'Plan')
  }

  for (const warning of warnings) log.warn(warning)
}

export function renderNextSteps(steps: string[]) {
  if (steps.length > 0)
    note(steps.map((step, index) => `${String(index + 1)}. ${step}`).join('\n'), 'Next steps')
}
