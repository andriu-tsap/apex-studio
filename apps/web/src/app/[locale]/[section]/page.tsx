import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductPage } from '@/components/product-pages';
import { sections, type Section } from '@/i18n/sections';
import { isLocale, locales } from '@/i18n/config';
import { productText } from '@/i18n/product';
export const dynamicParams = false;
export function generateStaticParams() {
  return locales.flatMap((locale) => sections.map((section) => ({ locale, section })));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; section: string }>;
}): Promise<Metadata> {
  const { locale, section } = await params;
  if (!isLocale(locale)) return {};
  const keys = {
    booking: 'booking',
    shop: 'shop',
    account: 'account',
    journal: 'journal',
    projects: 'projects',
    'under-the-hood': 'tech',
  } as const;
  const key = keys[section as Section];
  return {
    title: `APEX Studio — ${productText[locale][key]} · Demo`,
    alternates: { canonical: `/${locale}/${section}/` },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; section: string }>;
}) {
  const { locale, section } = await params;
  if (!isLocale(locale) || !sections.some((s) => s === section)) notFound();
  return <ProductPage locale={locale} section={section as Section} />;
}
