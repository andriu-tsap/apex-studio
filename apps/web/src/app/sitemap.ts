import type { MetadataRoute } from 'next';
import { sections } from '@/i18n/sections';
export const dynamic = 'force-static';
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return ['pl', 'en', 'ua'].flatMap((locale) =>
    ['', ...sections].map((section) => ({
      url: `${base}/${locale}/${section ? section + '/' : ''}`,
      alternates: {
        languages: {
          pl: `${base}/pl/${section ? section + '/' : ''}`,
          en: `${base}/en/${section ? section + '/' : ''}`,
          uk: `${base}/ua/${section ? section + '/' : ''}`,
        },
      },
    })),
  );
}
