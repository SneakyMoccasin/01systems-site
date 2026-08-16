import Link from "next/link";
import type { Metadata } from "next";
import { InsightAuthorLine } from "@/components/insight-author-line";
import {
  InsightFoundationLabel,
  InsightLocalizedText,
  InsightReadingTime,
} from "@/components/insight-ui";
import { insightArticles } from "@/data/insights";
import {
  cascadeEngineSeries,
  getCascadeEngineArticleUrl,
} from "@/data/cascade-engine-series";
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

      <section style={{ marginTop: "64px" }}>
        <p className="eyebrow content-narrow">Cascade Engine series</p>
        <h2 className="content-narrow" style={{ fontSize: "30px", lineHeight: 1.25, marginBottom: "12px" }}>
          <Link href="/insights/cascade-engine" className="article-card-link">
            Cascade Engine
          </Link>
        </h2>
        <p className="body-large content-narrow" style={{ color: "var(--text-body)", marginBottom: "28px" }}>
          A six-part series covering how Cascade Engine represents, executes and presents structural analysis.
        </p>

        <div className="article-list">
          {cascadeEngineSeries.map((article) => (
            <article key={article.slug} className="article-card">
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "10px" }}>
                Cascade Engine · {article.position} of {cascadeEngineSeries.length}
              </p>
              <h3 style={{ fontSize: "24px", lineHeight: 1.3, marginBottom: "10px" }}>
                <Link href={getCascadeEngineArticleUrl(article.slug)} className="article-card-link touch-link">
                  {article.title}
                </Link>
              </h3>
              <p className="body-large" style={{ color: "var(--text-body)", marginBottom: "10px", fontSize: "16px" }}>
                {article.description}
              </p>
              <p style={{ color: "var(--text-muted)", margin: 0 }}>{article.readingTime}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
