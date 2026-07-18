"use client";

import { useLanguage } from "@/components/language-context";

type LocalizedTextProps = {
  en: string;
  sv: string;
};

export function InsightLocalizedText({ en, sv }: LocalizedTextProps) {
  const { lang } = useLanguage();
  return <>{lang === "sv" ? sv : en}</>;
}

export function InsightFoundationLabel({ order }: { order: number }) {
  const { lang } = useLanguage();
  const prefix = lang === "sv" ? "Grundserie" : "Foundation";
  return (
    <>
      {prefix} {String(order).padStart(2, "0")}
    </>
  );
}

export function InsightReadingTime({ readingTime }: { readingTime: string }) {
  const { lang } = useLanguage();
  const normalizedDuration = readingTime.replace(/^Estimated reading time:\s*/i, "");
  const prefix = lang === "sv" ? "Beräknad lästid" : "Estimated reading time";
  return (
    <>
      {prefix}: {normalizedDuration}
    </>
  );
}
