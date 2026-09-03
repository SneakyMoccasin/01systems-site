import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolveExecutableDomainProfile } from "../executableDomainProfile";
import {
  getTransportActionPresentation,
  TRANSPORT_ACTION_PRESENTATION,
} from "../transportDomainMapping";
import { resolveTransportInspectorContext } from "../transportInspectorAdapter";

const profile = resolveExecutableDomainProfile("legacy-municipal-v1");

test("every displayed Transport effect exactly matches executable driver and direction", () => {
  for (const [actionId, presentation] of Object.entries(
    TRANSPORT_ACTION_PRESENTATION
  )) {
    const executable = profile.actionEffects[
      actionId as keyof typeof profile.actionEffects
    ];
    const expected = Object.entries(executable)
      .map(([driverId, delta]) => ({
        driverId,
        direction: delta > 0 ? "increase" : "decrease",
      }))
      .sort((left, right) => left.driverId.localeCompare(right.driverId));
    const presented = presentation.effects
      .map(({ driverId, direction }) => ({ driverId, direction }))
      .sort((left, right) => left.driverId.localeCompare(right.driverId));
    assert.deepEqual(presented, expected, actionId);
    assert.equal(new Set(presented.map(({ driverId }) => driverId)).size, presented.length);
  }
});

test("cycling, electrification, travel time, and signal priority expose only represented effects", () => {
  assert.deepEqual(
    getTransportActionPresentation("expand_cycling_infrastructure")?.effects.map(
      ({ driverId }) => driverId
    ),
    ["modal_attractiveness", "congestion_pressure", "budget_pressure"]
  );
  assert.deepEqual(
    getTransportActionPresentation("electrify_bus_fleet")?.effects.map(
      ({ driverId }) => driverId
    ),
    [
      "energyExposureRisk",
      "operationalEfficiencyRisk",
      "capitalCommitmentRigidityRisk",
    ]
  );
  assert.deepEqual(
    getTransportActionPresentation("reduce_travel_time")?.effects.map(
      ({ driverId }) => driverId
    ),
    ["modal_attractiveness"]
  );
  assert.deepEqual(
    getTransportActionPresentation("transit_signal_priority")?.effects.map(
      ({ driverId }) => driverId
    ),
    ["transit_signal_priority"]
  );
});

test("parking states only adverse demand risk and disclaims uncalculated benefits", () => {
  const parking = getTransportActionPresentation("reduce_parking_supply");
  assert.deepEqual(parking?.effects.map(({ driverId, direction, role }) => ({
    driverId,
    direction,
    role,
  })), [
    {
      driverId: "demandRisk",
      direction: "increase",
      role: "represented-trade-off",
    },
  ]);
  assert.match(parking?.operationalDescription.en ?? "", /adverse demand risk/i);
  assert.match(parking?.operationalDescription.en ?? "", /no mode-shift/i);
  assert.match(parking?.operationalDescription.sv ?? "", /negativ efterfrågerisk/i);
  assert.match(parking?.operationalDescription.sv ?? "", /ingen effekt/i);
});

test("Swedish and English mappings retain identical structured semantics", () => {
  for (const presentation of Object.values(TRANSPORT_ACTION_PRESENTATION)) {
    assert.ok(presentation.actionLabel.sv && presentation.actionLabel.en);
    assert.ok(
      presentation.operationalDescription.sv &&
        presentation.operationalDescription.en
    );
    for (const effect of presentation.effects) {
      assert.ok(effect.label.sv && effect.label.en);
    }

    const primaryDriverKey = presentation.effects[0]?.driverId;
    const sv = resolveTransportInspectorContext({
      useExecutableActionPresentation: true,
      language: "sv",
      selectedActions: [presentation.actionId],
      primaryDriverKey,
    });
    const en = resolveTransportInspectorContext({
      useExecutableActionPresentation: true,
      language: "en",
      selectedActions: [presentation.actionId],
      primaryDriverKey,
    });
    assert.equal(sv?.policyLeverLabel, presentation.actionLabel.sv);
    assert.equal(en?.policyLeverLabel, presentation.actionLabel.en);
    assert.deepEqual(
      sv?.representedEffects?.map(({ driverId, direction, role }) => ({
        driverId,
        direction,
        role,
      })),
      en?.representedEffects?.map(({ driverId, direction, role }) => ({
        driverId,
        direction,
        role,
      }))
    );
  }
});

test("unknown actions produce no rows and deterministic UI consumers opt into one mapping", () => {
  assert.equal(getTransportActionPresentation("unknown"), null);
  assert.equal(
    resolveTransportInspectorContext({
      useExecutableActionPresentation: true,
      language: "en",
      selectedActions: ["unknown"],
      primaryDriverKey: "accessibility",
    }),
    null
  );

  const page = readFileSync("app/pilot-fastighet/page.tsx", "utf8");
  const inspector = readFileSync(
    "app/pilot-fastighet/components/AIInspectorPanel.tsx",
    "utf8"
  );
  const cascade = readFileSync(
    "app/pilot-fastighet/components/CascadeRendererTransport.tsx",
    "utf8"
  );
  const why = readFileSync(
    "app/pilot-fastighet/components/WhyPanel.tsx",
    "utf8"
  );
  assert.match(page, /useExecutableActionPresentation:\s*true/);
  assert.match(inspector, /useExecutableActionPresentation:\s*true/);
  assert.match(cascade, /useExecutableActionPresentation:\s*true/);
  assert.match(why, /useExecutableActionPresentation:\s*true/);
  assert.match(inspector, /transportInspectorContext\.representedEffects/);
});

test("the AI route retains its existing legacy adapter mode", () => {
  const route = readFileSync("app/api/ai-interpretation/route.ts", "utf8");
  assert.doesNotMatch(route, /useExecutableActionPresentation/);
  assert.equal(
    resolveTransportInspectorContext({
      language: "en",
      selectedActions: ["electrify_bus_fleet"],
      primaryDriverKey: "capitalCommitmentRigidityRisk",
    }),
    null
  );
});
