import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Downloads & Offline',
  description: 'Manage downloaded Bible versions and offline storage',
};

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
