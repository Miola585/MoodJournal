export function selectDailyActivities(groups, dateKey) {
  const dayNumber = dateKeyToDayNumber(dateKey);

  return groups.flatMap((group) => {
    if (!Array.isArray(group) || group.length === 0) return [];
    return [group[positiveModulo(dayNumber, group.length)]];
  });
}

export function selectFeaturedDailyActivity(activities, dateKey) {
  if (!Array.isArray(activities) || activities.length === 0) return null;
  return activities[positiveModulo(dateKeyToDayNumber(dateKey), activities.length)];
}

function dateKeyToDayNumber(dateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) throw new TypeError('Expected a local date key in YYYY-MM-DD format.');

  const [, year, month, day] = match.map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);

  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) {
    throw new RangeError('Expected a valid local calendar date.');
  }

  return Math.floor(timestamp / 86400000);
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}
