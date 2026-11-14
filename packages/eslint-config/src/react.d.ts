import type { Config } from 'eslint/config'

export declare function reactConfig(
  globals: Record<string, boolean | 'readonly' | 'writable' | 'off'>,
  extraExtends?: Config[],
): Config
