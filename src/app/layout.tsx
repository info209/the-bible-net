import "./globals.css"
import ClientLayout from "./ClientLayout";
import { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
import { ToastProvider } from "@/context/ToastContext";
import { ConfirmProvider } from "@/context/ConfirmContext";

export const metadata: Metadata = {
  title: {
    default: "The Bible Net",
    template: "%s | The Bible Net",
  },
  description: "Read and explore the Bible",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.svg",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "The Bible Net",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#006a6f',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <ToastProvider>
            <ConfirmProvider>
              <ClientLayout>
                {children}
              </ClientLayout>
            </ConfirmProvider>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
