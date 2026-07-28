export type SupportedLocale = 'en' | 'es' | 'hi' | string;

export function getRelativeTime(
  date: Date | string | number | null | undefined,
  locale: SupportedLocale = 'en'
): string {
  if (!date) return '';

  const past = new Date(date);
  if (isNaN(past.getTime())) return '';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  const lang = (locale || 'en').toLowerCase().split('-')[0];

  // Future timestamps or less than 2 seconds ago
  if (diffInSeconds < 2) {
    if (lang === 'es') return 'Justo ahora';
    if (lang === 'hi') return 'अभी';
    return 'Just now';
  }

  // Seconds (< 60s)
  if (diffInSeconds < 60) {
    if (lang === 'es') return `hace ${diffInSeconds} segundo${diffInSeconds === 1 ? '' : 's'}`;
    if (lang === 'hi') return `${diffInSeconds} सेकंड पहले`;
    return `${diffInSeconds} second${diffInSeconds === 1 ? '' : 's'} ago`;
  }

  // Minutes (< 60m)
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    if (lang === 'es') return `hace ${diffInMinutes} minuto${diffInMinutes === 1 ? '' : 's'}`;
    if (lang === 'hi') return `${diffInMinutes} मिनट पहले`;
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  }

  // Hours (< 24h)
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    if (lang === 'es') return `hace ${diffInHours} hora${diffInHours === 1 ? '' : 's'}`;
    if (lang === 'hi') return `${diffInHours} घंट${diffInHours === 1 ? 'ा' : 'े'} पहले`;
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  }

  // Days (< 7d)
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    if (lang === 'es') return 'Ayer';
    if (lang === 'hi') return 'कल';
    return 'Yesterday';
  }
  if (diffInDays < 7) {
    if (lang === 'es') return `hace ${diffInDays} días`;
    if (lang === 'hi') return `${diffInDays} दिन पहले`;
    return `${diffInDays} days ago`;
  }

  // Weeks (< 30d)
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInDays < 30) {
    if (lang === 'es') return `hace ${diffInWeeks} semana${diffInWeeks === 1 ? '' : 's'}`;
    if (lang === 'hi') return `${diffInWeeks} सप्ताह पहले`;
    return `${diffInWeeks} week${diffInWeeks === 1 ? '' : 's'} ago`;
  }

  // Months (< 365d)
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInDays < 365) {
    if (lang === 'es') return `hace ${diffInMonths} me${diffInMonths === 1 ? 's' : 'ses'}`;
    if (lang === 'hi') return `${diffInMonths} महीने पहले`;
    return `${diffInMonths} month${diffInMonths === 1 ? '' : 's'} ago`;
  }

  // Years (>= 365d)
  const diffInYears = Math.floor(diffInDays / 365);
  if (lang === 'es') return `hace ${diffInYears} año${diffInYears === 1 ? '' : 's'}`;
  if (lang === 'hi') return `${diffInYears} साल पहले`;
  return `${diffInYears} year${diffInYears === 1 ? '' : 's'} ago`;
}

/**
 * Returns the recommended timer delay in milliseconds for updating the relative time display.
 */
export function getNextUpdateDelay(date: Date | string | number | null | undefined): number {
  if (!date) return 60000;
  const past = new Date(date);
  if (isNaN(past.getTime())) return 60000;

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return 1000; // Update every second for < 1m
  if (diffInSeconds < 3600) return 60000; // Update every minute for < 1h
  if (diffInSeconds < 86400) return 3600000; // Update every hour for < 24h
  return 86400000; // Update daily for > 24h
}

