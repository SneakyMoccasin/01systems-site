type Language = "EN" | "SV";

let currentLanguage: Language = "EN";

export function getLanguage(): Language {
  return currentLanguage;
}

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
}
