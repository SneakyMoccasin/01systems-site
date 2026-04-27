type PropagationRootDifference = {
  driverA: string;
  driverB: string;
  scenarioDirection: "baseline" | "target";
};

type GoalConditionedStatus = {
  scenarioDirection: "baseline" | "target";
  messageKey: string;
};

type UiMode = "expert" | "executive";

export function buildExecutiveSummaryMessage(
  primaryDriver: string | null,
  dominantConstraint: string | null,
  propagationRootDifference: PropagationRootDifference | null,
  goalConditionedStatus: GoalConditionedStatus | null,
  uiLanguage: "sv" | "en",
  caseType?: "transport" | "real-estate" | null,
  uiMode: UiMode = "executive",
  scenarioTarget?: string
): string | null {
  if (caseType !== "transport") return null;
  if (!primaryDriver) return null;

  if (scenarioTarget === "reduce_capacity_pressure") {
    return "Strategin minskar kapacitetstrycket i nätverket utan att skapa nya kritiska begränsningar.";
  }

  if (scenarioTarget === "increase_accessibility") {
    return "Strategin förbättrar tillgängligheten strukturellt genom att stärka nätverkets funktionella kopplingar.";
  }

  if (scenarioTarget === "increase_modal_attractiveness") {
    return "Strategin stärker kollektivtrafikens attraktivitet genom att påverka restid, prioritering och upplevd tillgänglighet.";
  }

  if (scenarioTarget === "stabilize_margins") {
    return "Strategin stabiliserar systemets marginaler och minskar risken för strukturell instabilitet.";
  }

  if (scenarioTarget === "avoid_tipping") {
    return "Strategin minskar risken att systemet närmar sig kritiska tipping-punkter.";
  }

  if (
    propagationRootDifference &&
    goalConditionedStatus?.messageKey === "activationTiming"
  ) {
    if (uiMode === "executive") {
      return uiLanguage === "sv"
        ? `${propagationRootDifference.driverB} påverkar genomförandekapaciteten tidigt i strategin, vilket förskjuter när begränsningar börjar påverka genomförandet och begränsar hur snabbt åtgärder kan få genomslag i transportsystemet.`
        : `${propagationRootDifference.driverB} becomes the main factor influencing implementation in the selected strategy, which shifts when limitations begin to matter and slows how quickly actions can take effect in the transport system.`;
    }

    return uiLanguage === "sv"
      ? `${propagationRootDifference.driverB} blir det dominerande trycket i målstrategin, vilket förskjuter när strukturella begränsningar börjar påverka genomförandet och begränsar hur snabbt åtgärder kan få genomslag i transportsystemet.`
      : `${propagationRootDifference.driverB} becomes the dominant pressure in the target strategy, which shifts when structural limits start to matter and slows how quickly implementation can convert policy into system change.`;
  }

  if (propagationRootDifference) {
    if (uiMode === "executive") {
      return uiLanguage === "sv"
        ? `${propagationRootDifference.driverB} påverkar hur effekten sprids i systemet och var begränsningar börjar byggas upp.`
        : `${propagationRootDifference.driverB} becomes the main factor influencing implementation in the selected strategy and changes how the effect spreads through the system and where limitations build first.`;
    }

    return uiLanguage === "sv"
      ? `${propagationRootDifference.driverB} blir den dominerande strukturella mekanismen i målstrategin och förändrar hur genomförandetryck sprids i systemet och var strukturella begränsningar först byggs upp.`
      : `${propagationRootDifference.driverB} becomes the dominant structural mechanism in the target strategy, reshaping how pressure spreads through implementation and where system constraints build first.`;
  }

  if (
    goalConditionedStatus?.messageKey === "marginPreservation"
  ) {
    if (uiMode === "executive") {
      return uiLanguage === "sv"
        ? `${primaryDriver} är den viktigaste påverkande faktorn och avgör hur länge transportsystemet kan bevara handlingsutrymme innan trycket blir kritiskt.`
        : `${primaryDriver} is the main influencing factor, determining how long the transport system can preserve room to act before pressure becomes critical.`;
    }

    return uiLanguage === "sv"
      ? `${primaryDriver} är den dominerande strukturella mekanismen och avgör hur länge transportsystemet kan bevara handlingsutrymme innan trycket blir kritiskt.`
      : `${primaryDriver} is the dominant structural mechanism, determining how long the transport system can preserve margin before pressure becomes critical.`;
  }

  if (
    goalConditionedStatus?.messageKey === "constraintAvoidance"
  ) {
    if (uiMode === "executive") {
      return uiLanguage === "sv"
        ? `${primaryDriver} är den viktigaste påverkande faktorn och förändrar vilka begränsningar transportsystemet kan undvika när genomförandetrycket ökar.`
        : `${primaryDriver} is the main influencing factor, changing which limitations the transport system can avoid as implementation pressure builds.`;
    }

    return uiLanguage === "sv"
      ? `${primaryDriver} är den dominerande strukturella mekanismen och förändrar vilka strukturella begränsningar transportsystemet kan undvika när genomförandetrycket ökar.`
      : `${primaryDriver} is the dominant structural mechanism, changing which limits the transport system can avoid as implementation pressure builds.`;
  }

  if (
    goalConditionedStatus?.messageKey === "activationTiming" &&
    dominantConstraint
  ) {
    if (uiMode === "executive") {
      return uiLanguage === "sv"
        ? `${primaryDriver} är den viktigaste påverkande faktorn, och ${dominantConstraint} är den begränsning som tydligast påverkar hur snabbt åtgärder kan få genomslag i transportsystemet.`
        : `${primaryDriver} is the main influencing factor, and ${dominantConstraint} is the limitation that most clearly affects how quickly actions can take effect in the transport system.`;
    }

    return uiLanguage === "sv"
      ? `${primaryDriver} är den dominerande strukturella mekanismen, och ${dominantConstraint} är det som tydligast begränsar hur snabbt åtgärder kan få genomslag i transportsystemet.`
      : `${primaryDriver} is the dominant structural mechanism, and ${dominantConstraint} is what most clearly limits how quickly policy improvements can take effect.`;
  }

  if (uiMode === "executive") {
    return uiLanguage === "sv"
      ? `${primaryDriver} är den viktigaste påverkande faktorn som formar hur effekten sprids genom transportsystemet.`
      : `${primaryDriver} is the main influencing factor shaping how the effect spreads through the transport system.`;
  }

  return uiLanguage === "sv"
    ? `${primaryDriver} är den dominerande strukturella mekanismen som formar hur genomförandetryck sprids genom transportsystemet.`
    : `${primaryDriver} is the dominant structural mechanism shaping how implementation pressure spreads through the transport system.`;
}
