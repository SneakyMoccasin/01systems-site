import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InsightAuthorLine } from "@/components/insight-author-line";
import { getInsightBySlug, insightArticles } from "@/data/insights";
import { SITE_NAME, absoluteUrl, createPageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return insightArticles.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getInsightBySlug(slug);

  if (!article) {
    return {};
  }

  return createPageMetadata({
    title: `${article.title} — Insights`,
    description: article.subtitle,
    path: `/insights/${article.slug}`,
    type: "article",
  });
}

export default async function InsightArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getInsightBySlug(slug);

  if (!article) {
    notFound();
  }

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.subtitle,
    mainEntityOfPage: absoluteUrl(`/insights/${article.slug}`),
    url: absoluteUrl(`/insights/${article.slug}`),
    articleSection: "Insights",
    wordCount: article.content.join(" ").split(/\s+/).length,
    author: {
      "@type": "Person",
      name: "Christian Strandek",
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/images/Logo-01.svg"),
      },
    },
    image: [absoluteUrl("/images/cascade-engine-overview.jpg")],
  };

  return (
    <main
      className="page-shell"
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        maxWidth: "900px",
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <article style={{ maxWidth: "760px" }}>
        <p className="eyebrow">
          Insights
        </p>
        <h1 className="page-title">
          {article.title}
        </h1>
        <InsightAuthorLine style={{ marginBottom: "14px" }} />
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
}
