export type SiteLanguage = "sv" | "en";

type LocalizedImage = { src: string; width: number; height: number };

type CascadeEngineMedia = {
  demoVideo: string;
  interfacePreview: LocalizedImage;
  structuralMargin: LocalizedImage;
  executiveProofNarrative: LocalizedImage;
};

export const CASCADE_ENGINE_MEDIA = {
  sv: {
    demoVideo: "/videos/cascade-engine-demo-sv.mp4",
    interfacePreview: { src: "/images/cascade-engine-interface-sv.png", width: 1901, height: 989 },
    structuralMargin: { src: "/images/cascade-engine-structural-margin-sv.png", width: 1199, height: 379 },
    executiveProofNarrative: { src: "/images/cascade-engine-executive-proof-narrative-sv.png", width: 1189, height: 715 },
  },
  en: {
    demoVideo: "/videos/cascade-engine-demo-en.mp4",
    interfacePreview: { src: "/images/cascade-engine-interface-en.png", width: 1897, height: 980 },
    structuralMargin: { src: "/images/cascade-engine-structural-margin-en.png", width: 1203, height: 386 },
    executiveProofNarrative: { src: "/images/cascade-engine-executive-proof-narrative-en.png", width: 1190, height: 699 },
  },
} as const satisfies Record<SiteLanguage, CascadeEngineMedia>;
