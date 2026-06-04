import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Sub-Admins",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
