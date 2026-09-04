import type { DomainKey } from "@/src/i18n/pulseLanguage";

export type DomainPresentationLanguage = "sv" | "en";
export type DomainAnalysisGoal =
  | "accessibility"
  | "congestion"
  | "margin_stability"
  | "avoid_tipping";

type LocalizedText = Readonly<Record<DomainPresentationLanguage, string>>;

export type DomainPresentation = Readonly<{
  name: string;
  goals: Readonly<Record<DomainAnalysisGoal, string>>;
  analysisFocus: string;
  graphSectionTitle: string;
  graphFocus: string;
  graphDescription: string;
  eventToggle: Readonly<{ show: string; hide: string }>;
}>;

type DomainPresentationDefinition = Readonly<{
  name: LocalizedText;
  goals: Readonly<Record<DomainAnalysisGoal, LocalizedText>>;
  analysisFocus: LocalizedText;
  graphSectionTitle: LocalizedText;
  graphFocus: Readonly<Record<DomainAnalysisGoal, LocalizedText>>;
  graphDescription: LocalizedText;
  eventToggle: Readonly<{ show: LocalizedText; hide: LocalizedText }>;
}>;

const DOMAIN_PRESENTATION = {
  realEstate: {
    name: { sv: "Fastighetsportfölj", en: "Real Estate Portfolio" },
    goals: {
      accessibility: { sv: "Stärk uthyrningsattraktivitet", en: "Strengthen leasing attractiveness" },
      congestion: { sv: "Minska operativ belastning", en: "Reduce operational strain" },
      margin_stability: { sv: "Bevara portföljflexibilitet", en: "Preserve portfolio flexibility" },
      avoid_tipping: { sv: "Undvik refinansieringsrisk", en: "Avoid refinancing risk" },
    },
    analysisFocus: {
      sv: "Hur refinansiering, kapitalbindning, beläggning och kassaflöde påverkar portföljens handlingsutrymme",
      en: "How refinancing, capital lock-in, occupancy, and cash flow affect portfolio room to act",
    },
    graphSectionTitle: { sv: "Strukturellt handlingsutrymme över tid", en: "Structural decision space over time" },
    graphFocus: {
      accessibility: { sv: "Hur refinansiering, kapitalbindning, beläggning och kassaflöde påverkar portföljens handlingsutrymme", en: "How refinancing, capital lock-in, occupancy, and cash flow affect portfolio room to act" },
      congestion: { sv: "Hur refinansiering, kapitalbindning, beläggning och kassaflöde påverkar portföljens handlingsutrymme", en: "How refinancing, capital lock-in, occupancy, and cash flow affect portfolio room to act" },
      margin_stability: { sv: "Hur refinansiering, kapitalbindning, beläggning och kassaflöde påverkar portföljens handlingsutrymme", en: "How refinancing, capital lock-in, occupancy, and cash flow affect portfolio room to act" },
      avoid_tipping: { sv: "Hur refinansiering, kapitalbindning, beläggning och kassaflöde påverkar portföljens handlingsutrymme", en: "How refinancing, capital lock-in, occupancy, and cash flow affect portfolio room to act" },
    },
    graphDescription: {
      sv: "Grafen visar hur portföljens handlingsutrymme förändras över tid när refinansiering, kapitalbindning, kassaflöde, beläggning och underhållsstrategi utvecklas tillsammans.",
      en: "The graph shows how portfolio room to act changes over time as refinancing, capital lock-in, cash flow, occupancy, and maintenance strategy evolve together.",
    },
    eventToggle: { show: { sv: "Visa tidiga påverkanspunkter", en: "Show early influence points" }, hide: { sv: "Dölj tidiga påverkanspunkter", en: "Hide early influence points" } },
  },
  municipal: {
    name: { sv: "Transportsystem", en: "Transport System" },
    goals: {
      accessibility: { sv: "Öka tillgänglighet", en: "Increase accessibility" },
      congestion: { sv: "Minska trängsel", en: "Reduce congestion" },
      margin_stability: { sv: "Behåll marginalstabilitet", en: "Maintain margin stability" },
      avoid_tipping: { sv: "Undvik tipping-risk", en: "Avoid tipping risk" },
    },
    analysisFocus: { sv: "Tillgänglighetsdriven strukturell utveckling", en: "Accessibility-driven structural development" },
    graphSectionTitle: { sv: "Strukturellt handlingsutrymme över tid", en: "Structural decision space over time" },
    graphFocus: {
      accessibility: { sv: "Tillgänglighetsdriven strukturell utveckling", en: "Accessibility-driven structural development" },
      congestion: { sv: "Kapacitetstryckets påverkan på systemets handlingsutrymme", en: "How capacity pressure affects the system's decision space" },
      margin_stability: { sv: "Strukturell marginalnivå över tid", en: "Structural margin level over time" },
      avoid_tipping: { sv: "Tipping-risk och strukturella divergenspunkter", en: "Tipping risk and structural divergence points" },
    },
    graphDescription: {
      sv: "Grafen visar hur systemets strukturella handlingsutrymme förändras över tid beroende på vilka beslut som kombineras. Den visar inte optimal lösning — utan hur beslut påverkar stabilitet, begränsningar och risk för tipping över tid.",
      en: "The graph shows how the system's structural decision space changes over time depending on which decisions are combined. It does not show an optimal solution, but how decisions affect stability, constraints, and tipping risk over time.",
    },
    eventToggle: { show: { sv: "Visa driveraktiveringar", en: "Show driver activations" }, hide: { sv: "Dölj driveraktiveringar", en: "Hide driver activations" } },
  },
  consulting: {
    name: { sv: "Besluts- och scenariomiljö", en: "Decision Environment" },
    goals: {
      accessibility: { sv: "Stärk projektstabilitet", en: "Strengthen project stability" },
      congestion: { sv: "Minska resursbelastning", en: "Reduce resource strain" },
      margin_stability: { sv: "Bevara leveranskapacitet", en: "Preserve delivery capacity" },
      avoid_tipping: { sv: "Undvik leveransbegränsningar", en: "Avoid delivery constraints" },
    },
    analysisFocus: { sv: "Projektstabilitet och leveransförmåga i beslutsmiljön", en: "Project stability and delivery capacity in the decision environment" },
    graphSectionTitle: { sv: "Strukturellt handlingsutrymme över tid", en: "Structural decision space over time" },
    graphFocus: {
      accessibility: { sv: "Projektstabilitet och kontinuitet i leveransen", en: "Project stability and delivery continuity" },
      congestion: { sv: "Resursbelastningens påverkan på leveranskapaciteten", en: "How resource strain affects delivery capacity" },
      margin_stability: { sv: "Strukturellt handlingsutrymme genom förändrade leveransåtaganden", en: "Structural decision space across changing delivery commitments" },
      avoid_tipping: { sv: "Leveransbegränsningar och strukturella divergenspunkter", en: "Delivery constraints and structural divergence points" },
    },
    graphDescription: {
      sv: "Grafen visar hur beslutsmiljöns strukturella handlingsutrymme förändras när projektstabilitet, resursbelastning, budgetexponering och leveransbacklog utvecklas tillsammans.",
      en: "The graph shows how the decision environment's structural decision space changes as project stability, resource strain, budget exposure, and delivery backlog evolve together.",
    },
    eventToggle: { show: { sv: "Visa driveraktiveringar", en: "Show driver activations" }, hide: { sv: "Dölj driveraktiveringar", en: "Hide driver activations" } },
  },
} as const satisfies Record<DomainKey, DomainPresentationDefinition>;

export function getDomainPresentation(
  domain: DomainKey,
  language: DomainPresentationLanguage,
  goal: DomainAnalysisGoal
): DomainPresentation {
  const definition = DOMAIN_PRESENTATION[domain];
  return {
    name: definition.name[language],
    goals: {
      accessibility: definition.goals.accessibility[language],
      congestion: definition.goals.congestion[language],
      margin_stability: definition.goals.margin_stability[language],
      avoid_tipping: definition.goals.avoid_tipping[language],
    },
    analysisFocus: definition.analysisFocus[language],
    graphSectionTitle: definition.graphSectionTitle[language],
    graphFocus: definition.graphFocus[goal][language],
    graphDescription: definition.graphDescription[language],
    eventToggle: {
      show: definition.eventToggle.show[language],
      hide: definition.eventToggle.hide[language],
    },
  };
}

export function getDomainPresentationLabels(language: DomainPresentationLanguage): Readonly<Record<DomainKey, string>> {
  return {
    realEstate: DOMAIN_PRESENTATION.realEstate.name[language],
    municipal: DOMAIN_PRESENTATION.municipal.name[language],
    consulting: DOMAIN_PRESENTATION.consulting.name[language],
  };
}
