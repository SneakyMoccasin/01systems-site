import type { Metadata } from "next";
import { CascadeEngineArticleTwo } from "@/components/cascade-engine-article-two";

export const metadata: Metadata = {
  title: "Why Sequence Changes the Result",
  description:
    "Two plans can contain the same broad set of actions and still produce different structural conditions.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CascadeEngineArticleTwoPreviewPage() {
  return (
    <main className="page-shell ce1-preview-shell">
      <CascadeEngineArticleTwo />
    </main>
  );
}
