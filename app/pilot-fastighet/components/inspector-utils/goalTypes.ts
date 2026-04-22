export type GoalType =
  | "robustness"
  | "delay"
  | "avoidance"
  | "margin-preservation";

export const DEFAULT_GOAL_TYPE: GoalType = "robustness";

export const TRANSPORT_GOAL_LABELS: Record<
  GoalType,
  { sv: string; en: string }
> = {
  robustness: { sv: "Strukturell robusthet", en: "Structural robustness" },
  delay: { sv: "Fördröj begränsningar", en: "Delay constraints" },
  avoidance: { sv: "Undvik begränsningar", en: "Avoid constraints" },
  "margin-preservation": { sv: "Bevara marginalnivå", en: "Preserve margin" },
};

export const REAL_ESTATE_GOAL_LABELS: Record<
  GoalType,
  { sv: string; en: string }
> = {
  robustness: {
    sv: "Behåll genomförandestabilitet",
    en: "Maintain execution stability",
  },
  delay: {
    sv: "Minimera kapitalbindningslåsning",
    en: "Delay capital lock-in",
  },
  avoidance: {
    sv: "Undvik refinansieringsrisk",
    en: "Avoid refinancing risk",
  },
  "margin-preservation": {
    sv: "Bevara portföljflexibilitet",
    en: "Preserve portfolio flexibility",
  },
};
