import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "King of Hyperliquid — Vote the best front-end",
  description:
    "44 Hyperliquid front-ends and wallets. One winner. Cast your vote.",
  openGraph: {
    title: "King of Hyperliquid — Vote the best front-end",
    description:
      "44 Hyperliquid front-ends and wallets. One winner. Cast your vote.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "King of Hyperliquid — Vote the best front-end",
    description:
      "44 Hyperliquid front-ends and wallets. One winner. Cast your vote.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} antialiased`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
