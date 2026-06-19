export function getLocalTime(timezone: string): { date: Date; formatted: string } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  return {
    date: now,
    formatted: formatter.format(now),
  };
}

export function formatLocalTime(timezone: string): string {
  const { formatted } = getLocalTime(timezone);
  return formatted;
}

export function toUTC(dateStr: string, timezone: string): string {
  const date = new Date(dateStr);
  const utc = date.toISOString();
  return utc;
}

export function toLocalTime(isoString: string, timezone: string): string {
  const date = new Date(isoString);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  return formatter.format(date);
}
