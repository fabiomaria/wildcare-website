export type Locale = 'de' | 'en';
export const defaultLocale: Locale = 'de';
export const locales: Locale[] = ['de', 'en'];

export function loc(field: { de?: string; en?: string } | undefined, locale: Locale): string | undefined {
  if (!field) return undefined;
  return field[locale] || (locale === 'de' ? field.de : undefined);
}

export function hasLocale(title: { de?: string; en?: string } | undefined, locale: Locale): boolean {
  if (locale === 'de') return true;
  return !!title?.en;
}

const pageRoutes: Record<string, { de: string; en: string }> = {
  'index': { de: '/', en: '/en/' },
  'team': { de: '/team/', en: '/en/team/' },
  'programm': { de: '/programm/', en: '/en/programme/' },
  'journal': { de: '/journal/', en: '/en/journal/' },
  'mitmachen': { de: '/mitmachen/', en: '/en/join/' },
  'kontakt': { de: '/kontakt/', en: '/en/contact/' },
  'montagskurs': { de: '/montagskurs/', en: '/en/monday-class/' },
  'bewegungsrevolution': { de: '/bewegungsrevolution/', en: '/en/movement-revolution/' },
  'impressum': { de: '/impressum/', en: '/en/imprint/' },
  'datenschutz': { de: '/datenschutz/', en: '/en/privacy/' },
};

export function getLocalizedPath(pageKey: string, locale: Locale): string {
  const route = pageRoutes[pageKey];
  if (!route) return locale === 'de' ? `/${pageKey}/` : `/en/${pageKey}/`;
  return route[locale];
}

export function getAlternatePath(pageKey: string, currentLocale: Locale): string {
  const targetLocale = currentLocale === 'de' ? 'en' : 'de';
  return getLocalizedPath(pageKey, targetLocale);
}
