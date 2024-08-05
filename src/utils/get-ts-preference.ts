import { confirm } from '@clack/prompts'

import { handleCancelPrompt } from './handle-cancel-prompt.js'

/**
 * Prompts the user to select whether they want to use TypeScript or not.
 */
export async function getTsPreference() {
  return handleCancelPrompt(
    await confirm({
      message: 'Does your project use TypeScript?',
      initialValue: true,
    }),
  )
}
