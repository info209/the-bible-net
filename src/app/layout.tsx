import "./globals.css"
import ClientLayout from "./ClientLayout";
import { Metadata } from "next";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "The Bible Net",
  description: "Read and explore the Bible",
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
          <ClientLayout>
            {children}
          </ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
