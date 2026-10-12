export function millisecondsUntilNextMinute(now: Date): number {
  return 60_000 - now.getSeconds() * 1000 - now.getMilliseconds()
}
