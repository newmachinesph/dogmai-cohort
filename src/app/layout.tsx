import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Providers } from "./providers";
import "./globals.css";

// Raveo Variable Font - Primary sans-serif font
const raveo = localFont({
  src: "../../public/fonts/variable/RaveoVF.woff2",
  variable: "--font-raveo",
  display: "swap",
  weight: "100 900",
});

// Geist Mono - Monospace font for code
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "DOGM.AI Cohort",
    template: "%s | DOGM.AI Cohort",
  },
  description: "Cohort Management Platform for DOGM.AI Bootcamp - The Philippines' First AI-Native Coding Bootcamp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${raveo.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
