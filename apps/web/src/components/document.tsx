import type { Metadata, Viewport } from 'next';
import { PWABoot } from './support';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/cyrillic-400.css';
import '@fontsource/inter/cyrillic-500.css';
import '@fontsource/inter/cyrillic-600.css';
import '@fontsource/inter/cyrillic-700.css';
import '@fontsource/space-grotesk/latin-400.css';
import '@fontsource/space-grotesk/latin-700.css';
import '@fontsource/space-grotesk/latin-ext-400.css';
import '@fontsource/space-grotesk/latin-ext-700.css';
import '@fontsource/inter/latin-ext-400.css';
import '@fontsource/inter/latin-ext-500.css';
import '@fontsource/inter/latin-ext-600.css';
import '@fontsource/inter/latin-ext-700.css';
import '@apex/ui/tokens.css';
import '@/app/globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  applicationName: 'APEX Studio',
  manifest: (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/manifest.webmanifest',
  title: 'APEX Studio — Concept / demo project',
  description: 'An interactive automotive studio concept by Andrii Tsap.',
  icons: { icon: (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/favicon.svg' },
  openGraph: {
    type: 'website',
    siteName: 'APEX Studio',
    images: [
      {
        url: (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/og.png',
        width: 1200,
        height: 630,
        alt: 'APEX Studio — Concept / demo project',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [(process.env.NEXT_PUBLIC_BASE_PATH || '') + '/og.png'],
  },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0b0f' },
    { media: '(prefers-color-scheme: light)', color: '#f5f7fa' },
  ],
};
const themeScript = `(function(){try{var t=localStorage.getItem('apex-theme');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:'dark'}catch(e){document.documentElement.dataset.theme='dark'}})()`;
export function Document({ children, language }: { children: React.ReactNode; language: string }) {
  return (
    <html lang={language} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'CreativeWork',
              name: 'APEX Studio — Concept / demo project',
              author: {
                '@type': 'Person',
                name: 'Andrii Tsap',
                url: 'https://github.com/andriu-tsap',
              },
              about: {
                '@type': 'LocalBusiness',
                name: 'APEX Studio — fictional demo business',
                description:
                  'Portfolio concept. No actual services, customers, reviews or physical business location are claimed.',
              },
            }),
          }}
        />
        {children}
        <PWABoot />
      </body>
    </html>
  );
}
