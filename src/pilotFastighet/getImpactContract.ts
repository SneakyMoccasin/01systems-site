import { REAL_ESTATE_IMPACT_CONTRACT } from "./impactContract";

export function getImpactContract(domain: string) {
  switch (domain) {
    case "municipal":
      return REAL_ESTATE_IMPACT_CONTRACT;

    case "consulting":
      return REAL_ESTATE_IMPACT_CONTRACT;

    case "realEstate":
    default:
      return REAL_ESTATE_IMPACT_CONTRACT;
  }
}
