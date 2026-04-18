import {
  TRANSPORT_SYSTEM_DRIVERS,
  type TransportSystemDriverId,
} from "@/src/pilotFastighet/transportDomainMapping";

function toReadableLabel(
  driverId: TransportSystemDriverId,
  language: "sv" | "en"
): string {
  const driverDef = TRANSPORT_SYSTEM_DRIVERS[driverId];

  if (language === "sv" && driverDef?.readableLabel_sv) {
    return driverDef.readableLabel_sv;
  }

  if (language === "en" && driverDef?.readableLabel_en) {
    return driverDef.readableLabel_en;
  }

  const spaced = driverId
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2");

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function buildDomainPropagationEvents(
  primaryDriver?: TransportSystemDriverId | null,
  language: "sv" | "en" = "en"
): {
  month: number;
  label: string;
}[] {
  if (!primaryDriver) {
    return [];
  }

  const driverDef = TRANSPORT_SYSTEM_DRIVERS[primaryDriver];
  if (!driverDef?.propagationChain?.length) {
    return [];
  }

  return driverDef.propagationChain.map((driverId, index, chain) => {
    const normalizedDriverId =
      driverId === "demandRisk"
        ? "demand"
        : driverId === "modalAttractiveness"
        ? "modalAttractiveness"
        : driverId === "modal_attractiveness"
        ? "modalAttractiveness"
        : driverId;
    const readable =
      toReadableLabel(normalizedDriverId as TransportSystemDriverId, language) ??
      TRANSPORT_SYSTEM_DRIVERS[normalizedDriverId as keyof typeof TRANSPORT_SYSTEM_DRIVERS]
        ?.readableLabel_sv ??
      TRANSPORT_SYSTEM_DRIVERS[
        normalizedDriverId as keyof typeof TRANSPORT_SYSTEM_DRIVERS
      ]
        ?.readableLabel_en ??
      driverId;
    const isFirst = index === 0;
    const isLast = index === chain.length - 1;
    const phrase =
      language === "sv"
        ? isFirst
          ? "börjar förändras"
          : isLast
          ? "börjar påverkas"
          : "börjar förändras"
        : isFirst
        ? "begins shifting"
        : isLast
        ? "begins adjusting"
        : "starts changing";

    return {
      month: index,
      label: `${readable} ${phrase}`,
    };
  });
}
