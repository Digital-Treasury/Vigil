import './globals.css';
import type { Metadata } from 'next';
import { APP_NAME, APP_TAGLINE } from '@vigil/core';

export const metadata: Metadata = {
  title: APP_NAME,
  description: `${APP_NAME} — ${APP_TAGLINE}`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
