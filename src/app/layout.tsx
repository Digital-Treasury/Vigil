import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vigil — Digital Treasury',
  description: 'Visual & code regression testing for the Digital Treasury fleet',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
