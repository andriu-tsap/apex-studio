import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LocaleProvider } from '@/components/locale-provider';
import { Home } from '@/components/home';
import { locales, isLocale } from '@/i18n/config';
import { messages } from '@/i18n/messages';
export const dynamicParams = false;
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = messages[locale];
  return {
    title: t.seoTitle,
    description: t.seoDescription,
    alternates: {
      canonical: `/${locale}/`,
      languages: { pl: '/pl/', en: '/en/', uk: '/ua/', 'x-default': '/pl/' },
    },
    openGraph: {
      title: t.seoTitle,
      description: t.seoDescription,
      locale: locale === 'ua' ? 'uk_UA' : locale === 'pl' ? 'pl_PL' : 'en_GB',
    },
  };
}
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <LocaleProvider locale={locale === 'ua' ? 'uk' : locale} messages={messages[locale]}>
      <Home locale={locale} />
    </LocaleProvider>
  );
}
