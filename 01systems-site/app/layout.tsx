import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageProvider } from "@/components/language-context";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";
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
  metadataBase: new URL(SITE_URL),
  title: {
    default: "01 Systems | Decision Space Analytics",
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "01 Systems develops Cascade Engine, software purpose-built for Decision Space Analytics and understanding how decisions reshape future options.",
  applicationName: SITE_NAME,
  keywords: [
    "01 Systems",
    "Cascade Engine",
    "Decision Space Analytics",
    "decision analysis",
    "strategic decision support",
    "scenario analysis",
  ],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "01 Systems | Decision Space Analytics",
    description:
      "01 Systems develops Cascade Engine, software purpose-built for Decision Space Analytics and understanding how decisions reshape future options.",
    locale: "en_US",
    images: [
      {
        url: absoluteUrl("/images/cascade-engine-interface-2026-07-16.png"),
        width: 3362,
        height: 1924,
        alt: "01 Systems and Cascade Engine",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "01 Systems | Decision Space Analytics",
    description:
      "01 Systems develops Cascade Engine, software purpose-built for Decision Space Analytics and understanding how decisions reshape future options.",
    images: [absoluteUrl("/images/cascade-engine-interface-2026-07-16.png")],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/favicon.ico" }],
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION
      ? {
          "msvalidate.01": process.env.BING_SITE_VERIFICATION,
        }
      : undefined,
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/images/Logo-01.svg"),
    sameAs: ["https://www.linkedin.com/in/christian-strandek-821557393/"],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "sales",
        email: "christian@01systems.se",
        availableLanguage: ["en", "sv"],
      },
    ],
  };

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <LanguageProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
          <Analytics />
        </LanguageProvider>
      </body>
    </html>
  );
}
