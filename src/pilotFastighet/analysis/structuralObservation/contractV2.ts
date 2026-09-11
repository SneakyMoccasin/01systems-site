import type { ActionKey } from "../../actionEffects";
import type {
  InitiativeId,
  InitiativePrerequisite,
  InitiativeResourceClaim,
  SharedResourceDefinition,
} from "./contract";

export type StructuralObservationVersionV2 = "structural-observation-v2";
export type EffectDefinitionId = string & {
  readonly __brand: "EffectDefinitionId";
};

export type InitiativeDefinitionV2 = Readonly<{
  id: InitiativeId;
  effectDefinitionId: EffectDefinitionId;
  label?: string;
  prerequisites: readonly InitiativePrerequisite[];
  resourceClaims: readonly InitiativeResourceClaim[];
}>;

export type StructuralObservationContractV2 = Readonly<{
  version: StructuralObservationVersionV2;
  initiatives: readonly InitiativeDefinitionV2[];
  resources: readonly SharedResourceDefinition[];
}>;

declare const validatedStructuralObservationContractV2: unique symbol;

export type ValidatedStructuralObservationContractV2 =
  StructuralObservationContractV2 & {
    readonly [validatedStructuralObservationContractV2]: true;
  };

/** Legacy canonical actions are the initial executable effect definitions. */
export function effectDefinitionIdFromActionKey(
  actionKey: ActionKey
): EffectDefinitionId {
  return actionKey as EffectDefinitionId;
}
