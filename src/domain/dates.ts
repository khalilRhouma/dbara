// Date helpers. All dates are local time, written as "YYYY-MM-DD".
// We never use `new Date("YYYY-MM-DD")` (that is UTC); we build dates from parts.

export type SeasonNow = 'winter' | 'summer' | 'neutral'

/** Local date of `d` as "YYYY-MM-DD". */
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Calendar days from `from` to `to` (positive if `to` is later). DST-safe: uses UTC midnights. */
export function daysBetween(from: string, to: string): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000)
}

/** Winter: Nov–Mar. Summer: Jun–Sep. Other months (Apr, May, Oct) are neutral. */
export function seasonOf(now: Date): SeasonNow {
  const month = now.getMonth() + 1
  if (month >= 11 || month <= 3) return 'winter'
  if (month >= 6 && month <= 9) return 'summer'
  return 'neutral'
}

/** Days since the most recent market day (0 = today is market day). `marketDay`: 0 = Sunday. */
export function daysSinceMarketDay(now: Date, marketDay: number): number {
  return (now.getDay() - marketDay + 7) % 7
}
