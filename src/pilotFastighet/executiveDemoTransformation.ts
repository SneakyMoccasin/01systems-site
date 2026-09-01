/**
 * Narrative/demo layer for Executive Demo Mode only.
 * Underlying simulation keys and mechanics are unchanged; labels surface org-transformation language.
 */

export type ExecutiveDemoActionKey =
  | "increase_service_frequency"
  | "reduce_travel_time"
  | "expand_cycling_infrastructure"
  | "congestion_pricing"
  | "electrify_bus_fleet"
  | "transit_signal_priority"
  | "reduce_parking_supply"
  | "phase_project_starts"
  | "stagger_project_starts"
  | "increase_liquidity_buffer"
  | "reduce_leverage"
  | "secure_long_term_leases"
  | "energy_retrofit_program"
  | "delay_maintenance"
  | "early_refinancing";

const INTERVENTION_LABELS: Record<
  ExecutiveDemoActionKey,
  { sv: string; en: string }
> = {
  increase_service_frequency: {
    sv: "Starta AI-initiativ",
    en: "Launch AI initiative",
  },
  reduce_travel_time: {
    sv: "Accelerera modernisering",
    en: "Accelerate modernization",
  },
  expand_cycling_infrastructure: {
    sv: "Starta parallella transformationsprogram",
    en: "Start parallel transformation programs",
  },
  congestion_pricing: {
    sv: "Minska operativa kostnader",
    en: "Reduce operational costs",
  },
  electrify_bus_fleet: {
    sv: "Byta ut kärninterna system",
    en: "Replace core internal systems",
  },
  transit_signal_priority: {
    sv: "Skydda genomföringsflexibilitet",
    en: "Protect execution flexibility",
  },
  reduce_parking_supply: {
    sv: "Frysa rekrytering",
    en: "Freeze hiring",
  },
  phase_project_starts: {
    sv: "Fasa implementation över tid",
    en: "Phase implementation over time",
  },
  stagger_project_starts: {
    sv: "Skjut upp lägre prioriterade initiativ",
    en: "Delay lower-priority initiatives",
  },
  increase_liquidity_buffer: {
    sv: "Bevara operativ kapacitet",
    en: "Preserve operational capacity",
  },
  reduce_leverage: {
    sv: "Minska strukturell belastning",
    en: "Reduce structural overload",
  },
  secure_long_term_leases: {
    sv: "Förankra långsiktiga leveransåtaganden",
    en: "Anchor long-horizon delivery commitments",
  },
  energy_retrofit_program: {
    sv: "Effektivisera äldre arbetssätt",
    en: "Modernize legacy ways of working",
  },
  delay_maintenance: {
    sv: "Skjuta på icke-brådskande förbättringar",
    en: "Defer non-urgent improvements",
  },
  early_refinancing: {
    sv: "Framplacera leverans- och resursbeslut i tid",
    en: "Front-load delivery and resource-sequencing decisions",
  },
};

export function getExecutiveDemoInterventionLabel(
  action: string,
  language: "sv" | "en"
): string {
  const entry = INTERVENTION_LABELS[action as ExecutiveDemoActionKey];
  if (!entry) return action;
  return language === "sv" ? entry.sv : entry.en;
}

/** Post-process visible analysis strings in executive demo (inspector, AI payload). */
export function surfaceOrgDemoText(
  text: string | null | undefined,
  language: "sv" | "en"
): string {
  if (text == null) return "";
  let s = String(text);
  const pairs =
    language === "sv" ? ORG_SURFACE_PAIRS_SV : ORG_SURFACE_PAIRS_EN;
  for (const [pattern, replacement] of pairs) {
    s = s.replace(pattern, replacement);
  }
  return s;
}

/**
 * Display-only: trim verbosity on the outlook / “room to act” interpretation card (~15–25%)
 * when text is long — no overflow clipping; may end on a shortened sentence.
 */
