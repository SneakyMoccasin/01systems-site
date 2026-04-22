type PropagationRootDifference = {
  driverA: string;
  driverB: string;
  scenarioDirection: "baseline" | "target";
};

type GoalConditionedStatus = {
  scenarioDirection: "baseline" | "target";
  messageKey: string;
};

export function buildExecutiveSummaryMessage(
  primaryDriver: string | null,
  dominantConstraint: string | null,
  propagationRootDifference: PropagationRootDifference | null,
  goalConditionedStatus: GoalConditionedStatus | null,
  language: "sv" | "en" = "en",
  caseType?: "transport" | "real-estate" | null
): string | null {
  if (caseType !== "transport") return null;
  if (!primaryDriver) return null;

  if (
    propagationRootDifference &&
    goalConditionedStatus?.messageKey === "activationTiming"
  ) {
    return language === "sv"
      ? `${propagationRootDifference.driverB} blir det dominerande trycket i målstrategin, vilket förskjuter när strukturella begränsningar börjar påverka genomförandet och begränsar hur snabbt åtgärder kan få genomslag i transportsystemet.`
      : `${propagationRootDifference.driverB} becomes the dominant pressure in the target strategy, which shifts when structural limits start to matter and slows how quickly implementation can convert policy into system change.`;
  }

  if (propagationRootDifference) {
    return language === "sv"
      ? `${propagationRootDifference.driverB} blir den dominerande strukturella mekanismen i målstrategin och förändrar hur genomförandetryck sprids i systemet och var strukturella begränsningar först byggs upp.`
      : `${propagationRootDifference.driverB} becomes the dominant structural mechanism in the target strategy, reshaping how pressure spreads through implementation and where system constraints build first.`;
  }

  if (
    goalConditionedStatus?.messageKey === "marginPreservation"
  ) {
    return language === "sv"
      ? `${primaryDriver} är den dominerande strukturella mekanismen och avgör hur länge transportsystemet kan bevara handlingsutrymme innan trycket blir kritiskt.`
      : `${primaryDriver} is the dominant structural mechanism, determining how long the transport system can preserve margin before pressure becomes critical.`;
  }

  if (
    goalConditionedStatus?.messageKey === "constraintAvoidance"
  ) {
    return language === "sv"
      ? `${primaryDriver} är den dominerande strukturella mekanismen och förändrar vilka strukturella begränsningar transportsystemet kan undvika när genomförandetrycket ökar.`
      : `${primaryDriver} is the dominant structural mechanism, changing which limits the transport system can avoid as implementation pressure builds.`;
  }

  if (
    goalConditionedStatus?.messageKey === "activationTiming" &&
    dominantConstraint
  ) {
    return language === "sv"
      ? `${primaryDriver} är den dominerande strukturella mekanismen, och ${dominantConstraint} är det som tydligast begränsar hur snabbt åtgärder kan få genomslag i transportsystemet.`
      : `${primaryDriver} is the dominant structural mechanism, and ${dominantConstraint} is what most clearly limits how quickly policy improvements can take effect.`;
  }

  return language === "sv"
    ? `${primaryDriver} är den dominerande strukturella mekanismen som formar hur genomförandetryck sprids genom transportsystemet.`
    : `${primaryDriver} is the dominant structural mechanism shaping how implementation pressure spreads through the transport system.`;
}
