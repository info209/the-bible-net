import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Daily Content Schedule",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