export function tightenExecOutlookStripBodyForDisplay(
  text: string,
  lang: "sv" | "en",
  displaySectionTitle: string
): string {
  const s0 = String(text).replace(/\s+/g, " ").trim();
  if (!s0) return s0;
  const key = displaySectionTitle.trim().toLowerCase();
  const isOutlook =
    lang === "en"
      ? /room to act|pressure evolution|forward outlook|^outlook$|how pressure evolves/i.test(
          key
        )
      : /handlingsutrymmet|tryckets utveckling|^utsikt$|framtidsblick|hur handlingsutrymmet/i.test(
          key
        );
  if (!isOutlook) return s0;

  let s = s0;
  if (lang === "en") {
    s = s
      .replace(/\bFurthermore,?\s+/gi, "")
      .replace(/\bAdditionally,?\s+/gi, "")
      .replace(/\bIt is important to note that\s+/gi, "")
      .replace(/\bIn summary,?\s+/gi, "")
      .replace(/\s+month by month\s+/gi, " each month ");
    const words = s.split(/\s+/).filter(Boolean);
    if (words.length >= 48) {
      const target = Math.max(32, Math.floor(words.length * 0.76));
      const cut = words.slice(0, target).join(" ");
      const lastChar = cut.slice(-1);
      return /[.!?]/.test(lastChar) ? cut : `${cut}.`;
    }
    return s;
  }

  s = s
    .replace(/\bVidare\s+/gi, "")
    .replace(/\bDessutom\s+/gi, "")
    .replace(/\bSammanfattningsvis\s+/gi, "");
  const wordsSv = s.split(/\s+/).filter(Boolean);
  if (wordsSv.length >= 48) {
    const target = Math.max(32, Math.floor(wordsSv.length * 0.76));
    const cut = wordsSv.slice(0, target).join(" ");
    const lastChar = cut.slice(-1);
    return /[.!?]/.test(lastChar) ? cut : `${cut}.`;
  }
  return s;
}

/** Extra model instruction: org framing, no new simulated facts. */
export function getExecutiveDemoInterpretationAddon(language: "sv" | "en"): string {
  return language === "sv"
    ? `

Demonstrationsläge — tolkning (endast språk; samma fakta som i data):
- Beskriv endast den konfigurerade jämförelsen: identiska startvillkor, samma åtgärder och olika tidpunkt/ordning.
- Skilj mellan bevarad marginal längs vägen och samma terminala marginal.
- Härled inte tidpunkt från kaskaddjup och påstå inte överbelastning, samtidighetskostnad, permanent undvikande, optimering eller en föredragen sekvens.
- Skriv observerande, inte rådgivande. Mänskligt omdöme är fortsatt avgörande.`
    : `

Executive demo — interpretation (wording only; same facts as in the data):
- Describe only the configured comparison: identical starting conditions, the same actions, and different timing/order.
- Distinguish margin preserved along the path from the same terminal margin.
- Do not infer timing from cascade depth or claim overload, concurrency cost, permanent avoidance, optimization, or a preferred sequence.
- Write observationally, not prescriptively. Human judgment remains authoritative.`;
}

