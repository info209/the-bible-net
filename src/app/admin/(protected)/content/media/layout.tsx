import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Media Gallery",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
