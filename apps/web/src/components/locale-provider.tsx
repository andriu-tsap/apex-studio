'use client';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
export function LocaleProvider({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: Record<string, string>;
  children: ReactNode;
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Warsaw">
      {children}
    </NextIntlClientProvider>
  );
}
