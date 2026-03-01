import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CWL Tracker',
  description: 'CWL Alignment & Tracking System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
