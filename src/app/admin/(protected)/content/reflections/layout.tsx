import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Daily Reflections",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
