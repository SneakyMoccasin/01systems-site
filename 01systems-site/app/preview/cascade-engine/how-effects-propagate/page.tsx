import type { Metadata } from "next";
import { CascadeEngineArticleThree } from "@/components/cascade-engine-article-three";

export const metadata: Metadata = {
  title: "How Effects Propagate",
  description: "A decision rarely affects only the place where it is made.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CascadeEngineArticleThreePreviewPage() {
  return (
    <main className="page-shell ce1-preview-shell">
      <CascadeEngineArticleThree />
    </main>
  );
}
