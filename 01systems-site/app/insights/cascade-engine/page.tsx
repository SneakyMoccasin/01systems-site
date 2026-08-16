import Link from "next/link";
import type { Metadata } from "next";
import {
  CASCADE_ENGINE_SERIES_NAME,
  cascadeEngineSeries,
  getCascadeEngineArticleUrl,
} from "@/data/cascade-engine-series";
import { absoluteUrl } from "@/lib/seo";

const description =
  "A six-part series covering how Cascade Engine represents, executes and presents structural analysis.";

export const metadata: Metadata = {
  title: `${CASCADE_ENGINE_SERIES_NAME} series`,
  description,
  alternates: {
    canonical: absoluteUrl("/insights/cascade-engine"),
  },
  openGraph: {
    type: "website",
    url: absoluteUrl("/insights/cascade-engine"),
    title: `${CASCADE_ENGINE_SERIES_NAME} series`,
    description,
    siteName: "01 Systems",
    locale: "en_GB",
    images: [],
  },
  twitter: {
    card: "summary_large_image",
    title: `${CASCADE_ENGINE_SERIES_NAME} series`,
    description,
    images: [],
  },
};

export default function CascadeEngineSeriesPage() {
  return (
    <main className="page-shell ce-series-overview">
      <header className="content-narrow">
        <p className="eyebrow">Insights · Cascade Engine</p>
        <h1 className="page-title">Cascade Engine series</h1>
        <p className="body-xl">
          The series covers how Cascade Engine represents, executes and presents structural analysis.
        </p>
        <p>
          <Link href="/architecture">Explore the Cascade Engine architecture</Link>
        </p>
      </header>

      <section className="article-list" aria-label="Cascade Engine articles">
        {cascadeEngineSeries.map((article) => (
          <article className="article-card" key={article.slug}>
            <p className="ce-series-card-position">
              Cascade Engine · {article.position} of {cascadeEngineSeries.length}
            </p>
            <h2>
              <Link className="article-card-link touch-link" href={getCascadeEngineArticleUrl(article.slug)}>
                {article.title}
              </Link>
            </h2>
            <p className="ce-series-card-description">{article.description}</p>
            <p className="ce-series-card-reading-time">{article.readingTime}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
