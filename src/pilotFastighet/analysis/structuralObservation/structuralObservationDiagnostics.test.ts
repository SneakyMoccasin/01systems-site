import assert from "node:assert/strict";
import test from "node:test";
import type { ActionKey } from "../../actionEffects";
import type { StructuralStartAssessment } from "./assessStructuralStarts";
import type { StructuralObservationResult } from "./buildDecisionSpaceSnapshots";
import type {
  DisplayedPeriod,
  InitiativeId,
  SharedResourceId,
} from "./contract";
import type { StructuralExecutionEvidence } from "./executionEvidence";
import type { ResourcePressureObservation } from "./observeResourcePressure";
import {
  deriveAfterTransitionDiagnostics,
  deriveBeforeExecutionDiagnostics,
  selectStructuralObservationDiagnostics,
  type DiagnosticInitiativeState,
  type DiagnosticSnapshotState,
  type StructuralObservationDiagnostic,
} from "./structuralObservationDiagnostics";

const period = 2 as DisplayedPeriod;
const id = (value: string) => value as InitiativeId;
const resourceId = (value: string) => value as SharedResourceId;
const action = (value: string) => value as ActionKey;

function blockedAssessment(
  initiativeId: InitiativeId,
  prerequisiteInitiativeId = id("prerequisite")
): StructuralStartAssessment {
  return {
    initiativeId,
    scenario: "A",
    evaluatedAtPeriod: period,
    outcome: "would-be-blocked",
    blockingReasons: [
      {
        code: "prerequisite-not-completed-before-start",
        prerequisiteInitiativeId,
        prerequisitePlannedPeriod: period,
        priorActualExecutionPeriod: null,
      },
      {
        code: "resource-overallocated",
        resourceId: resourceId("team"),
        period,
        capacity: 1,
        demandIncludingCurrentStarts: 1.4,
        overallocatedBy: 0.4,
      },
    ],
  };
}

function initiative(
  initiativeId: string,
  overrides: Partial<DiagnosticInitiativeState> = {}
): DiagnosticInitiativeState {
  return {
    initiativeId: id(initiativeId),
    actionKey: action(`${initiativeId}-action`),
    plannedExecutionPeriod: period,
    planningStatus: "scheduled-current",
    executionStatus: "not-executed",
    startAssessment: null,
    ...overrides,
  };
}

function pressure(
  overrides: Partial<ResourcePressureObservation> = {}
): ResourcePressureObservation {
  return {
    resourceId: resourceId("team"),
    period,
    capacity: 1,
    totalClaimed: 1.4,
    remainingCapacity: -0.4,
    overallocatedBy: 0.4,
    overallocated: true,
    activeClaims: [],
    contributingInitiativeIds: [id("prior"), id("starter")],
    startingInitiativeIds: [id("starter")],
    wouldBlockStartingInitiativeIds: [id("starter")],
    ...overrides,
  };
}

function snapshot(
  phase: DiagnosticSnapshotState["phase"],
  initiatives: readonly DiagnosticInitiativeState[],
  resourcePressure: readonly ResourcePressureObservation[] = []
): DiagnosticSnapshotState {
  return { scenario: "A", period, phase, initiatives, resourcePressure };
}

test("before diagnostics use canonical assessments and resource observations exactly once", () => {
  const blocked = initiative("starter", {
    startAssessment: blockedAssessment(id("starter")),
  });
  const eligible = initiative("eligible", {
    startAssessment: {
      initiativeId: id("eligible"),
      scenario: "A",
      evaluatedAtPeriod: period,
      outcome: "eligible",
      blockingReasons: [],
    },
  });
  const diagnostics = deriveBeforeExecutionDiagnostics(
    snapshot("before-execution", [eligible, blocked], [pressure()])
  );
  assert.deepEqual(
    diagnostics.map(({ code }) => code),
    ["would-be-blocked", "resource-overallocated"]
  );
  assert.deepEqual(
    diagnostics.filter(({ code }) => code === "would-be-blocked"),
    [
      {
        code: "would-be-blocked",
        scenario: "A",
        period,
        initiativeId: id("starter"),
        blockingReasons: blocked.startAssessment?.blockingReasons,
      },
    ]
  );
  assert.equal(Object.isFrozen(diagnostics), true);
  assert.equal(Object.isFrozen(diagnostics[0]), true);
  assert.equal(
    Object.isFrozen(
      diagnostics[0].code === "would-be-blocked"
        ? diagnostics[0].blockingReasons[0]
        : null
    ),
    true
  );
});

