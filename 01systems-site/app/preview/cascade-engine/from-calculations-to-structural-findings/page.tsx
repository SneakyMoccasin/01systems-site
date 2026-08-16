import type { Metadata } from "next";
import { CascadeEngineArticleFive } from "@/components/cascade-engine-article-five";

export const metadata: Metadata = {
  title: "From Calculations to Structural Findings",
  description:
    "How completed analytical calculations are turned into findings a reader can inspect.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CascadeEngineArticleFivePreviewPage() {
  return (
    <main className="page-shell ce1-preview-shell">
      <CascadeEngineArticleFive />
    </main>
  );
}
