import type { Metadata } from "next";
import { CascadeEnginePageContent } from "@/components/cascade-engine-page-content";
import { HOME_OG_IMAGE, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Cascade Engine | Deterministic analysis product",
  description:
    "Learn how Cascade Engine represents, executes and compares explicitly configured decision situations through deterministic analysis.",
  path: "/cascade-engine",
  image: HOME_OG_IMAGE,
});

export default function CascadeEnginePage() {
  return <CascadeEnginePageContent />;
}