test("prior-only over-allocation remains diagnostic without retroactive blocking", () => {
  const diagnostics = deriveBeforeExecutionDiagnostics(
    snapshot(
      "before-execution",
      [initiative("prior", { planningStatus: "scheduled-past" })],
      [
        pressure({
          contributingInitiativeIds: [id("prior")],
          startingInitiativeIds: [],
          wouldBlockStartingInitiativeIds: [],
        }),
      ]
    )
  );
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].code, "resource-overallocated");
  if (diagnostics[0].code === "resource-overallocated") {
    assert.deepEqual(diagnostics[0].contributingInitiativeIds, ["prior"]);
    assert.deepEqual(diagnostics[0].wouldBlockStartingInitiativeIds, []);
  }
});

test("after diagnostics report legacy execution, actual same-period prerequisite, and missing execution", () => {
  const assessment = blockedAssessment(id("dependent"));
  const prerequisite = initiative("prerequisite", {
    actionKey: action("prerequisite-action"),
    executionStatus: "executed",
    startAssessment: {
      initiativeId: id("prerequisite"),
      scenario: "A",
      evaluatedAtPeriod: period,
      outcome: "eligible",
      blockingReasons: [],
    },
  });
  const dependent = initiative("dependent", {
    executionStatus: "executed-despite-structural-block",
    startAssessment: assessment,
  });
  const missing = initiative("missing", {
    actionKey: action("missing-action"),
    startAssessment: {
      initiativeId: id("missing"),
      scenario: "A",
      evaluatedAtPeriod: period,
      outcome: "eligible",
      blockingReasons: [],
    },
  });
  const evidence: StructuralExecutionEvidence[] = [
    {
      scenario: "A",
      actionKey: prerequisite.actionKey,
      scheduledExecutionPeriod: period,
      actualExecutionPeriod: period,
    },
    {
      scenario: "A",
      actionKey: dependent.actionKey,
      scheduledExecutionPeriod: period,
      actualExecutionPeriod: period,
    },
  ];
  const diagnostics = deriveAfterTransitionDiagnostics(
    snapshot("after-transition", [missing, prerequisite, dependent]),
    evidence
  );
  assert.deepEqual(
    diagnostics.map(({ code }) => code),
    [
      "executed-despite-structural-block",
      "prerequisite-executed-same-period",
      "planned-action-not-executed",
    ]
  );
  assert.deepEqual(
    diagnostics.find(({ code }) => code === "executed-despite-structural-block"),
    {
      code: "executed-despite-structural-block",
      scenario: "A",
      period,
      initiativeId: id("dependent"),
      actionKey: dependent.actionKey,
      blockingReasons: assessment.blockingReasons,
    }
  );
});

test("planned or future prerequisite evidence does not create same-period diagnostics", () => {
  const dependent = initiative("dependent", {
    executionStatus: "executed-despite-structural-block",
    startAssessment: blockedAssessment(id("dependent")),
  });
  const prerequisite = initiative("prerequisite", {
    actionKey: action("prerequisite-action"),
  });
  const noEvidence = deriveAfterTransitionDiagnostics(
    snapshot("after-transition", [dependent, prerequisite]),
    []
  );
  assert.equal(
    noEvidence.some(({ code }) => code === "prerequisite-executed-same-period"),
    false
  );
  const futureEvidence = deriveAfterTransitionDiagnostics(
    snapshot("after-transition", [dependent, prerequisite]),
    [
      {
        scenario: "A",
        actionKey: prerequisite.actionKey,
        scheduledExecutionPeriod: period,
        actualExecutionPeriod: 3 as DisplayedPeriod,
      },
    ]
  );
  assert.equal(
    futureEvidence.some(({ code }) => code === "prerequisite-executed-same-period"),
    false
  );
});

test("diagnostics occur only in their canonical phase and planned period", () => {
  const historical = initiative("historical", {
    planningStatus: "scheduled-past",
    executionStatus: "executed-despite-structural-block",
    startAssessment: blockedAssessment(id("historical")),
  });
  assert.deepEqual(
    deriveAfterTransitionDiagnostics(
      snapshot("after-transition", [historical]),
      []
    ),
    []
  );
  assert.throws(
    () => deriveBeforeExecutionDiagnostics(snapshot("after-transition", [])),
    /before diagnostics require a before-execution snapshot/
  );
  assert.throws(
    () => deriveAfterTransitionDiagnostics(snapshot("before-execution", []), []),
    /after diagnostics require an after-transition snapshot/
  );
});

