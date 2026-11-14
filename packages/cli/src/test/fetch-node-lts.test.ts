import { afterEach, expect, it, vi } from 'vitest'

import { fetchNodeLts } from '../io/fetch-node-lts.js'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

it('returns the latest LTS security release published at least a day ago', async () => {
  vi.useFakeTimers({ now: new Date('2026-11-13T12:00:00Z'), toFake: ['Date'] })

  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Response.json([
        { version: 'v27.0.0', date: '2026-11-01', lts: false, security: true },
        { version: 'v26.13.3', date: '2026-11-12', lts: 'Lithium', security: true },
        { version: 'v26.13.2', date: '2026-11-11', lts: 'Lithium', security: false },
        { version: 'v26.13.1', date: '2026-11-10', lts: 'Lithium', security: true },
        { version: 'v26.13.0', date: '2026-10-28', lts: 'Lithium', security: true },
      ]),
    ),
  )

  expect(await fetchNodeLts()).toBe('26.13.1')
})

it('returns null when the fetch fails', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new Error('offline'))),
  )

  expect(await fetchNodeLts()).toBeNull()
})
