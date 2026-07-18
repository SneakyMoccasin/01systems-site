"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/language-context";

export function SiteHeader() {
  const { lang } = useLanguage();

  const labels =
    lang === "sv"
      ? {
          home: "Hem",
          architecture: "Arkitektur",
          insights: "Insikter",
          about: "Om",
          walkthrough: "Boka en genomgång",
        }
      : {
          home: "Home",
          architecture: "Architecture",
          insights: "Insights",
          about: "About",
          walkthrough: "Book a walkthrough",
        };

  return (
    <header className="site-header-shell">
      <Link href="/" aria-label="01 Systems home" className="site-header-home">
        <Image
          className="site-logo"
          src="/images/Logo-01.svg"
          alt="01 Systems"
          width={180}
          height={52}
          priority
        />
      </Link>
      <nav
        aria-label="Primary"
        className="site-nav"
      >
        <Link href="/">
          {labels.home}
        </Link>
        <Link href="/architecture">
          {labels.architecture}
        </Link>
        <Link href="/insights">
          {labels.insights}
        </Link>
        <Link href="/about">
          {labels.about}
        </Link>
        <a href="mailto:christian@01systems.se">
          {labels.walkthrough}
        </a>
      </nav>
    </header>
  );
}
