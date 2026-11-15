import type { Metadata } from 'next';
import { LocaleProvider } from '@/components/locale-provider';
import { Home } from '@/components/home';
import { messages } from '@/i18n/messages';
export const metadata: Metadata = {
  title: messages.pl.seoTitle,
  description: messages.pl.seoDescription,
  alternates: { canonical: '/pl/', languages: { pl: '/pl/', en: '/en/', uk: '/ua/' } },
};
export default function Page() {
  return (
    <LocaleProvider locale="pl" messages={messages.pl}>
      <Home locale="pl" />
    </LocaleProvider>
  );
}
