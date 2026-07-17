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
        className="page-shell"
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          maxWidth: "900px",
        }}
      >
        <article style={{ maxWidth: "760px" }}>
          <p className="eyebrow">
            Insights
          </p>
          <h1 className="page-title">
            {article.title}
          </h1>
          <p className="body-xl" style={{ color: "var(--text-body)", marginBottom: "14px" }}>
            {article.subtitle}
          </p>
          <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
            Foundation {String(article.order).padStart(2, "0")} · {article.readingTime}
          </p>
          <div className="article-prose">
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
