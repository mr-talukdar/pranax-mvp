import type { ReactNode } from 'react';
import './styles.css';
import { AppSessionProvider } from '../components/shell/AppSessionProvider';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'PranaX | Studio Management Software for Pilates & Yoga',
    template: '%s | PranaX',
  },
  description:
    'Manage studio members, attendance, memberships, and retention signals in one workspace built for Pilates, yoga, and boutique fitness teams.',
  applicationName: 'PranaX',
  openGraph: {
    type: 'website',
    siteName: 'PranaX',
    title: 'PranaX | Studio Management Software for Pilates & Yoga',
    description:
      'A practical workspace for boutique fitness studios to manage members, attendance, memberships, and retention signals.',
  },
  twitter: {
    card: 'summary',
    title: 'PranaX | Studio Management Software for Pilates & Yoga',
    description:
      'A practical workspace for boutique fitness studios to manage members, attendance, memberships, and retention signals.',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface font-sans text-on-surface antialiased min-h-screen">
        <AppSessionProvider>{children}</AppSessionProvider>
      </body>
    </html>
  );
}
