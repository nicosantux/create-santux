import { select } from '@clack/prompts'

import { FRAMEWORKS } from '../constants/frameworks.js'

import { handleCancelPrompt } from './handle-cancel-prompt.js'

export async function getFramework() {
  return handleCancelPrompt(
    await select({
      message: 'Which generator do you want to run?',
      options: FRAMEWORKS.map((framework) => ({
        label: framework.charAt(0).toUpperCase() + framework.slice(1),
        value: framework,
      })),
    }),
  )
}
