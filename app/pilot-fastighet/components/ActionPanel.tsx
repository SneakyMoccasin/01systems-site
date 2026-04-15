type ActionKey =
  | "increase_service_frequency"
  | "reduce_travel_time"
  | "expand_cycling_infrastructure"
  | "congestion_pricing"
  | "electrify_bus_fleet"
  | "transit_signal_priority"
  | "reduce_parking_supply"
  | "phase_project_starts"
  | "delay_maintenance"
  | "early_refinancing";

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
  selectedActions: string[];
  applyAction: (action: ActionKey) => void;
}

export default function ActionPanel({
  language,
  selectedActions,
  applyAction,
}: Props) {
  const actions: ActionKey[] = [
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
  ];

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
        {language === "sv" ? "Interventioner" : "Interventions"}
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
