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
