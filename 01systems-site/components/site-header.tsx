"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/language-context";
import { LanguageSwitcher } from "@/components/language-switcher";

export function SiteHeader() {
  const { lang } = useLanguage();

  const labels =
    lang === "sv"
      ? {
          home: "Hem",
          cascadeEngine: "Cascade Engine",
          architecture: "Arkitektur",
          insights: "Insikter",
          about: "Om",
          walkthrough: "Boka ett inledande samtal",
        }
      : {
          home: "Home",
          cascadeEngine: "Cascade Engine",
          architecture: "Architecture",
          insights: "Insights",
          about: "About",
          walkthrough: "Book an initial conversation",
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
      <div className="site-header-utilities">
        <nav
          aria-label={lang === "sv" ? "Primär navigering" : "Primary navigation"}
          className="site-nav"
        >
          <Link href="/">
            {labels.home}
          </Link>
          <Link href="/cascade-engine">
            {labels.cascadeEngine}
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
        <LanguageSwitcher />
      </div>
    </header>
  );
}
