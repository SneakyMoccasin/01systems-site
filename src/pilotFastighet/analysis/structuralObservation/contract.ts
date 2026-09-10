import type { ActionKey } from "../../actionEffects";
import type { ScheduleScenarioId } from "../reactScheduledAnalysisBoundary";

export type StructuralObservationVersion = "structural-observation-v1";
export type InitiativeId = string & { readonly __brand: "InitiativeId" };
export type SharedResourceId = string & { readonly __brand: "SharedResourceId" };
export type DisplayedPeriod = number & { readonly __brand: "DisplayedPeriod" };
export type PositiveInteger = number & { readonly __brand: "PositiveInteger" };

export interface InitiativePrerequisite {
  readonly initiativeId: InitiativeId;
  readonly type: "finish-to-start";
}

export interface InitiativeResourceClaim {
  readonly resourceId: SharedResourceId;
  readonly amount: number;
  readonly durationPeriods: PositiveInteger;
}

export interface InitiativeDefinition {
  readonly id: InitiativeId;
  readonly actionKey: ActionKey;
  /** Presentation metadata; excluded from future semantic identity/fingerprints. */
  readonly label?: string;
  readonly prerequisites: readonly InitiativePrerequisite[];
  readonly resourceClaims: readonly InitiativeResourceClaim[];
}

export interface PeriodCapacity {
  readonly period: DisplayedPeriod;
  readonly amount: number;
}

export interface SharedResourceDefinition {
  readonly id: SharedResourceId;
  /** Presentation metadata; excluded from future semantic identity/fingerprints. */
  readonly label?: string;
  readonly capacity:
    | Readonly<{ type: "constant"; amount: number }>
    | Readonly<{ type: "periodized"; amounts: readonly PeriodCapacity[] }>;
}

export interface ScenarioInitiativeBinding {
  readonly initiativeId: InitiativeId;
  readonly scenario: ScheduleScenarioId;
}

export interface StructuralObservationContractV1 {
  readonly version: StructuralObservationVersion;
  readonly initiatives: readonly InitiativeDefinition[];
  readonly resources: readonly SharedResourceDefinition[];
  readonly scenarioBindings: readonly ScenarioInitiativeBinding[];
}

