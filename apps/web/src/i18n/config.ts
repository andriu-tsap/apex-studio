export const locales = ['pl', 'en', 'ua'] as const;
export type Locale = (typeof locales)[number];
export const htmlLanguages = { pl: 'pl', en: 'en', ua: 'uk' } as const;
export function isLocale(value: string): value is Locale {
  return locales.some((locale) => locale === value);
}
