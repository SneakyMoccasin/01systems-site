import type { Metadata } from "next";
import { CascadeEngineArticleSix } from "@/components/cascade-engine-article-six";

export const metadata: Metadata = {
  title: "Where AI Enters — and Where It Does Not",
  description:
    "By the time AI Interpretation enters Cascade Engine, the analysis already exists.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CascadeEngineArticleSixPreviewPage() {
  return (
    <main className="page-shell ce1-preview-shell">
      <CascadeEngineArticleSix />
    </main>
  );
}
