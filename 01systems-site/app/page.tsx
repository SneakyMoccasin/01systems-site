import type { Metadata } from "next";
import { ExecutiveHomePageContent } from "@/components/executive-home-page-content";
import { HOME_OG_IMAGE, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Cascade Engine | Deterministic decision analysis",
  description:
    "Cascade Engine is a deterministic decision-analysis product for representing and comparing configured decision situations, dependencies and constraints.",
  path: "/",
  image: HOME_OG_IMAGE,
});

export default function Page() {
  return <ExecutiveHomePageContent />;
}
