import type { Metadata } from "next";
import { AboutPageContent } from "@/components/about-page-content";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "About",
  description:
    "Learn about 01 Systems, Christian Strandek, and the thinking behind Cascade Engine and Decision Space Analytics.",
  path: "/about",
});

export default function AboutPage() {
  return <AboutPageContent />;
}
