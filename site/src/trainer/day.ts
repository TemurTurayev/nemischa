const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

/** Day number in the learner's own time zone, so a "day" ends at their midnight. */
export function localDay(now: Date): number {
  return Math.floor((now.getTime() - now.getTimezoneOffset() * MS_PER_MINUTE) / MS_PER_DAY);
}
