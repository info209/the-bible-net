import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Legal Policies",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
