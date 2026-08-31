"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type SiteLanguage = "sv" | "en";

type LanguageContextValue = {
  lang: SiteLanguage;
  setLang: (lang: SiteLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const LANGUAGE_STORAGE_KEY = "01systems-language";

export function LanguageProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [lang, setLanguage] = useState<SiteLanguage>("en");

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

    if (storedLanguage === "sv" || storedLanguage === "en") {
      setLanguage(storedLanguage);
      document.documentElement.lang = storedLanguage;
    }
  }, []);

  const setLang = useCallback((nextLanguage: SiteLanguage) => {
    setLanguage(nextLanguage);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    document.documentElement.lang = nextLanguage;
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
}
