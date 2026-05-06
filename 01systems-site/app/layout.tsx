import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
title: "01 Systems — Decision Flow Simulation",
  description: "Decision-flow simulation engine",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header style={{
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <Image
            className="site-logo"
            src="/images/Logo-01.svg"
            alt="01 Systems"
            width={180}
            height={52}
            priority
          />
        </header>
        {children}

        <footer
          style={{
            marginTop: "60px",
            padding: "24px 20px",
            borderTop: "1px solid #eee",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Image
            className="site-logo"
            src="/images/Logo-01.svg"
            alt="01 Systems"
            width={160}
            height={46}
          />
        </footer>

        <Analytics />
      </body>
    </html>
  );
}
