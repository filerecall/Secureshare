import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Plus Jakarta Sans matches the marketing site at filerecall.com - a
// modern, slightly rounded sans that reads as friendly + professional.
// Ships as a single variable font via next/font, no CLS.
const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "FileRecall - Secure document delivery",
  description:
    "Upload documents, send tokenised secure links, and revoke access whenever you need to.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} scroll-smooth`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