/* Longer phrases first where overlaps matter. Executive demo surface only (post-process). */
const ORG_SURFACE_PAIRS_SV: [RegExp, string][] = [
  [/Hyresgäststabilitet/gi, "Leveransstabilitet"],
  [/hyresgäststabilitet/gi, "leveransstabilitet"],
  [/Finansierings- och omprioriteringsrisk/gi, "Omprioriterings- och beroendetryck i genomförande"],
  [/Refinansieringsrisk/gi, "Sekvens- och beroendetryck i genomförande"],
  [/refinansieringsrisk/gi, "sekvens- och beroendetryck i genomförande"],
  [/Tillgänglighet i nätverket/gi, "Genomföringsfokus över funktioner"],
  [/tillgängligheten i transportsystemet/gi, "samordnings- och leveransytan"],
  [/Kapacitetstryck i nätverket/gi, "Koordinations- och kapacitetstryck"],
  [/Kapitalbindning/gi, "Resursinlåsning"],
  [/kapitalbindning/gi, "resursinlåsning"],
  [/Underhållstryck/gi, "Underhåll av löpande kapacitet"],
  [/Underhållskapacitet/gi, "Leveranskapacitet"],
  [/underhållskapacitet/gi, "leveranskapacitet"],
  [/Ränteexponering/gi, "Kostnadstryck på förändringsbudget"],
  [/Belåningsnivå/gi, "Strukturell samordningsbelastning"],
  [/Efterfrågan/gi, "Efterfrågan på genomförandekapacitet"],
  [/efterfrågetryck i transportsystemet/gi, "tryck på genomförandekapacitet"],
  [/transportsystemet/gi, "verksamheten"],
  [/Transportnätverket/gi, "Initiativportföljen"],
  [/transport/gi, "genomförande"],
  [/Portföljen/gi, "Initiativportföljen"],
  [/portföljen/gi, "initiativportföljen"],
  [/Programportföljen/gi, "Initiativportföljen"],
  [/programportföljen/gi, "initiativportföljen"],
  [/Likviditetspress/gi, "Operativ flexibilitet i genomförande"],
  [/Budgettryck/gi, "Budgetspänning i genomförande"],
  [/budgettryck/gi, "budgetspänning i genomförande"],
  [/Genomförandetakt/gi, "Implementeringstakt"],
  [/genomförandetakt/gi, "implementeringstakt"],
  [/policydrivare/gi, "styrande initiativ"],
  [/Policydrivare/gi, "Styrande initiativ"],
  [/Primär drivare/gi, "Primärt genomföringsgrepp"],
  [/primär drivare/gi, "primära genomföringsgreppet"],
  [/Systemdrivare/gi, "Operativt beroende"],
  [/systemdrivare/gi, "operativt beroende"],
  [/Systemtryck/gi, "Genomföringstryck"],
  [/systemtryck/gi, "genomföringstryck"],
  [/kassaflöde/gi, "resurstillförsel till förändringsarbete"],
  [/beläggning/gi, "nyttjande av genomföringskapacitet"],
  [/Kassaflöde/gi, "Resurstillförsel till förändringsarbete"],
  [/finansiering/gi, "resursallokering"],
  [/Finansiering/gi, "Resursallokering"],
  [/likviditet/gi, "operativ flexibilitet"],
  [/Likviditet/gi, "Operativ flexibilitet"],
  [/Beläggning/gi, "Bindning av genomföringskapacitet"],
  [/Nätverkseffektivitet/gi, "Process- och beslutseffektivitet"],
  [/Tillgänglighet/gi, "Genomföringsbarhet"],
  [/refinansiering/gi, "genomföringssekvensering"],
  [/Refinansiering/gi, "Genomföringssekvensering"],
  [/refinansieringskapacitet/gi, "sekvensutrymme"],
  [/Refinansieringskapacitet/gi, "Sekvensutrymme"],
  [/refinansieringstryck/gi, "genomföringslast"],
  [/Strukturell marginal påverkas/gi, "Genomföringsflexibiliteten påverkas via delade beroenden"],
  [/Trycket är måttligt/gi, "Samordningstryck börjar koncentreras"],
  [/trycket är måttligt/gi, "samordningstryck börjar koncentreras"],
  [/Affärsanalys/gi, "Strukturell tolkning"],
  [/affärsanalys/gi, "strukturell tolkning"],
  [/Framåtblick/gi, "Tryckets utveckling"],
  [/kapacitetsutnyttjande/gi, "användning av genomföringskapacitet"],
  [/Kapacitetsutnyttjande/gi, "Användning av genomföringskapacitet"],
];

