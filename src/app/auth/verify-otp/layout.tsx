import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Verify OTP",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
