import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Ambient Music",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
