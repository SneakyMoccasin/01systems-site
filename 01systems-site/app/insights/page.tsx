import Link from "next/link";
import type { Metadata } from "next";
import { InsightAuthorLine } from "@/components/insight-author-line";
import {
  InsightFoundationLabel,
  InsightLocalizedText,
  InsightReadingTime,
} from "@/components/insight-ui";
import { insightArticles } from "@/data/insights";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Insights",
  description:
    "Read the 01 Systems insight series on Decision Space Analytics, structural lock-in, and how decisions reshape future options.",
  path: "/insights",
});

export default function InsightsPage() {
  return (
    <main
      className="page-shell"
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        maxWidth: "900px",
      }}
    >
      <section style={{ marginBottom: "48px" }}>
        <p className="eyebrow content-narrow">
          01 Systems
        </p>
        <h1 className="page-title content-narrow">
          <InsightLocalizedText en="Insights" sv="Insikter" />
        </h1>
      </section>

      <section className="article-list">
        {insightArticles.map((article) => (
          <article
            key={article.slug}
            className="article-card"
          >
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "10px" }}>
              <InsightFoundationLabel order={article.order} />
            </p>
            <h2 style={{ fontSize: "24px", lineHeight: 1.3, marginBottom: "10px" }}>
              <Link href={`/insights/${article.slug}`} className="article-card-link touch-link">
                {article.title}
              </Link>
            </h2>
            <InsightAuthorLine compact style={{ marginBottom: "10px" }} />
            <p className="body-large" style={{ color: "var(--text-body)", marginBottom: "10px", fontSize: "16px" }}>{article.subtitle}</p>
            <p style={{ color: "var(--text-muted)", margin: 0 }}>
              <InsightReadingTime readingTime={article.readingTime} />
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
