import { intro, log, outro } from '@clack/prompts'
import colors from 'picocolors'

export function showIntro() {
  intro(colors.inverse('    create-santux    '))
  log.warn(
    `create-santux is deprecated and no longer maintained. It was renamed to ${colors.bold('santux')}, which applies the tooling to an existing project: ${colors.cyan('npx santux init')}`,
  )
}

export function showOutro() {
  outro(colors.inverse('    Bye 👋    '))
}
