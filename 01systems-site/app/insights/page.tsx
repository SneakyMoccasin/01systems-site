import Link from "next/link";
import { insightArticles } from "@/data/insights";

export default function InsightsPage() {
  return (
    <main
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "60px 16px",
        maxWidth: "900px",
        margin: "0 auto",
        lineHeight: 1.6,
      }}
    >
      <section style={{ marginBottom: "48px" }}>
        <p
          style={{
            fontSize: "13px",
            color: "#666",
            marginBottom: "14px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            maxWidth: "760px",
          }}
        >
          01 Systems
        </p>
        <h1 style={{ fontSize: "42px", lineHeight: 1.15, marginBottom: "20px", maxWidth: "760px" }}>
          Insights
        </h1>
      </section>

      <section
        style={{
          display: "grid",
          gap: "20px",
          maxWidth: "760px",
        }}
      >
        {insightArticles.map((article) => (
          <article
            key={article.slug}
            style={{
              border: "1px solid #e5e5e5",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <p style={{ fontSize: "13px", color: "#666", marginBottom: "10px" }}>
              Foundation {String(article.order).padStart(2, "0")}
            </p>
            <h2 style={{ fontSize: "24px", lineHeight: 1.3, marginBottom: "10px" }}>
              <Link href={`/insights/${article.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                {article.title}
              </Link>
            </h2>
            <p style={{ color: "#555", marginBottom: "10px" }}>{article.subtitle}</p>
            <p style={{ color: "#666", margin: 0 }}>{article.readingTime}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
