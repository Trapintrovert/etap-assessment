/**
 * Nigerian phone format: +234XXXXXXXXXX or 0XXXXXXXXXX (10 digits after prefix).
 * Normalizes to +234XXXXXXXXXX for consistent storage and uniqueness checks.
 */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith('0')) {
    return '+234' + trimmed.slice(1);
  }
  if (trimmed.startsWith('+234')) {
    return trimmed;
  }
  return trimmed;
}
