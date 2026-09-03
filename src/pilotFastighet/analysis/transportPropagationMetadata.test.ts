import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildDomainPropagationEvents } from "../../../app/pilot-fastighet/components/inspector-utils/buildDomainPropagationEvents";
import { resolveExecutableDomainProfile } from "../executableDomainProfile";
import {
  TRANSPORT_PROPAGATION_METADATA,
  TRANSPORT_SYSTEM_DRIVERS,
} from "../transportDomainMapping";
import { resolveTransportInspectorContext } from "../transportInspectorAdapter";

const APPROVED = [
  "accessibility->demandRisk",
  "budget_pressure->capitalCommitmentRigidityRisk",
  "operationalEfficiencyRisk->maintenanceIntensityRisk",
] as const;

const REMOVED = [
  "operational_capacity->tenantStabilityRisk",
  "capitalCommitmentRigidityRisk->operationalEfficiencyRisk",
  "capitalCommitmentRigidityRisk->maintenanceIntensityRisk",
  "operationalEfficiencyRisk->tenantStabilityRisk",
  "maintenanceIntensityRisk->tenantStabilityRisk",
  "tenantStabilityRisk->demandRisk",
] as const;

function profileEdges(): string[] {
  const profile = resolveExecutableDomainProfile("legacy-municipal-v1", "municipal");
  return Object.entries(profile.propagationRules)
    .flatMap(([source, effects]) =>
      effects.map(({ target }) => `${source}->${target}`)
    )
    .sort();
}

test("Transport propagation metadata derives exactly the executable profile edges", () => {
  const metadataEdges = TRANSPORT_PROPAGATION_METADATA.map(({ edgeId }) => edgeId).sort();
  assert.deepEqual(metadataEdges, [...APPROVED].sort());
  assert.deepEqual(metadataEdges, profileEdges());
  for (const entry of TRANSPORT_PROPAGATION_METADATA) {
    assert.ok(entry.description.sv);
    assert.ok(entry.description.en);
  }
});

test("removed paths are absent from bilingual metadata and system-driver chains", () => {
  const serialized = JSON.stringify({
    metadata: TRANSPORT_PROPAGATION_METADATA,
    chains: Object.values(TRANSPORT_SYSTEM_DRIVERS).map(
      ({ propagationChain }) => propagationChain
    ),
  });
  for (const edge of REMOVED) {
    const [source, target] = edge.split("->");
    assert.equal(serialized.includes(edge), false);
    assert.equal(
      Object.values(TRANSPORT_SYSTEM_DRIVERS).some(({ propagationChain }) => {
        const sourceIndex = propagationChain.indexOf(source as never);
        return sourceIndex >= 0 && propagationChain[sourceIndex + 1] === target;
      }),
      false
    );
  }
  assert.doesNotMatch(serialized, /tenantStabilityRisk|demand-base stability/i);
});

test("Inspector exposes actual approved events and suppresses unavailable or removed paths", () => {
  const approvedEvent = {
    step: 2,
    sourceRisk: "budget_pressure",
    targetRisk: "capitalCommitmentRigidityRisk",
    level: "HIGH" as const,
    iteration: 1,
  };
  const approved = resolveTransportInspectorContext({
    language: "en",
    selectedActions: ["expand_cycling_infrastructure"],
    primaryDriverKey: "modal_attractiveness",
    cascadeEventsB: [approvedEvent],
    useExecutableActionPresentation: true,
  });
  assert.match(approved?.propagationChainLabel ?? "", /budget pressure/i);
  assert.match(approved?.propagationChainLabel ?? "", /capital commitment/i);
  assert.ok(approved?.representedEffects?.length);

  const removed = resolveTransportInspectorContext({
    language: "en",
    selectedActions: ["increase_service_frequency"],
    primaryDriverKey: "operational_capacity",
    cascadeEventsB: [{
      ...approvedEvent,
      sourceRisk: "operational_capacity",
      targetRisk: "tenantStabilityRisk",
    }],
    useExecutableActionPresentation: true,
  });
  assert.equal(removed?.propagationChainLabel, "");
});

test("Why/Cascade event construction uses only approved result evidence", () => {
  const stale = buildDomainPropagationEvents(
    "implementationPacing",
    "en",
    [],
    [{
      step: 2,
      sourceRisk: "operational_capacity",
      targetRisk: "tenantStabilityRisk",
      level: "HIGH",
      iteration: 1,
    }]
  );
  assert.deepEqual(stale.events, []);
  assert.equal(stale.primaryPropagationSignatureB, null);

  const approved = buildDomainPropagationEvents(
    "budgetPressure",
    "sv",
    [],
    [{
      step: 2,
      sourceRisk: "budget_pressure",
      targetRisk: "capitalCommitmentRigidityRisk",
      level: "HIGH",
      iteration: 1,
    }]
  );
  assert.equal(approved.events.length, 1);
  assert.match(approved.events[0].label, /kapitalbindning/i);
});

test("the unchanged AI adapter can receive only profile-backed potential metadata", () => {
  const context = resolveTransportInspectorContext({
    language: "en",
    selectedActions: ["increase_service_frequency"],
    primaryDriverKey: "budget_pressure",
  });
  assert.match(context?.propagationChainLabel ?? "", /budget pressure/i);
  assert.match(context?.propagationChainLabel ?? "", /capital commitment/i);
  for (const removed of REMOVED) {
    assert.equal(context?.propagationChainLabel.includes(removed), false);
  }

  const route = readFileSync("app/api/ai-interpretation/route.ts", "utf8");
  assert.doesNotMatch(route, /TRANSPORT_PROPAGATION_METADATA/);
});

test("all deterministic UI consumers request result-backed propagation where available", () => {
  const inspector = readFileSync(
    "app/pilot-fastighet/components/AIInspectorPanel.tsx",
    "utf8"
  );
  const why = readFileSync("app/pilot-fastighet/components/WhyPanel.tsx", "utf8");
  const cascade = readFileSync(
    "app/pilot-fastighet/components/CascadeRendererTransport.tsx",
    "utf8"
  );
  assert.match(inspector, /cascadeEventsA,[\s\S]*cascadeEventsB,/);
  assert.match(why, /cascadeEventsA,[\s\S]*cascadeEventsB,/);
  assert.match(cascade, /cascadeEventsA:\s*\[\],[\s\S]*cascadeEventsB:\s*\[\]/);
});
