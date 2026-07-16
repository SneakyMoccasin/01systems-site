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
          insights: "Insikter",
          about: "Om",
          walkthrough: "Boka en genomgång",
        }
      : {
          home: "Home",
          insights: "Insights",
          about: "About",
          walkthrough: "Book a walkthrough",
        };

  return (
    <header
      style={{
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Link href="/" aria-label="01 Systems home">
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
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "flex-end",
          gap: "18px",
          fontSize: "15px",
        }}
      >
        <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>
          {labels.home}
        </Link>
        <Link href="/insights" style={{ color: "inherit", textDecoration: "none" }}>
          {labels.insights}
        </Link>
        <Link href="/about" style={{ color: "inherit", textDecoration: "none" }}>
          {labels.about}
        </Link>
        <a href="mailto:christian@01systems.se" style={{ color: "inherit", textDecoration: "none" }}>
          {labels.walkthrough}
        </a>
      </nav>
    </header>
  );
}
