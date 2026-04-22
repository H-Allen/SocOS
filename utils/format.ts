const DEFAULT_LOCALE = "en-GB";

export function formatDate(date: Date | string | null | undefined, locale = DEFAULT_LOCALE) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string | null | undefined, locale = DEFAULT_LOCALE) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
}

export function truncateText(value: string, maxLength = 120) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

export function formatRelativeTime(date: Date | string | null | undefined, locale = DEFAULT_LOCALE) {
  if (!date) {
    return "";
  }

  const targetDate = new Date(date);
  const diffInSeconds = Math.round((targetDate.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const intervals = [
    { unit: "year", seconds: 60 * 60 * 24 * 365 },
    { unit: "month", seconds: 60 * 60 * 24 * 30 },
    { unit: "week", seconds: 60 * 60 * 24 * 7 },
    { unit: "day", seconds: 60 * 60 * 24 },
    { unit: "hour", seconds: 60 * 60 },
    { unit: "minute", seconds: 60 },
    { unit: "second", seconds: 1 }
  ] as const;

  for (const interval of intervals) {
    if (Math.abs(diffInSeconds) >= interval.seconds || interval.unit === "second") {
      return rtf.format(Math.round(diffInSeconds / interval.seconds), interval.unit);
    }
  }

  return "";
}

export function formatLongDate(date: Date | string | null | undefined, locale = DEFAULT_LOCALE) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(date));
}

export function getTimeBasedGreeting(date = new Date()) {
  const hour = date.getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}
