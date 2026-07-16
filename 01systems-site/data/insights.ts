import rawInsights from "@/data/insights.json";

export type InsightArticle = {
  order: number;
  slug: string;
  title: string;
  subtitle: string;
  readingTime: string;
  content: string[];
};

export const insightArticles = rawInsights as InsightArticle[];

export function getHomepageInsights(limit = 3) {
  return [...insightArticles]
    .sort((left, right) => left.order - right.order)
    .slice(0, limit);
}

export function getInsightBySlug(slug: string) {
  return insightArticles.find((article) => article.slug === slug);
}
