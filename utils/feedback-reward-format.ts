export function dateLabel(date: string, includeTime = false, language: "id" | "en" = "en") {
  return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "UTC",
  }).format(new Date(includeTime ? date : `${date}T00:00:00Z`));
}
