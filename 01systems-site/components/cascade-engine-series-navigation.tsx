import Link from "next/link";
import {
  getCascadeEngineArticle,
  getCascadeEngineArticleUrl,
  type CascadeEngineSeriesArticle,
} from "@/data/cascade-engine-series";

export function CascadeEngineSeriesNavigation({
  article,
}: {
  article: CascadeEngineSeriesArticle;
}) {
  const previous = article.previousSlug
    ? getCascadeEngineArticle(article.previousSlug)
    : undefined;
  const next = article.nextSlug
    ? getCascadeEngineArticle(article.nextSlug)
    : undefined;

  return (
    <nav className="ce-series-navigation" aria-label="Cascade Engine series navigation">
      <div className="ce-series-navigation-main">
        {previous ? (
          <Link href={getCascadeEngineArticleUrl(previous.slug)}>
            <span>Previous</span>
            <strong>{previous.title}</strong>
          </Link>
        ) : <span />}

        {next ? (
          <Link href={getCascadeEngineArticleUrl(next.slug)}>
            <span>Next</span>
            <strong>{next.title}</strong>
          </Link>
        ) : <span />}
      </div>

      <div className="ce-series-navigation-secondary">
        <Link href="/insights/cascade-engine">Complete Cascade Engine series</Link>
        <Link href={article.canonicalLink.href}>{article.canonicalLink.label}</Link>
      </div>
    </nav>
  );
}