test("canonical sorting is stable and nested resource IDs are sorted", () => {
  const beta = initiative("beta", {
    startAssessment: blockedAssessment(id("beta")),
  });
  const alpha = initiative("alpha", {
    startAssessment: blockedAssessment(id("alpha")),
  });
  const diagnostics = deriveBeforeExecutionDiagnostics(
    snapshot("before-execution", [beta, alpha], [
      pressure({
        contributingInitiativeIds: [id("zeta"), id("alpha")],
        wouldBlockStartingInitiativeIds: [id("zeta"), id("alpha")],
      }),
    ])
  );
  assert.deepEqual(
    diagnostics.map((item) =>
      item.code === "resource-overallocated"
        ? item.resourceId
        : item.initiativeId
    ),
    ["alpha", "beta", "team"]
  );
  const resource = diagnostics[2];
  if (resource.code === "resource-overallocated") {
    assert.deepEqual(resource.contributingInitiativeIds, ["alpha", "zeta"]);
    assert.deepEqual(resource.wouldBlockStartingInitiativeIds, ["alpha", "zeta"]);
  }
  const reordered = deriveBeforeExecutionDiagnostics(
    snapshot("before-execution", [alpha, beta], [
      pressure({
        contributingInitiativeIds: [id("alpha"), id("zeta")],
        wouldBlockStartingInitiativeIds: [id("alpha"), id("zeta")],
      }),
    ])
  );
  assert.deepEqual(reordered, diagnostics);
});

test("selector aggregates exactly once without mutating or freezing snapshots", () => {
  const first: StructuralObservationDiagnostic = {
    code: "planned-action-not-executed",
    scenario: "B",
    period,
    initiativeId: id("zeta"),
    actionKey: action("zeta-action"),
    plannedExecutionPeriod: period,
  };
  const second: StructuralObservationDiagnostic = {
    code: "would-be-blocked",
    scenario: "A",
    period,
    initiativeId: id("alpha"),
    blockingReasons: blockedAssessment(id("alpha")).blockingReasons,
  };
  const source = {
    scenarios: {
      A: [{ diagnostics: [second] }],
      B: [{ diagnostics: [first] }],
    },
  };
  const selected = selectStructuralObservationDiagnostics(
    source as unknown as StructuralObservationResult
  );
  assert.deepEqual(selected.map(({ code }) => code), [
    "would-be-blocked",
    "planned-action-not-executed",
  ]);
  assert.equal(Object.isFrozen(selected), true);
  assert.equal(Object.isFrozen(source.scenarios.A[0]), false);
  assert.equal(Object.isFrozen(second), false);
  assert.notEqual(selected[0], second);
  assert.deepEqual(source.scenarios.A[0].diagnostics, [second]);
  assert.throws(
    () =>
      selectStructuralObservationDiagnostics(
        {
          scenarios: {
            A: [{ diagnostics: [second, second] }],
            B: [],
          },
        } as unknown as StructuralObservationResult
      ),
    /duplicate persisted diagnostic/
  );
});

test("impossible diagnostic states fail with explicit invariants", () => {
  assert.throws(
    () =>
      deriveBeforeExecutionDiagnostics(
        snapshot("before-execution", [
          initiative("blocked", {
            startAssessment: {
              initiativeId: id("blocked"),
              scenario: "A",
              evaluatedAtPeriod: period,
              outcome: "would-be-blocked",
              blockingReasons: [],
            },
          }),
        ])
      ),
    /would-be-blocked assessment has no blocking reasons/
  );
  assert.throws(
    () =>
      deriveBeforeExecutionDiagnostics(
        snapshot("before-execution", [], [pressure({ overallocatedBy: 0 })])
      ),
    /overallocated resource has no positive excess/
  );
  assert.throws(
    () =>
      deriveAfterTransitionDiagnostics(
        snapshot("after-transition", [
          initiative("invalid", {
            executionStatus: "executed-despite-structural-block",
          }),
        ]),
        []
      ),
    /executed-despite status lacks a blocked start assessment/
  );
});
