import Link from "next/link";
import { insightArticles } from "@/data/insights";

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
          Insights
        </h1>
      </section>

      <section className="article-list">
        {insightArticles.map((article) => (
          <article
            key={article.slug}
            className="article-card"
          >
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "10px" }}>
              Foundation {String(article.order).padStart(2, "0")}
            </p>
            <h2 style={{ fontSize: "24px", lineHeight: 1.3, marginBottom: "10px" }}>
              <Link href={`/insights/${article.slug}`} className="article-card-link touch-link">
                {article.title}
              </Link>
            </h2>
            <p className="body-large" style={{ color: "var(--text-body)", marginBottom: "10px", fontSize: "16px" }}>{article.subtitle}</p>
            <p style={{ color: "var(--text-muted)", margin: 0 }}>{article.readingTime}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
