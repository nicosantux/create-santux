const DAY = 86_400_000

interface NodeRelease {
  date: string
  lts: string | false
  security: boolean
  version: string
}

/**
 * Latest Node LTS security release from nodejs.org that is at least a day old,
 * or `null` when it can't be fetched.
 */
export async function fetchNodeLts(): Promise<string | null> {
  try {
    const response = await fetch('https://nodejs.org/dist/index.json', {
      signal: AbortSignal.timeout(5000),
    })

    const releases = (await response.json()) as NodeRelease[]

    // `date` has no time, so two days after it guarantees at least a full day since release.
    const release = releases.find(
      ({ date, lts, security }) => lts && security && Date.parse(date) + 2 * DAY <= Date.now(),
    )

    return release?.version.replace(/^v/, '') ?? null
  } catch {
    return null
  }
}