const ORG_SURFACE_PAIRS_EN: [RegExp, string][] = [
  [/Program Initiative portfolio/gi, "Initiative portfolio"],
  [/program initiative portfolio/gi, "initiative portfolio"],
  [/Program portfolio/gi, "Initiative portfolio"],
  [/program portfolio/gi, "initiative portfolio"],
  [/Transport network/gi, "Initiative portfolio"],
  [/Network capacity pressure/gi, "Coordination and capacity strain"],
  [/Refinancing risk/gi, "Execution sequencing and dependency load"],
  [/refinancing risk/gi, "execution sequencing and dependency load"],
  [/refinancing capacity/gi, "sequencing headroom"],
  [/Refinancing capacity/gi, "Sequencing headroom"],
  [/refinancing stress/gi, "execution strain"],
  [/Refinancing stress/gi, "Execution strain"],
  [/Funding and reprioritization risk/gi, "Reprioritization and dependency load"],
  [/funding and reprioritization risk/gi, "reprioritization and dependency load"],
  [/Refinancing/gi, "Execution sequencing"],
  [/refinancing/gi, "execution sequencing"],
  [/Interest[- ]rate exposure/gi, "Cost pressure on the change budget"],
  [/Tenant stability/gi, "Delivery stability"],
  [/tenant stability/gi, "delivery stability"],
  [/Accessibility/gi, "Cross-team executability"],
  [/accessibility/gi, "executability across teams"],
  [/Capital commitment rigidity/gi, "Resource lock-in"],
  [/Maintenance pressure/gi, "Operational upkeep strain"],
  [/Maintenance Pressure/gi, "Operational upkeep strain"],
  [/Maintenance capacity/gi, "Delivery capacity"],
  [/maintenance capacity/gi, "delivery capacity"],
  [/Transport demand pressure/gi, "Pressure on execution throughput"],
  [/transport system/gi, "operating model"],
  [/Portfolio/gi, "Initiative portfolio"],
  [/portfolio/gi, "initiative portfolio"],
  [/Liquidity pressure/gi, "Operational flexibility headroom"],
  [/liquidity pressure/gi, "operational flexibility headroom"],
  [/Liquidity/gi, "Operational flexibility"],
  [/\bliquidity\b/gi, "operational flexibility"],
  [/Leverage level/gi, "Coordination load"],
  [/\bleverage\b/gi, "coordination load"],
  [/Financing/gi, "Resource commitment"],
  [/\bfinancing\b/gi, "resource commitment"],
  [/capital lock-in/gi, "resource lock-in"],
  [/Capital lock-in/gi, "Resource lock-in"],
  [/Budget pressure/gi, "Budget tension in delivery"],
  [/Primary driver/gi, "Primary execution lever"],
  [/primary driver/gi, "primary execution lever"],
  [/System driver/gi, "Operational dependency"],
  [/Policy driver/gi, "Governing initiative"],
  [/System pressure/gi, "Execution pressure"],
  [/system pressure/gi, "execution pressure"],
  [/Pressure is moderate/gi, "Coordination strain is concentrating"],
  [/pressure is moderate/gi, "coordination strain is concentrating"],
  [/Business Analysis/gi, "Structural read"],
  [/business analysis/gi, "structural read"],
  [/Forward Outlook/gi, "Pressure evolution"],
  [/forward outlook/gi, "pressure evolution"],
  [/Executive Summary/gi, "Overview"],
  [/executive summary/gi, "overview"],
  [/Here is my analysis/gi, "The pattern shows"],
  [/here is my analysis/gi, "The pattern shows"],
  [/To avoid this, consider/gi, "Observed pattern:"],
  [/to avoid this, consider/gi, "Observed pattern:"],
  [/Cash flow/gi, "Resource flow to change work"],
  [/occupancy/gi, "execution capacity positioning"],
  [/Occupancy/gi, "Execution capacity positioning"],
  [/Capacity utilization/gi, "Use of execution capacity"],
  [/capacity utilization/gi, "use of execution capacity"],
  [/maintenance choices/gi, "operational trade-offs"],
  [/Maintenance choices/gi, "Operational trade-offs"],
  [/Structural margin affected/gi, "Execution flexibility narrows through shared dependencies"],
  [/capital structure/gi, "resource posture"],
  [/covenant/gi, "constraint"],
  [/\bdebt\b/gi, "fixed commitment"],
  [/Network efficiency/gi, "Process and decision efficiency"],
  [/\bDemand risk\b/gi, "Capacity-demand risk"],
];
