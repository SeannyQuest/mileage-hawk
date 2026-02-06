/**
 * Timezone-aware quiet hours service
 * Checks if the current time in a user's timezone falls within their configured quiet hours
 */

/**
 * Get the current hour (0-23) in the given IANA timezone.
 * Falls back to UTC if timezone is invalid.
 */
export function getCurrentHourInTimezone(timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const hourPart = parts.find((p) => p.type === "hour");
    return parseInt(hourPart?.value ?? "0", 10);
  } catch {
    console.warn(`[QuietHours] Invalid timezone "${timezone}", falling back to UTC`);
    return getCurrentHourInTimezone("UTC");
  }
}

/**
 * Pure function: check if a given hour falls within a quiet range.
 * Handles midnight-wrapping (e.g. 22→7 means hour >= 22 OR hour < 7).
 * Returns false if start === end (quiet hours disabled).
 */
export function isHourInQuietRange(hour: number, start: number, end: number): boolean {
  if (start === end) return false; // disabled
  if (start > end) {
    // Wraps midnight: e.g. 22→7
    return hour >= start || hour < end;
  }
  // Normal range: e.g. 1→6
  return hour >= start && hour < end;
}

/**
 * Check if the current time in the user's timezone is within their quiet hours.
 * Returns false (= allow notifications) if any field is null/undefined.
 */
export function isInQuietHours(
  timezone?: string | null,
  quietHoursStart?: number | null,
  quietHoursEnd?: number | null
): boolean {
  if (!timezone || quietHoursStart == null || quietHoursEnd == null) {
    return false; // no quiet hours configured → always allow
  }
  const currentHour = getCurrentHourInTimezone(timezone);
  return isHourInQuietRange(currentHour, quietHoursStart, quietHoursEnd);
}
