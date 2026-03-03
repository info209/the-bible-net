import { getRequestConfig } from 'next-intl/server';

// Supported locales
const locales = ['en', 'es', 'hi'] as const;
type Locale = typeof locales[number];

export default getRequestConfig(async ({ locale }) => {
    // Ensure we ALWAYS return a string
    const validLocale: Locale =
        locale && locales.includes(locale as Locale)
            ? (locale as Locale)
            : 'en';

    return {
        locale: validLocale, // ✅ always string
        messages: (await import(`../../messages/${validLocale}.json`)).default
    };
});