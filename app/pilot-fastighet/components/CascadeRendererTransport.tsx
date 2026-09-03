"use client";
import React from "react";
import { resolveTransportInspectorContext } from "@/src/pilotFastighet/transportInspectorAdapter";

type Language = "sv" | "en";

type Props = {
  primaryDriver?: string | null;
  selectedActions?: string[];
  language?: Language;
};

const CascadeRendererTransport: React.FC<Props> = ({
  primaryDriver,
  selectedActions = [],
  language = "en",
}) => {
  const context = resolveTransportInspectorContext({
    useExecutableActionPresentation: true,
    language,
    selectedActions,
    primaryDriverKey: primaryDriver,
    cascadeEventsA: [],
    cascadeEventsB: [],
  });

  if (!context?.propagationChainLabel) {
    return <div>—</div>;
  }

  return <div>{context.propagationChainLabel}</div>;
};

export default CascadeRendererTransport;
