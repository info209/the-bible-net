/**
 * Helper to compute user initials:
 * - First + Last name -> first letter of First Name + first letter of Last Name (e.g. "Shardul Singh" -> "SS")
 * - If only one name exists, show its first initial (e.g. "Shardul" -> "S")
 * - Fallback to full name split or email initial
 */
export function getUserInitials(user?: any): string {
  if (!user) return '';

  // 1. Try firstName and/or lastName
  const first = (user.firstName || '').trim();
  const last = (user.lastName || '').trim();
  if (first || last) {
    const fChar = first ? first[0] : '';
    const lChar = last ? last[0] : '';
    return `${fChar}${lChar}`.toUpperCase();
  }

  // 2. Fallback to name property (e.g., full name string from OAuth / Session)
  const name = (user.name || '').trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    if (parts.length === 1) {
      return parts[0][0].toUpperCase();
    }
  }

  // 3. Fallback to email
  const email = (user.email || '').trim();
  if (email) {
    return email[0].toUpperCase();
  }

  return '';
}
