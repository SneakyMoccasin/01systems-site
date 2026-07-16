import { notFound } from "next/navigation";
import { getInsightBySlug, insightArticles } from "@/data/insights";

export function generateStaticParams() {
  return insightArticles.map((article) => ({
    slug: article.slug,
  }));
}

export default function InsightArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return params.then(({ slug }) => {
    const article = getInsightBySlug(slug);

    if (!article) {
      notFound();
    }

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
        <article style={{ maxWidth: "760px" }}>
          <p style={{ fontSize: "13px", color: "#666", marginBottom: "14px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Insights
          </p>
          <h1 style={{ fontSize: "42px", lineHeight: 1.15, marginBottom: "20px" }}>
            {article.title}
          </h1>
          <p style={{ fontSize: "20px", lineHeight: 1.5, color: "#555", marginBottom: "14px" }}>
            {article.subtitle}
          </p>
          <p style={{ color: "#666", marginBottom: "24px" }}>
            Foundation {String(article.order).padStart(2, "0")} · {article.readingTime}
          </p>
          <div style={{ display: "grid", gap: "18px", color: "#555" }}>
            {article.content.map((paragraph, index) => (
              <p key={index} style={{ margin: 0 }}>
                {paragraph}
              </p>
            ))}
          </div>
        </article>
      </main>
    );
  });
}
