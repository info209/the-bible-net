import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Bible Versions",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
