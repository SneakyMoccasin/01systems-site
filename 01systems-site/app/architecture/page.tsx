import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";
import { ArchitecturePageContent } from "@/components/architecture-page-content";

export const metadata: Metadata = createPageMetadata({
  title: "Architecture",
  description:
    "Understand the analytical foundation of Cascade Engine, including its core principle, analytical model, deterministic foundation, analytical scope, and capabilities.",
  path: "/architecture",
});

export default function ArchitecturePage() {
  return <ArchitecturePageContent />;
}
