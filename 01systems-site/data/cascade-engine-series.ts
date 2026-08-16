export const CASCADE_ENGINE_SERIES_NAME = "Cascade Engine";
export const CASCADE_ENGINE_AUTHOR = "Christian Strandek";
export const CASCADE_ENGINE_PUBLISHER = "01 Systems";

export type CascadeEngineArticleComponentKey =
  | "one"
  | "two"
  | "three"
  | "four"
  | "five"
  | "six";

export type CascadeEngineSeriesArticle = {
  position: number;
  slug: string;
  title: string;
  description: string;
  readingTime: string;
  wordCount: number;
  articleComponentKey: CascadeEngineArticleComponentKey;
  previousSlug: string | null;
  nextSlug: string | null;
  seriesName: typeof CASCADE_ENGINE_SERIES_NAME;
  author: typeof CASCADE_ENGINE_AUTHOR;
  publisher: typeof CASCADE_ENGINE_PUBLISHER;
  publicationDate: string | null;
  modifiedDate: string | null;
  socialImage: string | null;
  canonicalLink: {
    href: string;
    label: string;
  };
};

export const cascadeEngineSeries = [
  {
    position: 1,
    slug: "before-cascade-engine-can-analyze-a-decision",
    title: "Before Cascade Engine Can Analyse a Decision",
    description: "How a real decision situation becomes a configured analytical model before Cascade Engine executes it.",
    readingTime: "Estimated reading time: 7–8 minutes",
    wordCount: 1142,
    articleComponentKey: "one",
    previousSlug: null,
    nextSlug: "why-sequence-changes-the-result",
    seriesName: CASCADE_ENGINE_SERIES_NAME,
    author: CASCADE_ENGINE_AUTHOR,
    publisher: CASCADE_ENGINE_PUBLISHER,
    publicationDate: null,
    modifiedDate: null,
    socialImage: null,
    canonicalLink: {
      href: "/insights/decision-space-analytics-framework",
      label: "Decision Space Analytics framework",
    },
  },
  {
    position: 2,
    slug: "why-sequence-changes-the-result",
    title: "Why Sequence Changes the Result",
    description: "How action order changes the state inherited by later decisions and creates different analytical paths.",
    readingTime: "Estimated reading time: 8–9 minutes",
    wordCount: 1204,
    articleComponentKey: "two",
    previousSlug: "before-cascade-engine-can-analyze-a-decision",
    nextSlug: "how-effects-propagate",
    seriesName: CASCADE_ENGINE_SERIES_NAME,
    author: CASCADE_ENGINE_AUTHOR,
    publisher: CASCADE_ENGINE_PUBLISHER,
    publicationDate: null,
    modifiedDate: null,
    socialImage: null,
    canonicalLink: {
      href: "/insights/the-hidden-power-of-decision-sequencing",
      label: "The Hidden Power of Decision Sequencing",
    },
  },
  {
    position: 3,
    slug: "how-effects-propagate",
    title: "How Effects Propagate",
    description: "How configured relationships carry eligible effects into downstream model states during deterministic execution.",
    readingTime: "Estimated reading time: 8–9 minutes",
    wordCount: 1197,
    articleComponentKey: "three",
    previousSlug: "why-sequence-changes-the-result",
    nextSlug: "structural-margin-and-constraints",
    seriesName: CASCADE_ENGINE_SERIES_NAME,
    author: CASCADE_ENGINE_AUTHOR,
    publisher: CASCADE_ENGINE_PUBLISHER,
    publicationDate: null,
    modifiedDate: null,
    socialImage: null,
    canonicalLink: {
      href: "/insights/the-hidden-cost-of-strategic-dependencies",
      label: "The Hidden Cost of Strategic Dependencies",
    },
  },
  {
    position: 4,
    slug: "structural-margin-and-constraints",
    title: "Structural Margin and Constraints",
    description: "What model-relative trajectories, structural margin and conditional constraints reveal about a scenario path.",
    readingTime: "Estimated reading time: 9–10 minutes",
    wordCount: 1387,
    articleComponentKey: "four",
    previousSlug: "how-effects-propagate",
    nextSlug: "from-calculations-to-structural-findings",
    seriesName: CASCADE_ENGINE_SERIES_NAME,
    author: CASCADE_ENGINE_AUTHOR,
    publisher: CASCADE_ENGINE_PUBLISHER,
    publicationDate: null,
    modifiedDate: null,
    socialImage: null,
    canonicalLink: {
      href: "/insights/implementation-pressure-strategic-constraint",
      label: "Implementation Pressure: The Constraint Organizations Rarely Measure",
    },
  },
  {
    position: 5,
    slug: "from-calculations-to-structural-findings",
    title: "From Calculations to Structural Findings",
    description: "How completed Analytical Results are selected and surfaced deterministically as Structural Findings.",
    readingTime: "Estimated reading time: 8–9 minutes",
    wordCount: 1153,
    articleComponentKey: "five",
    previousSlug: "structural-margin-and-constraints",
    nextSlug: "where-ai-enters-and-where-it-does-not",
    seriesName: CASCADE_ENGINE_SERIES_NAME,
    author: CASCADE_ENGINE_AUTHOR,
    publisher: CASCADE_ENGINE_PUBLISHER,
    publicationDate: null,
    modifiedDate: null,
    socialImage: null,
    canonicalLink: {
      href: "/insights/decision-space-analytics-framework",
      label: "Decision Space Analytics framework",
    },
  },
  {
    position: 6,
    slug: "where-ai-enters-and-where-it-does-not",
    title: "Where AI Enters — and Where It Does Not",
    description: "Where AI Interpretation enters after deterministic analysis and what authority its explanation has.",
    readingTime: "Estimated reading time: 8–9 minutes",
    wordCount: 1233,
    articleComponentKey: "six",
    previousSlug: "from-calculations-to-structural-findings",
    nextSlug: null,
    seriesName: CASCADE_ENGINE_SERIES_NAME,
    author: CASCADE_ENGINE_AUTHOR,
    publisher: CASCADE_ENGINE_PUBLISHER,
    publicationDate: null,
    modifiedDate: null,
    socialImage: null,
    canonicalLink: {
      href: "/architecture",
      label: "Cascade Engine architecture",
    },
  },
] as const satisfies readonly CascadeEngineSeriesArticle[];

export function getCascadeEngineArticle(slug: string) {
  return cascadeEngineSeries.find((article) => article.slug === slug);
}

export function getCascadeEngineArticleUrl(slug: string) {
  return `/insights/cascade-engine/${slug}`;
}
