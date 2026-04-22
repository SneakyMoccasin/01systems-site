type ActionKey =
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

type DomainKey = "realEstate" | "municipal" | "consulting";

const interventionLabels = {
  increase_service_frequency: {
    sv: "Öka turtäthet",
    en: "Increase service frequency",
  },
  reduce_travel_time: {
    sv: "Minska restid",
    en: "Reduce travel time",
  },
  expand_cycling_infrastructure: {
    sv: "Bygg ut cykelinfrastruktur",
    en: "Expand cycling infrastructure",
  },
  congestion_pricing: {
    sv: "Inför trängselskatt",
    en: "Congestion pricing",
  },
  electrify_bus_fleet: {
    sv: "Elektrifiera bussflotta",
    en: "Electrify bus fleet",
  },
  transit_signal_priority: {
    sv: "Signalprioritera kollektivtrafik",
    en: "Transit signal priority",
  },
  reduce_parking_supply: {
    sv: "Minska parkeringsutbud",
    en: "Reduce parking supply",
  },
  phase_project_starts: {
    sv: "Fasa projektstarter",
    en: "Phase project starts",
  },
  stagger_project_starts: {
    sv: "Sprid projektstarter över tid",
    en: "Stagger project starts",
  },
  increase_liquidity_buffer: {
    sv: "Öka likviditetsbuffert",
    en: "Increase liquidity buffer",
  },
  reduce_leverage: {
    sv: "Minska belåning",
    en: "Reduce leverage",
  },
  secure_long_term_leases: {
    sv: "Säkra långfristiga hyresavtal",
    en: "Secure long-term leases",
  },
  energy_retrofit_program: {
    sv: "Genomför energirenoveringsprogram",
    en: "Energy retrofit program",
  },
  delay_maintenance: {
    sv: "Skjut upp underhåll",
    en: "Delay maintenance",
  },
  early_refinancing: {
    sv: "Tidigarelägg refinansiering",
    en: "Early refinancing",
  },
} as const;

interface Props {
  language: "sv" | "en";
  domain?: DomainKey;
  selectedActions: string[];
  applyAction: (action: ActionKey) => void;
}

export default function ActionPanel({
  language,
  domain = "consulting",
  selectedActions,
  applyAction,
}: Props) {
  const interventionSectionTitles = {
    realEstate: { sv: "Interventioner", en: "Interventions" },
    municipal: { sv: "Åtgärder", en: "Measures" },
    consulting: { sv: "Beslut", en: "Decisions" },
  } as const;
  const domainActions: Record<DomainKey, ActionKey[]> = {
    realEstate: [
      "delay_maintenance",
      "early_refinancing",
      "phase_project_starts",
      "stagger_project_starts",
      "increase_liquidity_buffer",
      "reduce_leverage",
      "secure_long_term_leases",
      "energy_retrofit_program",
    ],
    municipal: [
      "increase_service_frequency",
      "reduce_travel_time",
      "expand_cycling_infrastructure",
      "congestion_pricing",
      "electrify_bus_fleet",
      "transit_signal_priority",
      "reduce_parking_supply",
    ],
    consulting: [
      "increase_service_frequency",
      "reduce_travel_time",
      "expand_cycling_infrastructure",
      "congestion_pricing",
      "electrify_bus_fleet",
      "transit_signal_priority",
      "reduce_parking_supply",
      "phase_project_starts",
      "delay_maintenance",
      "early_refinancing",
    ],
  };
  const actions = domainActions[domain] ?? domainActions.consulting;

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
        {interventionSectionTitles[domain]?.[language] ?? "Decisions"}
      </h3>

      <div className="flex flex-col gap-2">
        {actions.map((action) => (
          <button
            key={action}
            className={`px-3 py-2 text-left rounded-lg border transition ${
              selectedActions.includes(action)
                ? "bg-blue-600 text-white border-blue-500"
                : "bg-transparent text-gray-200 border-gray-500 hover:bg-gray-700"
            }`}
            onClick={() => applyAction(action)}
          >
            {interventionLabels[action][language]}
          </button>
        ))}
      </div>
    </div>
  );
}
