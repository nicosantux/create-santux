import { intro, outro } from '@clack/prompts'
import colors from 'picocolors'

export function showIntro() {
  intro(colors.inverse('    create-santux    '))
}

export function showOutro() {
  outro(colors.inverse('    Bye 👋    '))
}
