import { styleText } from 'node:util'

import { intro, outro } from '@clack/prompts'

const BANNER = ['┏━┓┏━┓┏┓╻╺┳╸╻ ╻╻ ╻', '┗━┓┣━┫┃┗┫ ┃ ┃ ┃┏╋┛', '┗━┛╹ ╹╹ ╹ ╹ ┗━┛╹ ╹']

// Catppuccin blue -> lavender -> mauve -> flamingo -> rosewater
const MOCHA_GRADIENT = [
  [137, 180, 250],
  [180, 190, 254],
  [203, 166, 247],
  [242, 205, 205],
  [245, 224, 220],
]

const LATTE_GRADIENT = [
  [30, 102, 245],
  [114, 135, 253],
  [136, 57, 239],
  [221, 120, 120],
  [220, 138, 120],
]

const BACKGROUND_QUERY_TIMEOUT_MS = 150

const hasColor = process.stdout.isTTY && process.stdout.hasColors(2 ** 24)

/** Asks the terminal for its background color (OSC 11) and resolves `true` when it is light. */
function isLightTerminal() {
  const { stdin, stdout } = process

  if (!stdin.isTTY || !stdout.isTTY) return Promise.resolve(false)

  return new Promise<boolean>((resolve) => {
    const finish = (isLight: boolean) => {
      clearTimeout(timer)
      stdin.off('data', onData)
      stdin.setRawMode(false)
      stdin.pause()
      resolve(isLight)
    }

    const onData = (data: Buffer) => {
      const match = /rgb:([\da-f]+)\/([\da-f]+)\/([\da-f]+)/i.exec(data.toString())

      if (!match) {
        finish(false)

        return
      }

      const [red = 0, green = 0, blue = 0] = match
        .slice(1)
        .map((hex) => Number.parseInt(hex, 16) / (16 ** hex.length - 1))

      finish(0.2126 * red + 0.7152 * green + 0.0722 * blue > 0.5)
    }

    const timer = setTimeout(() => finish(false), BACKGROUND_QUERY_TIMEOUT_MS)

    stdin.setRawMode(true)
    stdin.on('data', onData)
    stdout.write('\x1b]11;?\x07')
  })
}

function colorAt(gradient: number[][], position: number) {
  const scaled = position * (gradient.length - 1)
  const index = Math.min(Math.floor(scaled), gradient.length - 2)
  const ratio = scaled - index
  const start = gradient[index] ?? []
  const end = gradient[index + 1] ?? []

  return start.map((channel, i) => Math.round(channel + ((end[i] ?? channel) - channel) * ratio))
}

function gradientLine(line: string, gradient: number[][]) {
  const chars = Array.from(line)

  const colored = chars.map((char, index) => {
    const [red, green, blue] = colorAt(gradient, index / Math.max(chars.length - 1, 1))

    return `\x1b[38;2;${String(red)};${String(green)};${String(blue)}m${char}`
  })

  return `${colored.join('')}\x1b[39m`
}

export async function showIntro() {
  const gradient = hasColor && ((await isLightTerminal()) ? LATTE_GRADIENT : MOCHA_GRADIENT)
  const lines = gradient ? BANNER.map((line) => gradientLine(line, gradient)) : BANNER

  intro(lines.join(`\n${styleText('gray', '│')}  `))
}

export function showOutro(message = 'Bye 👋') {
  outro(styleText('inverse', `    ${message}    `))
}
