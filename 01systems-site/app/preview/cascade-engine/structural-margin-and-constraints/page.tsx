import type { Metadata } from "next";
import { CascadeEngineArticleFour } from "@/components/cascade-engine-article-four";

export const metadata: Metadata = {
  title: "Structural Margin and Constraints",
  description:
    "Two scenarios can end at a similar point and still have travelled through very different structural conditions.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CascadeEngineArticleFourPreviewPage() {
  return (
    <main className="page-shell ce1-preview-shell">
      <CascadeEngineArticleFour />
    </main>
  );
}
