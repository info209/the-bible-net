import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Manage Daily Content",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
