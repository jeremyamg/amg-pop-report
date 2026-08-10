import type { Metadata } from 'next';

// The embed is a chrome-free duplicate of the main report. Keep it out of the
// index so it doesn't compete with the real page for the same queries.
export const metadata: Metadata = {
  title: 'AMG Population Report',
  robots: { index: false, follow: false },
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
