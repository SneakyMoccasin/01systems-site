import {
  CONSULTING_IMPACT_CONTRACT,
  MUNICIPAL_IMPACT_CONTRACT,
  REAL_ESTATE_IMPACT_CONTRACT,
} from "./impactContract";

export function getImpactContract(domain: string) {
  switch (domain) {
    case "municipal":
      return MUNICIPAL_IMPACT_CONTRACT;

    case "consulting":
      return CONSULTING_IMPACT_CONTRACT;

    case "realEstate":
    default:
      return REAL_ESTATE_IMPACT_CONTRACT;
  }
}
