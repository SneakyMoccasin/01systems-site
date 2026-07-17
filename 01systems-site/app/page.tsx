import type { Metadata } from "next";
import { HomePageContent } from "@/components/home-page-content";
import { HOME_OG_IMAGE, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Cascade Engine for Decision Space Analytics",
  description:
    "Explore how Cascade Engine from 01 Systems helps teams analyze how today's decisions reshape future options through Decision Space Analytics.",
  path: "/",
  image: HOME_OG_IMAGE,
});

export default function Page() {
  return <HomePageContent />;
}
