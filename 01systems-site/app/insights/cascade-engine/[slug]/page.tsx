import type { ComponentType } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CascadeEngineArticleOne } from "@/components/cascade-engine-article-one";
import { CascadeEngineArticleTwo } from "@/components/cascade-engine-article-two";
import { CascadeEngineArticleThree } from "@/components/cascade-engine-article-three";
import { CascadeEngineArticleFour } from "@/components/cascade-engine-article-four";
import { CascadeEngineArticleFive } from "@/components/cascade-engine-article-five";
import { CascadeEngineArticleSix } from "@/components/cascade-engine-article-six";
import { CascadeEngineSeriesNavigation } from "@/components/cascade-engine-series-navigation";
import {
  CASCADE_ENGINE_SERIES_NAME,
  cascadeEngineSeries,
  getCascadeEngineArticle,
  getCascadeEngineArticleUrl,
  type CascadeEngineArticleComponentKey,
} from "@/data/cascade-engine-series";
import { SITE_NAME, absoluteUrl } from "@/lib/seo";

const articleComponents: Record<CascadeEngineArticleComponentKey, ComponentType> = {
  one: CascadeEngineArticleOne,
  two: CascadeEngineArticleTwo,
  three: CascadeEngineArticleThree,
  four: CascadeEngineArticleFour,
  five: CascadeEngineArticleFive,
  six: CascadeEngineArticleSix,
};

export const dynamicParams = false;

export function generateStaticParams() {
  return cascadeEngineSeries.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getCascadeEngineArticle(slug);

  if (!article) {
    return {};
  }

  const path = getCascadeEngineArticleUrl(article.slug);
  const images = article.socialImage ? [absoluteUrl(article.socialImage)] : [];

  return {
    title: `${article.title} — ${CASCADE_ENGINE_SERIES_NAME}`,
    description: article.description,
    alternates: {
      canonical: absoluteUrl(path),
    },
    authors: [{ name: article.author }],
    creator: article.author,
    publisher: article.publisher,
    openGraph: {
      type: "article",
      url: absoluteUrl(path),
      title: article.title,
      description: article.description,
      siteName: SITE_NAME,
      locale: "en_GB",
      authors: [article.author],
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
      images,
    },
  };
}

export default async function CascadeEngineArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getCascadeEngineArticle(slug);

  if (!article) {
    notFound();
  }

  const ArticleComponent = articleComponents[article.articleComponentKey];
  const path = getCascadeEngineArticleUrl(article.slug);
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    mainEntityOfPage: absoluteUrl(path),
    url: absoluteUrl(path),
    articleSection: CASCADE_ENGINE_SERIES_NAME,
    position: article.position,
    wordCount: article.wordCount,
    author: {
      "@type": "Person",
      name: article.author,
    },
    publisher: {
      "@type": "Organization",
      name: article.publisher,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/images/Logo-01.svg"),
      },
    },
    isPartOf: {
      "@type": "CreativeWorkSeries",
      name: article.seriesName,
      url: absoluteUrl("/insights/cascade-engine"),
    },
    ...(article.socialImage
      ? { image: [absoluteUrl(article.socialImage)] }
      : {}),
    ...(article.publicationDate
      ? { datePublished: article.publicationDate }
      : {}),
    ...(article.modifiedDate
      ? { dateModified: article.modifiedDate }
      : {}),
  };

  return (
    <main className="page-shell ce1-preview-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <ArticleComponent />
      <CascadeEngineSeriesNavigation article={article} />
    </main>
  );
}
