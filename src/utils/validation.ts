import moment from 'moment-timezone';

const TIMEZONE = 'Europe/Bratislava';

/**
 * Validates and normalizes Slovak phone numbers
 * Accepts: +421912345678, 0912345678, +421 912 345 678, 00421912345678
 * Returns normalized: +421912345678 or null if invalid
 */
export function validateAndNormalizePhone(phone: string): string | null {
  if (!phone) return null;

  // Remove all spaces, dashes, parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Handle different formats
  if (cleaned.startsWith('00421')) {
    cleaned = '+421' + cleaned.slice(5);
  } else if (cleaned.startsWith('0')) {
    // Slovak local format (0912345678)
    cleaned = '+421' + cleaned.slice(1);
  } else if (!cleaned.startsWith('+421')) {
    // Not a Slovak number
    return null;
  }

  // Validate Slovak mobile format: +421 9XX XXX XXX
  const slovakMobileRegex = /^\+421[9]\d{8}$/;
  const slovakLandlineRegex = /^\+421[2-5]\d{8}$/;

  if (slovakMobileRegex.test(cleaned) || slovakLandlineRegex.test(cleaned)) {
    return cleaned;
  }

  return null;
}

/**
 * Validates that the requested date/time is in the future
 * Returns true if the date/time is valid (in the future)
 */
export function validateFutureDateTime(date: string, time?: string): boolean {
  const now = moment.tz(TIMEZONE);

  // If only date is provided, check if it's today or future
  if (!time) {
    const requestedDate = moment.tz(date, 'YYYY-MM-DD', TIMEZONE);
    return requestedDate.isSameOrAfter(now, 'day');
  }

  // If both date and time provided, check exact datetime
  const requestedDateTime = moment.tz(`${date} ${time}`, 'YYYY-MM-DD HH:mm', TIMEZONE);

  // Add 15 minutes buffer (minimum advance booking time)
  const minimumBookingTime = now.clone().add(15, 'minutes');

  return requestedDateTime.isAfter(minimumBookingTime);
}

/**
 * Formats phone number for display
 * +421912345678 -> +421 912 345 678
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone || !phone.startsWith('+421')) return phone;

  // +421 9XX XXX XXX
  return phone.replace(/(\+421)(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');
}