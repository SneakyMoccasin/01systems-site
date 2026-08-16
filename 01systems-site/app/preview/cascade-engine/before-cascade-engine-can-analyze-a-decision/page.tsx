import type { Metadata } from "next";
import { CascadeEngineArticleOne } from "@/components/cascade-engine-article-one";

export const metadata: Metadata = {
  title: "Before Cascade Engine Can Analyse a Decision",
  description:
    "A strategic decision does not enter an analytical engine as “a decision.” It has to be represented.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CascadeEngineArticleOnePreviewPage() {
  return (
    <main className="page-shell ce1-preview-shell">
      <CascadeEngineArticleOne />
    </main>
  );
}
