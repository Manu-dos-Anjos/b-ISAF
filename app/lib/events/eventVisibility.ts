export function isEventDateExpired(
  dateStart: string | null,
  dateEnd: string | null,
  now = new Date()
): boolean {
  const lastDate = dateEnd ?? dateStart;
  if (!lastDate) return false;

  const endExclusive = new Date(`${lastDate}T00:00:00`);
  if (Number.isNaN(endExclusive.getTime())) return false;

  endExclusive.setDate(endExclusive.getDate() + 1);
  return now.getTime() >= endExclusive.getTime();
}