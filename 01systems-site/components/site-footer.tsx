"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-context";

export function SiteFooter() {
  const { lang } = useLanguage();
  const isSwedish = lang === "sv";

  return (
    <footer
      style={{
        marginTop: "60px",
        borderTop: "1px solid #eee",
        background: "#fff",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "32px 16px 36px",
          display: "grid",
          gap: "10px",
        }}
      >
        <div style={{ fontSize: "22px", fontWeight: 600, lineHeight: 1.2 }}>01 Systems</div>
        <div style={{ color: "#555", lineHeight: 1.5 }}>Decision Space Analytics</div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "18px",
            paddingTop: "8px",
          }}
        >
          <Link href="/insights" style={{ color: "#111", textDecoration: "none" }}>
            {isSwedish ? "Insikter" : "Insights"}
          </Link>
          <Link href="/about" style={{ color: "#111", textDecoration: "none" }}>
            {isSwedish ? "Om" : "About"}
          </Link>
          <a href="mailto:christian@01systems.se" style={{ color: "#111", textDecoration: "none" }}>
            {isSwedish ? "Boka en genomgång" : "Book a walkthrough"}
          </a>
        </div>

        <a
          href="mailto:christian@01systems.se"
          style={{
            color: "#555",
            textDecoration: "none",
            paddingTop: "8px",
            width: "fit-content",
          }}
        >
          christian@01systems.se
        </a>

        <div style={{ color: "#777", fontSize: "14px", paddingTop: "4px" }}>© 2026 01 Systems</div>
      </div>
    </footer>
  );
}
