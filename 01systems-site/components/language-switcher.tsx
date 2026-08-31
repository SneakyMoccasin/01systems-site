"use client";

import { useLanguage } from "@/components/language-context";

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const isSwedish = lang === "sv";

  return (
    <div
      className="language-toggle header-language-toggle"
      role="group"
      aria-label={isSwedish ? "Välj språk" : "Choose language"}
    >
      <button
        type="button"
        onClick={() => setLang("sv")}
        aria-label="Byt språk till svenska"
        aria-pressed={isSwedish}
      >
        SV
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-label="Switch language to English"
        aria-pressed={!isSwedish}
      >
        EN
      </button>
    </div>
  );
}
