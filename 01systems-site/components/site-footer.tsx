"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-context";

export function SiteFooter() {
  const { lang } = useLanguage();
  const isSwedish = lang === "sv";
  const linkedInUrl = "https://www.linkedin.com/in/christian-strandek-821557393/";

  return (
    <footer
      className="site-footer-shell"
      style={{
        marginTop: "60px",
        borderTop: "1px solid #eee",
        background: "#fff",
        color: "var(--card-text-primary)",
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
        <div style={{ color: "var(--card-text-body)", lineHeight: 1.5 }}>Decision Space Analytics</div>

        <div className="footer-links">
          <Link href="/cascade-engine" style={{ color: "#111", textDecoration: "none" }}>
            Cascade Engine
          </Link>
          <Link href="/architecture" style={{ color: "#111", textDecoration: "none" }}>
            {isSwedish ? "Arkitektur" : "Architecture"}
          </Link>
          <Link href="/insights" style={{ color: "#111", textDecoration: "none" }}>
            {isSwedish ? "Insikter" : "Insights"}
          </Link>
          <Link href="/about" style={{ color: "#111", textDecoration: "none" }}>
            {isSwedish ? "Om" : "About"}
          </Link>
          <a href="mailto:christian@01systems.se" style={{ color: "var(--card-text-primary)", textDecoration: "none" }}>
            {isSwedish ? "Boka ett inledande samtal" : "Book an initial conversation"}
          </a>
        </div>

        <a
          href="mailto:christian@01systems.se"
          style={{
            color: "var(--card-text-body)",
            textDecoration: "none",
            paddingTop: "8px",
            width: "fit-content",
          }}
          className="footer-mail"
        >
          christian@01systems.se
        </a>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingTop: "10px",
          }}
        >
          <a
            href={linkedInUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Christian Strandek on LinkedIn"
            style={{
              color: "var(--card-text-primary)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
            }}
            className="footer-social-link"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="currentColor"
            >
              <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.11 1 2.5 1 4.98 2.12 4.98 3.5zM.5 8h4V23h-4V8zm7 0h3.83v2.05h.05c.53-1.01 1.84-2.08 3.79-2.08 4.05 0 4.8 2.66 4.8 6.12V23h-4v-7.82c0-1.87-.03-4.28-2.61-4.28-2.62 0-3.02 2.05-3.02 4.15V23h-4V8z" />
            </svg>
          </a>
        </div>

        <div style={{ color: "var(--card-text-muted)", fontSize: "14px", paddingTop: "4px" }}>© 2026 01 Systems</div>
      </div>
    </footer>
  );
}
