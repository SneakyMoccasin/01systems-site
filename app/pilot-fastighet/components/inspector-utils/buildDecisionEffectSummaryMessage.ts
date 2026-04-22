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
  language: "sv" | "en",
  caseType?: "transport" | "real-estate" | null
): string | null {
  if (caseType !== "transport") return null;
  if (!primaryDriver || !goalConditionedSystemStatusMessage) return null;
  if (goalConditionedSystemStatusMessage.scenarioDirection !== "target") {
    return null;
  }

  const driverText =
    propagationRootComparisonMessage?.scenarioDirection === "target"
      ? propagationRootComparisonMessage.driverB
      : primaryDriver;

  switch (goalConditionedSystemStatusMessage.messageKey) {
    case "activationTiming":
      return language === "sv"
        ? `Målstrategin förbättrar ${driverText.toLowerCase()} utan att tidigarelägga aktivering av strukturella begränsningar.`
        : `The target strategy improves ${driverText.toLowerCase()} without advancing structural constraint activation.`;

    case "marginPreservation":
      return language === "sv"
        ? `Målstrategin förbättrar ${driverText.toLowerCase()} och bevarar handlingsutrymme längre.`
        : `The target strategy improves ${driverText.toLowerCase()} and preserves decision flexibility longer.`;

    case "constraintAvoidance":
      return language === "sv"
        ? `Målstrategin förbättrar ${driverText.toLowerCase()} utan att aktivera kritiska begränsningar.`
        : `The target strategy improves ${driverText.toLowerCase()} without activating critical constraints.`;

    case "flexibilityWindow":
    default:
      return language === "sv"
        ? dominantConstraint
          ? `Målstrategin stärker ${driverText.toLowerCase()} utan att tidigarelägga ${dominantConstraint.toLowerCase()}.`
          : `Målstrategin stärker ${driverText.toLowerCase()} utan att tidigarelägga strukturella begränsningar.`
        : dominantConstraint
        ? `The target strategy strengthens ${driverText.toLowerCase()} without bringing ${dominantConstraint.toLowerCase()} forward.`
        : `The target strategy improves ${driverText.toLowerCase()} without advancing structural constraints.`;
  }
}
