import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

// Can be imported from a shared config
const locales = ['en', 'es', 'hi'];

export default getRequestConfig(async ({ locale }) => {
    // Validate that the incoming `locale` parameter is valid
    if (!locales.includes(locale as any)) {
        // If locale is invalid, fallback to default 'en'
        // This can happen if middleware allowed a locale through but it's not in our list
        console.warn(`Invalid locale '${locale}' requested. Falling back to 'en'.`);
        locale = 'en';
    }

    return {
        // Import messages from top-level messages directory
        // ../../messages because we are in src/i18n/request.ts
        messages: (await import(`../../messages/${locale}.json`)).default
    };
});
