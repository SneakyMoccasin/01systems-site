type GoalConditionedSystemStatusMessage = {
  scenarioDirection: "baseline" | "target";
  messageKey: string;
};

type PropagationRootComparisonMessage = {
  driverA: string;
  driverB: string;
  scenarioDirection: "baseline" | "target";
};

export function buildDecisionEffectSummaryMessage(
  primaryDriver: string | null,
  dominantConstraint: string | null,
  goalConditionedSystemStatusMessage: GoalConditionedSystemStatusMessage | null,
  propagationRootComparisonMessage: PropagationRootComparisonMessage | null,
  uiLanguage: "sv" | "en",
  caseType?: "transport" | "real-estate" | null,
  scenarioTarget?: string | null
): string | null {
  if (caseType !== "transport") return null;
  if (!primaryDriver || !goalConditionedSystemStatusMessage) return null;
  if (goalConditionedSystemStatusMessage.scenarioDirection !== "target") {
    return null;
  }

  const toNarrativeCase = (label: string) =>
    label.length > 0
      ? label.charAt(0).toLocaleLowerCase(
          uiLanguage === "sv" ? "sv-SE" : "en-US"
        ) + label.slice(1)
      : label;

  const driverText =
    propagationRootComparisonMessage?.scenarioDirection === "target"
      ? propagationRootComparisonMessage.driverB
      : primaryDriver;

  const goalAwareFallback = () => {
    if (scenarioTarget === "increase_accessibility") {
      return uiLanguage === "sv"
        ? "Strategin förbättrar tillgängligheten utan att tidigarelägga strukturella begränsningar."
        : "The strategy improves accessibility without advancing structural constraints.";
    }

    if (scenarioTarget === "increase_modal_attractiveness") {
      return uiLanguage === "sv"
        ? "Strategin stärker kollektivtrafikens attraktivitet utan att förändra systemets begränsningsstruktur."
        : "The strategy increases modal attractiveness but does not change the constraint structure.";
    }

    if (scenarioTarget === "reduce_capacity_pressure") {
      return uiLanguage === "sv"
        ? "Strategin minskar kapacitetstrycket utan att påverka systemets stabilitetsmarginaler."
        : "The strategy reduces capacity pressure but does not expand structural flexibility.";
    }

    if (scenarioTarget === "margin_stability") {
      return uiLanguage === "sv"
        ? "Strategin bidrar till att stabilisera systemets strukturella marginaler över tid."
        : "The strategy helps stabilize structural margins over time.";
    }

    if (scenarioTarget === "avoid_tipping") {
      return uiLanguage === "sv"
        ? "Strategin minskar risken för att systemet närmar sig tipping-nivåer."
        : "The strategy reduces the risk of the system approaching tipping levels.";
    }

    if (scenarioTarget === "improve_implementation_pacing") {
      return uiLanguage === "sv"
        ? "Strategin förbättrar genomförandetakten utan att tidigarelägga strukturella begränsningar."
        : "The strategy improves implementation pacing without advancing structural constraints.";
    }

    return uiLanguage === "sv"
      ? "Strategin har begränsad strukturell effekt inom analysperioden."
      : "The strategy has limited structural impact within the analysis period.";
  };

  switch (goalConditionedSystemStatusMessage.messageKey) {
    case "activationTiming":
      return uiLanguage === "sv"
        ? `Målstrategin förbättrar ${toNarrativeCase(driverText)} utan att tidigarelägga aktivering av strukturella begränsningar.`
        : `The target strategy improves ${toNarrativeCase(driverText)} without advancing structural constraint activation.`;

    case "marginPreservation":
      return uiLanguage === "sv"
        ? `Målstrategin förbättrar ${toNarrativeCase(driverText)} och bevarar handlingsutrymme längre.`
        : `The target strategy improves ${toNarrativeCase(driverText)} and preserves decision flexibility longer.`;

    case "constraintAvoidance":
      return uiLanguage === "sv"
        ? `Målstrategin förbättrar ${toNarrativeCase(driverText)} utan att aktivera kritiska begränsningar.`
        : `The target strategy improves ${toNarrativeCase(driverText)} without activating critical constraints.`;

    case "flexibilityWindow":
    default:
      return dominantConstraint
        ? uiLanguage === "sv"
          ? `Målstrategin stärker ${toNarrativeCase(driverText)} utan att tidigarelägga ${toNarrativeCase(dominantConstraint)}.`
          : `The target strategy strengthens ${toNarrativeCase(driverText)} without bringing ${toNarrativeCase(dominantConstraint)} forward.`
        : goalAwareFallback();
  }
}
