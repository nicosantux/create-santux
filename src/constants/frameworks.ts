export const FRAMEWORKS = ['next', 'react'] as const

export type Framework = (typeof FRAMEWORKS)[number]
