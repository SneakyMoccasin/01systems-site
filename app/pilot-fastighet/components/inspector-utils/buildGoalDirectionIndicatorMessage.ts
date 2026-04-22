type GoalConditionedSystemStatusMessage = {
  scenarioDirection: "baseline" | "target";
  messageKey: string;
};

export function buildGoalDirectionIndicatorMessage(
  goalConditionedSystemStatusMessage: GoalConditionedSystemStatusMessage | null,
  language: "sv" | "en",
  caseType?: "transport" | "real-estate" | null
): string | null {
  if (caseType !== "transport" || !goalConditionedSystemStatusMessage) {
    return null;
  }

  const towardGoalPrefix =
    goalConditionedSystemStatusMessage.scenarioDirection === "target"
      ? language === "sv"
        ? "Målstrategin rör sig längre mot analysmålet"
        : "The target strategy moves further toward the analysis goal"
      : language === "sv"
      ? "Nulägesstrategin ligger närmare analysmålet under analysperioden"
      : "The baseline strategy remains closer to the analysis goal";

  switch (goalConditionedSystemStatusMessage.messageKey) {
    case "activationTiming":
      return language === "sv"
        ? `${towardGoalPrefix} genom senare aktivering av strukturella begränsningar.`
        : `${towardGoalPrefix} by delaying structural constraint activation.`;

    case "marginPreservation":
      return language === "sv"
        ? `${towardGoalPrefix} genom att bevara handlingsutrymme längre över analysperioden.`
        : `${towardGoalPrefix} by preserving decision flexibility longer across the analysis horizon.`;

    case "constraintAvoidance":
      return language === "sv"
        ? `${towardGoalPrefix} genom att undvika kritiska strukturella begränsningar.`
        : `${towardGoalPrefix} by avoiding critical structural constraints.`;

    case "flexibilityWindow":
    default:
      return language === "sv"
        ? goalConditionedSystemStatusMessage.scenarioDirection === "target"
          ? `${towardGoalPrefix} genom hur systemtrycket utvecklas över tid.`
          : `${towardGoalPrefix} utifrån hur systemtrycket utvecklas över tid.`
        : goalConditionedSystemStatusMessage.scenarioDirection === "target"
        ? `${towardGoalPrefix} through how system pressure evolves over time.`
        : `${towardGoalPrefix} based on how system pressure evolves over time.`;
  }
}
