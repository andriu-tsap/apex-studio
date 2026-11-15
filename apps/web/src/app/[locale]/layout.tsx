import { notFound } from 'next/navigation';
import { Document } from '@/components/document';
import { isLocale, htmlLanguages } from '@/i18n/config';
export { metadata, viewport } from '@/components/document';
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <Document language={htmlLanguages[locale]}>{children}</Document>;
}
