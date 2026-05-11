import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter is the de-facto SaaS typeface - clean at every weight, ships from
// Google Fonts as a single variable file via next/font, no CLS.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SecureShare - Secure document delivery",
  description:
    "Upload documents, send tokenised secure links, and revoke access whenever you need to.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} scroll-smooth`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
