"use client";

import React from "react";
import { pulseLanguage } from "@/src/i18n/pulseLanguage";
import { getScenarioLibrary } from "@/src/pilotFastighet/scenarioLibrary";
import type { CascadeEvent } from "@/src/pilotFastighet/riskPropagation";
import { getPilotStrategyColors } from "@/src/pilotFastighet/strategyColors";
import { mapDominantPortfolioConstraintKeyToPolicyLabel } from "./inspector-utils/mapRiskLabelToPolicyLabel";
import {
  profileCount,
  profileValue,
} from "@/src/lib/runtimeProfile";
import type { ScheduledExecutionGraphMarker } from "@/src/pilotFastighet/analysis/scheduledExecutivePresentation";

const EXEC_SUSTAIN_THRESHOLD = 0.8;

export interface MarginGraphTheme {
  graphBg: string;
}

export type MarginGraphSelectMonthPayload = {
  monthIndex: number;
  marginA: number;
  marginB: number;
  difference: number;
};

export type DomainEvent = {
  month: number;
  label?: string;
  driver?: { readableLabel?: string } | string;
};

export type ConstraintActivationTimelineMarker = {
  constraintType: string;
  monthIndex: number;
};

export interface MarginGraphProps {
  marginHistoryA: number[];
  marginHistoryB: number[];
  demandHistoryA?: number[];
  demandHistoryB?: number[];
  driverEvents?: DomainEvent[];
  scenarioTargetDriverEvents?: DomainEvent[];
  displayMarginB: number[];
  tippingMarginIndexA: number | null;
  tippingMarginIndexB: number | null;
  hoverIndex: number | null;
  showA: boolean;
  /** When true, no Scenario B series yet — show baseline-focused legend and A start styling. */
  showBaselineOnly?: boolean;
  showB: boolean;
  simulationHorizon?: number;
  theme: MarginGraphTheme;
  uiLanguage: "sv" | "en";
  svgRef: React.RefObject<SVGSVGElement | null>;
  setHoverIndex: (v: number | null) => void;
  cascadeEventsA?: CascadeEvent[];
  cascadeEventsB?: CascadeEvent[];
  onSelectMonth?: (payload: MarginGraphSelectMonthPayload) => void;
  selectedMonthIndex?: number;
  graphTitle?: string;
  scenarioALabel?: string;
  scenarioBLabel?: string;
  scenarioALegendDefault?: string;
  scenarioBLegendDefault?: string;
  scenarioTarget?: string | null;
  showDriverActivations?: boolean;
  inspectionDepth?: "executive" | "expert";
  dominantConstraintMessage?: {
    constraintKey: string;
    scenarioDirection: "baseline" | "target";
  };
  constraintActivationTimeline?: ConstraintActivationTimelineMarker[];
  divergenceMonthIndex?: number | null;
  executiveDemoMode?: boolean;
  /** Executive demo narration markers (indexed like plotted months: M{n} aligns with axis label n). */
  executiveNarrativeMarkers?: { monthIndex: number; label: string }[];
  /** Revealed facade-provenance executions for the scheduled executive demo only. */
  executionMarkers?: readonly ScheduledExecutionGraphMarker[];
  caseType?: "transport" | "real-estate" | null;
}

function MarginGraph({
  marginHistoryA,
  marginHistoryB,
  demandHistoryA = [],
  demandHistoryB = [],
  driverEvents = [],
  scenarioTargetDriverEvents = [],
  displayMarginB,
  tippingMarginIndexA,
  tippingMarginIndexB,
  hoverIndex,
  showA,
  showBaselineOnly = false,
  showB,
  simulationHorizon,
  theme,
  uiLanguage,
  svgRef,
  setHoverIndex,
  cascadeEventsA = [],
  cascadeEventsB = [],
  onSelectMonth,
  selectedMonthIndex,
  graphTitle,
  scenarioALabel,
  scenarioBLabel,
  scenarioALegendDefault,
  scenarioBLegendDefault,
  scenarioTarget,
  showDriverActivations = false,
  inspectionDepth = "executive",
  dominantConstraintMessage,
  constraintActivationTimeline,
  divergenceMonthIndex,
  executiveDemoMode = false,
  executiveNarrativeMarkers,
  executionMarkers = [],
  caseType = null,
}: MarginGraphProps) {
  const execRiskLabelOpts =
    executiveDemoMode && caseType === "real-estate"
      ? ({ executiveDemo: true as const })
      : undefined;
  /** Executive demo + real-estate: lighter graph chrome; no simulation changes. */
  const execRealEstateGraphPassive =
    executiveDemoMode && caseType === "real-estate";
  const strategyColors = getPilotStrategyColors(execRealEstateGraphPassive);
  profileCount("MarginGraph.render");
  profileValue(
    "MarginGraph.series.points",
    Math.max(marginHistoryA.length, displayMarginB.length),
    "points"
  );
  profileValue(
    "MarginGraph.cascadeEvents",
    cascadeEventsA.length + cascadeEventsB.length,
    "events"
  );
  profileValue("MarginGraph.driverEvents", driverEvents.length, "events");
  profileValue(
    "MarginGraph.scenarioTargetDriverEvents",
    scenarioTargetDriverEvents.length,
    "events"
  );

  const [viewMode, setViewMode] = React.useState<"delta" | "absolute">("delta");
  const [hoveredViewMode, setHoveredViewMode] = React.useState<"delta" | "absolute" | null>(null);
  const [showDriverOverlay, setShowDriverOverlay] = React.useState(false);
  const [scrollOffset, setScrollOffset] = React.useState(0);
  const [scrollLeft, setScrollLeft] = React.useState(0);
  const [containerWidth, setContainerWidth] = React.useState(0);
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const sliderTrackRef = React.useRef<HTMLDivElement | null>(null);
  const isSliderDraggingRef = React.useRef(false);

  const t = pulseLanguage[uiLanguage];
  const marginLabel =
    executiveDemoMode && caseType === "real-estate"
      ? viewMode === "delta"
        ? uiLanguage === "sv"
          ? "Förändring i genomföringsflexibilitet"
          : "Change in execution flexibility"
        : uiLanguage === "sv"
          ? "Genomföringsflexibilitet (helhetsnivå)"
          : "Execution flexibility (aggregate)"
      : viewMode === "delta"
        ? uiLanguage === "sv"
          ? "Förändring i strukturell marginal"
          : "Change in structural margin"
        : uiLanguage === "sv"
          ? "Strukturell marginal (systemnivå)"
          : "Structural margin (system level)";

  const baselineText =
    uiLanguage === "sv"
      ? "Baslinje = nuläge"
      : "Baseline = current system state";

  const scenarioLibrary = getScenarioLibrary(uiLanguage);

  const labelA =
    scenarioLibrary.find((p) => p.id === scenarioALabel)?.label ?? "";

  const labelB =
    scenarioLibrary.find((p) => p.id === scenarioBLabel)?.label ?? "";

  const highlightedSeries =
    scenarioTarget === "reduce_capacity_pressure"
      ? "capacityPressure"
      : scenarioTarget === "increase_accessibility"
      ? "accessibility"
      : scenarioTarget === "increase_modal_attractiveness"
      ? "modalAttractiveness"
      : scenarioTarget === "stabilize_margins"
      ? "margin"
      : scenarioTarget === "avoid_tipping"
      ? "tippingRisk"
      : null;
  const emphasisOpacity = (seriesName: string) =>
    highlightedSeries === null
      ? 1
      : seriesName === highlightedSeries
      ? 1
      : 0.35;
  const graphBackground =
    inspectionDepth === "executive"
      ? "#0B1220"
      : "#FFFFFF";

  const baselineA = marginHistoryA[0] ?? 0;
  const baselineB = marginHistoryB[0] ?? 0;
  const normalizedA =
    viewMode === "delta"
      ? marginHistoryA.map(v =>
          typeof v === "number" ? v - baselineA : v
        )
      : marginHistoryA;

  const normalizedB =
    viewMode === "delta"
      ? marginHistoryB.map(v =>
          typeof v === "number" ? v - baselineB : v
        )
      : marginHistoryB;

  const divergenceIndex = (() => {
    const n = Math.min(marginHistoryA.length, displayMarginB.length);
    for (let i = 0; i < n; i++) {
      if (Math.abs(marginHistoryA[i] - displayMarginB[i]) > 0.05) {
        return i;
      }
    }
    return null;
  })();
  const LEFT_PADDING = 48;
  const RIGHT_PADDING = 18;
  const totalSteps = Math.max(marginHistoryA.length, marginHistoryB.length, 1);
  const height = 300;
  const monthPixelWidth = execRealEstateGraphPassive ? 59 : 60;
  const timelineMonths = Array.from({ length: totalSteps }, (_, i) => i + 1);
  const totalTimelineWidth = timelineMonths.length * monthPixelWidth;
  const chartWidth = Math.max(monthPixelWidth, totalTimelineWidth);
  /** Executive RE: readable trajectory height for recordings (~340–360px band). */
  const svgDisplayHeightPx = execRealEstateGraphPassive ? 336 : 480;
  const graphWidth = Math.max(
    monthPixelWidth,
    Math.max(totalSteps - 1, 0) * monthPixelWidth
  );
  const visibleMonths = Math.max(1, Math.floor(containerWidth / monthPixelWidth) || 1);
  const maxScrollOffset = Math.max(0, timelineMonths.length - visibleMonths);
  const maxScrollLeft = Math.max(0, totalTimelineWidth - containerWidth);
  const visibleRatio =
    totalTimelineWidth > 0 ? Math.min(1, containerWidth / totalTimelineWidth) : 1;
  const thumbWidth = Math.max(
    24,
    Math.min(containerWidth, visibleRatio * containerWidth || 24)
  );
  const thumbTravel = Math.max(0, containerWidth - thumbWidth);
  const thumbLeft =
    maxScrollLeft > 0 ? (Math.min(scrollLeft, maxScrollLeft) / maxScrollLeft) * thumbTravel : 0;

  const resolveIndexFromClientX = (
    svg: SVGSVGElement,
    clientX: number
  ): number | null => {
    const rect = svg.getBoundingClientRect();
    const viewBoxX = ((clientX - rect.left) / rect.width) * chartWidth;
    const x = viewBoxX - LEFT_PADDING;
    const clampedX = Math.max(0, Math.min(x, graphWidth));
    const index = Math.round(clampedX / monthPixelWidth);
    if (index >= 0 && index < marginHistoryA.length) return index;
    return null;
  };

  const emitSelectMonthForIndex = (index: number | null) => {
    if (!onSelectMonth || index === null) return;
    const marginA = marginHistoryA[index];
    const marginB = displayMarginB[index] ?? marginHistoryB[index];
    if (
      marginA === undefined ||
      marginB === undefined ||
      !Number.isFinite(marginA) ||
      !Number.isFinite(marginB)
    ) {
      return;
    }
    onSelectMonth({
      monthIndex: index,
      marginA,
      marginB,
      difference: marginB - marginA,
    });
  };

  const scaleX = (index: number) => {
    return LEFT_PADDING + index * monthPixelWidth;
  };

  const normalizedValues =
    [...normalizedA, ...normalizedB].length > 0
      ? [...normalizedA, ...normalizedB]
      : [0];
  const rawMin = Math.min(...normalizedValues);
  const rawMax = Math.max(...normalizedValues);
  const yMin =
    viewMode === "delta"
      ? Math.min(rawMin, 0)
      : rawMin === rawMax
      ? rawMin - 0.05
      : rawMin;
  const yMax =
    viewMode === "delta"
      ? Math.max(rawMax, 0)
      : rawMin === rawMax
      ? rawMax + 0.05
      : rawMax;

  const TOP_PADDING = execRealEstateGraphPassive ? 7 : 12;
  const BOTTOM_PADDING = execRealEstateGraphPassive ? 5 : 8;
  const gridLevels = 4;
  const SERIES_COLOR_A = "#3B82F6"; // A = blue, B = orange (do not change)
  const SERIES_COLOR_B = "#F59E0B";
  const range = Math.max(yMax - yMin, 1e-9);
  const scaleY = (value: number) =>
    TOP_PADDING +
    ((yMax - value) / range) * (300 - TOP_PADDING - BOTTOM_PADDING);

  React.useEffect(() => {
    const node = scrollContainerRef.current;
    if (!node) return;

    const updateWidth = () => {
      setContainerWidth(node.clientWidth);
    };

    updateWidth();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        updateWidth();
      });
      observer.observe(node);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  React.useEffect(() => {
    setScrollOffset((prev) => Math.min(prev, maxScrollOffset));
  }, [maxScrollOffset]);

  React.useEffect(() => {
    if (!scrollContainerRef.current) return;
    const nextScrollLeft = Math.min(scrollOffset * monthPixelWidth, maxScrollLeft);
    scrollContainerRef.current.scrollLeft = nextScrollLeft;
    setScrollLeft(nextScrollLeft);
  }, [scrollOffset, monthPixelWidth, maxScrollLeft]);

  const syncScrollPosition = React.useCallback(
    (nextScrollLeft: number) => {
      const clamped = Math.max(0, Math.min(nextScrollLeft, maxScrollLeft));
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = clamped;
      }
      setScrollLeft(clamped);
      setScrollOffset(Math.round(clamped / monthPixelWidth));
    },
    [maxScrollLeft, monthPixelWidth]
  );

  const updateScrollFromSliderClientX = React.useCallback(
    (clientX: number) => {
      const track = sliderTrackRef.current;
      if (!track) return;

      const rect = track.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      const nextThumbLeft = Math.max(
        0,
        Math.min(relativeX - thumbWidth / 2, thumbTravel)
      );
      const ratio = thumbTravel > 0 ? nextThumbLeft / thumbTravel : 0;
      syncScrollPosition(ratio * maxScrollLeft);
    },
    [thumbTravel, thumbWidth, maxScrollLeft, syncScrollPosition]
  );

  React.useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isSliderDraggingRef.current) return;
      updateScrollFromSliderClientX(event.clientX);
    };

    const handleMouseUp = () => {
      isSliderDraggingRef.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [updateScrollFromSliderClientX]);

  function renderMarkerShape(
    x: number,
    y: number,
    color: string,
    type: "baseline" | "tipping" | "selected" | "default" | "constraint"
  ) {
    if (type === "baseline") {
      return <circle cx={x} cy={y} r={4} fill={color} />;
    }

    if (type === "tipping") {
      return (
        <polygon
          points={`${x},${y - 6} ${x - 6},${y} ${x},${y + 6} ${x + 6},${y}`}
          fill={color}
        />
      );
    }

    if (type === "selected") {
      return (
        <polygon
          points={`${x},${y - 6} ${x - 6},${y + 6} ${x + 6},${y + 6}`}
          fill={color}
        />
      );
    }

    if (type === "constraint") {
      return <rect x={x - 5} y={y - 5} width={10} height={10} fill={color} />;
    }

    return <rect x={x - 4} y={y - 4} width={8} height={8} fill={color} />;
  }

  const buildPath = (
    margins: number[],
    sx: (i: number) => number,
    sy: (v: number) => number
  ): string => {
    if (margins.length === 0) return "";
    // Rendering guard: if margins contain NaN/Infinity, SVG paths can fail.
    // We keep x positions aligned by carrying the last finite y forward.
    let lastFinite = Number.isFinite(margins[0]) ? margins[0] : 0;
    const clampY = (v: number) => v;
    const first = `M ${sx(0)} ${sy(clampY(lastFinite))}`;
    const rest = margins
      .slice(1)
      .map((v, i) => {
        if (Number.isFinite(v)) lastFinite = v;
        return `L ${sx(i + 1)} ${sy(clampY(lastFinite))}`;
      })
      .join(" ");
    return `${first} ${rest}`;
  };

  const ZONE_BOUNDARIES = [1.0, 0.3, 0] as const;
  const ROBUST_LEVEL = 1.0;
  const SUSTAINABLE_LEVEL = 0.85;
  const EROSION_LEVEL = 0.65;
  const FAILURE_LEVEL = 0.45;
  // Background zone bands (rendered behind lines/markers).
  const yRobust = scaleY(ROBUST_LEVEL);
  const ySustainable = scaleY(SUSTAINABLE_LEVEL);
  const yErosion = scaleY(EROSION_LEVEL);
  const yCollapse = scaleY(FAILURE_LEVEL);
  const getZoneColor = (margin: number): string => {
    if (margin >= 1.0) return "#22c55e";
    if (margin >= 0.3) return "#2563eb";
    if (margin >= 0) return "#f97316";
    return "#ef4444";
  };

  // Rendering-only: zone-colored stroke mapping for the main margin line.
  // Requested mapping:
  // - value > ROBUST_LEVEL => blue
  // - value <= ROBUST_LEVEL => yellow
  // - value <= EROSION_LEVEL => orange
  // - value <= FAILURE_LEVEL => red
  const getLineStrokeForValue = (value: number): string => {
    // Requested condition order (rendering-only).
    if (value <= FAILURE_LEVEL) return "#ef4444"; // red
    if (value <= EROSION_LEVEL) return "#f97316"; // orange
    if (value <= ROBUST_LEVEL) return "#facc15"; // yellow
    return "#3B82F6"; // blue
  };

  const lineToZoneColoredPathSegments = (
    margins: number[],
    keyPrefix: string
  ): React.ReactNode => {
    if (margins.length < 2) return null;

    // Keep x positions aligned and avoid SVG path failures for non-finite values.
    let lastFinite = Number.isFinite(margins[0]) ? margins[0] : 0;
    const valuesAtIndex: number[] = margins.map((v) => {
      if (Number.isFinite(v)) lastFinite = v;
      return lastFinite;
    });

    return valuesAtIndex.slice(0, -1).map((v0, i) => {
      const v1 = valuesAtIndex[i + 1];
      const valueMid = (v0 + v1) / 2;
      const stroke = getLineStrokeForValue(valueMid);

      const d = `M ${scaleX(i)} ${scaleY(v0)} L ${scaleX(i + 1)} ${scaleY(v1)}`;
      return (
        <path
          key={`${keyPrefix}-${i}`}
          d={d}
          stroke={stroke}
          fill="none"
          strokeWidth={execRealEstateGraphPassive ? 2.35 : 2}
          strokeLinecap={execRealEstateGraphPassive ? "round" : "butt"}
          strokeDasharray={keyPrefix === "line-b" ? "8 6" : undefined}
          opacity={
            execRealEstateGraphPassive
              ? keyPrefix === "line-b"
                ? 0.91
                : 0.86
              : 1
          }
        />
      );
    });
  };

  function detectDemandShiftIndex(series?: number[]) {
    if (!series || series.length < 2) return null;

    for (let i = 1; i < series.length; i++) {
      if (series[i] !== series[i - 1]) {
        return i;
      }
    }

    return null;
  }

  function buildSmoothPath(data: number[], scaleX: any, scaleY: any) {
    if (!data.length) return "";

    let d = `M ${scaleX(0)} ${scaleY(data[0])}`;

    for (let i = 1; i < data.length; i++) {
      const x = scaleX(i);
      const y = scaleY(data[i]);

      const prevX = scaleX(i - 1);
      const prevY = scaleY(data[i - 1]);

      const controlX = (prevX + x) / 2;

      d += ` Q ${controlX} ${prevY}, ${x} ${y}`;
    }

    return d;
  }

  type Segment = { x1: number; y1: number; x2: number; y2: number; stroke: string };
  const marginToSegments = (
    margins: number[],
    sx: (i: number) => number,
    sy: (v: number) => number
  ): Segment[] => {
    const out: Segment[] = [];
    for (let i = 0; i < margins.length - 1; i++) {
      const m0 = margins[i];
      const m1 = margins[i + 1];
      const x0 = sx(i);
      const x1 = sx(i + 1);
      const ts: number[] = [0];
      if (m0 !== m1) {
        for (const b of ZONE_BOUNDARIES) {
          if (b <= Math.max(m0, m1) && b >= Math.min(m0, m1)) {
            const t = (b - m0) / (m1 - m0);
            if (t > 0 && t < 1) ts.push(t);
          }
        }
      }
      ts.push(1);
      ts.sort((a, b) => a - b);
      for (let j = 0; j < ts.length - 1; j++) {
        const ta = ts[j];
        const tb = ts[j + 1];
        const tMid = (ta + tb) / 2;
        const marginMid = m0 + tMid * (m1 - m0);
        const xa = x0 + ta * (x1 - x0);
        const ya = sy(m0 + ta * (m1 - m0));
        const xb = x0 + tb * (x1 - x0);
        const yb = sy(m0 + tb * (m1 - m0));
        out.push({ x1: xa, y1: ya, x2: xb, y2: yb, stroke: getZoneColor(marginMid) });
      }
    }
    return out;
  };

  const segmentsA = marginToSegments(normalizedA, scaleX, scaleY);
  const segmentsB = marginToSegments(normalizedB, scaleX, scaleY);
  const zeroBetween = yMin <= 0 && yMax >= 0;
  const numYTicks = 5;
  const yTickValues = Array.from({ length: numYTicks }, (_, i) =>
    yMin + (range / (numYTicks - 1)) * i
  );

  const tippingIndex = tippingMarginIndexB ?? null;
  const tippingMargin =
    tippingIndex !== null && normalizedB[tippingIndex] !== undefined
      ? normalizedB[tippingIndex]
      : null;
  const tippingY = tippingMargin !== null ? scaleY(tippingMargin) : null;

  /** Horizontal [start, end] indices for the tipping risk window (2 steps before tipping through tipping). */
  const tippingWindowStartIndex =
    tippingIndex !== null ? Math.max(0, tippingIndex - 2) : null;
  const tippingTriggerIndex =
    tippingIndex !== null ? Math.max(0, tippingIndex - 2) : null;
  const plotAreaX = LEFT_PADDING;
  const plotAreaWidth = graphWidth;
  const plotAreaLeftPercent = (plotAreaX / chartWidth) * 100;
  const plotAreaWidthPercent = (plotAreaWidth / chartWidth) * 100;
  const plotAreaY = TOP_PADDING;
  const plotAreaH = 300 - TOP_PADDING - BOTTOM_PADDING;
  const xTippingBandLeft =
    tippingWindowStartIndex !== null && tippingIndex !== null
      ? scaleX(tippingWindowStartIndex)
      : 0;
  const xTippingBandRight =
    tippingIndex !== null ? scaleX(tippingIndex) : 0;
  const tippingBandWidth = Math.max(0, xTippingBandRight - xTippingBandLeft);
  const xTippingTrigger =
    tippingTriggerIndex !== null ? scaleX(tippingTriggerIndex) : 0;
  const tippingBandCenterX = (xTippingBandLeft + xTippingBandRight) / 2;
  const showTippingRiskBand =
    tippingIndex !== null &&
    tippingY !== null &&
    tippingBandWidth > 0.5;

  const tippingWindowLabel =
    uiLanguage === "sv"
      ? "Aktiveringsfönster för begränsning"
      : "Constraint Activation Window";
  const tippingTriggerLabel =
    uiLanguage === "sv" ? "Fönstrets början" : "Window Start";
  const demandShiftA = detectDemandShiftIndex(demandHistoryA);
  const demandShiftB = detectDemandShiftIndex(demandHistoryB);
  const demandShiftLabel =
    uiLanguage === "sv" ? "Efterfrågeskifte" : "Demand shift";
  const demandDivergenceLabel =
    uiLanguage === "sv"
      ? "Efterfrågedivergens mellan scenarier"
      : "Demand divergence between scenarios";

  const mapDomainEventsToMarkers = (events: DomainEvent[]) =>
    events
    .map((event) => {
      const rawLabel =
        event.label ??
        (typeof event.driver === "string"
          ? event.driver
          : event.driver?.readableLabel);
      return {
        month: event.month,
        label: rawLabel ?? (uiLanguage === "sv" ? "Påverkanspunkt" : "Impact point"),
      };
    })
    .filter(
      (event) =>
        Number.isFinite(event.month) &&
        event.month >= 0 &&
        event.month < totalSteps
    );
  const driverActivationMarkers = mapDomainEventsToMarkers(driverEvents);
  const scenarioTargetDriverActivationMarkers = mapDomainEventsToMarkers(
    scenarioTargetDriverEvents
  );
  const driverActivationLineMarkers = driverActivationMarkers;
  const scenarioTargetDriverActivationLineMarkers =
    scenarioTargetDriverActivationMarkers;
  // const driverActivationLineMarkers = driverActivationMarkers.filter(
  //   (event) =>
  //     event.month !== tippingIndex &&
  //     event.month !== tippingTriggerIndex
  // );
  const driverActivationOverlayMarkers = (() => {
    const occurrenceByMonth = new Map<number, number>();
    return driverActivationMarkers.map((event) => {
      const occurrence = occurrenceByMonth.get(event.month) ?? 0;
      occurrenceByMonth.set(event.month, occurrence + 1);
      return {
        ...event,
        sameMonthIndex: occurrence,
        xPercent:
          simulationHorizon && simulationHorizon > 0
            ? (event.month / simulationHorizon) * 100
            : (event.month / Math.max(totalSteps - 1, 1)) * 100,
        yTopPercent: (plotAreaY / 300) * 100,
        yHeightPercent: (plotAreaH / 300) * 100,
        overlapOffsetPx: occurrence * 6,
      };
    });
  })();

  const riskStartIndex = (() => {
    const n = Math.max(marginHistoryA.length, displayMarginB.length);
    for (let i = 0; i < n; i++) {
      if (
        (marginHistoryA[i] !== undefined && marginHistoryA[i] < 0.3) ||
        (displayMarginB[i] !== undefined && displayMarginB[i] < 0.3)
      )
        return i;
    }
    return null;
  })();

  // CascadeEvent.step is propagation depth, not execution time. The curated
  // cascade-start indicator below is presentation framing and does not position
  // individual events from that field.
  const decisionTimeForCascade = 1; // Curated scenario/decision presentation at M1.
  const cascadeStartIndexA = (() => {
    const seriesLengthA = marginHistoryA.length;
    if (seriesLengthA <= 0 || !cascadeEventsA || cascadeEventsA.length === 0) return null;
    const earliestQuarter =
      Math.min(
        ...cascadeEventsA.map((e) => decisionTimeForCascade + (e.delaySteps ?? 1))
      ) || null;
    if (earliestQuarter == null) return null;
    const idx = earliestQuarter - 1;
    return Math.max(0, Math.min(seriesLengthA - 1, idx));
  })();

  const cascadeStartIndexB = (() => {
    const seriesLengthB = displayMarginB.length;
    if (seriesLengthB <= 0 || !cascadeEventsB || cascadeEventsB.length === 0) return null;
    const earliestQuarter =
      Math.min(
        ...cascadeEventsB.map((e) => decisionTimeForCascade + (e.delaySteps ?? 1))
      ) || null;
    if (earliestQuarter == null) return null;
    const idx = earliestQuarter - 1;
    return Math.max(0, Math.min(seriesLengthB - 1, idx));
  })();

  const cascadeStartsLabel = uiLanguage === "sv" ? "Kaskad" : "Cascade";
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
      }}
    >
      <style jsx>{`
        .driver-marker-wrapper {
          position: absolute;
          transform: translateX(-50%);
        }

        .driver-marker-line {
          width: 1px;
          height: 100%;
          background: #a78bfa;
          opacity: 0.5;
          border-left: 1px dashed #a78bfa;
        }

        .driver-marker-tooltip {
          display: none;
          position: absolute;
          bottom: 140%;
          left: 50%;
          transform: translateX(-50%);
          padding: 6px 10px;
          font-size: 12px;
          background: #0f172a;
          color: #fff;
          border-radius: 6px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0.95;
          z-index: 10;
        }

        .driver-marker-wrapper:hover .driver-marker-tooltip {
          display: block;
        }

        .driver-marker-inline-label {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          top: 28px;
          font-size: 12px;
          font-weight: 500;
          color: #e5e7eb;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(2px);
          padding: 4px 8px;
          border-radius: 6px;
          white-space: normal;
          max-width: 220px;
          pointer-events: none;
          text-align: center;
        }

        .scheduled-execution-marker:focus {
          outline: none;
        }

        .scheduled-execution-marker:focus .scheduled-execution-marker-focus {
          stroke: #f8fafc;
          stroke-width: 3;
        }
      `}</style>
      {!execRealEstateGraphPassive && (
      <div style={{ marginBottom: 8 }}>
        <span style={{ marginRight: 6, color: "#9ca3af", fontSize: "11px" }}>
          {t.viewLabel}
        </span>
        <div
          style={{
            display: "inline-flex",
            border: "1px solid #374151",
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => {
              setViewMode("delta");
            }}
            onMouseEnter={() => setHoveredViewMode("delta")}
            onMouseLeave={() => setHoveredViewMode(null)}
            style={{
              background: viewMode === "delta" ? "#2563eb" : hoveredViewMode === "delta" ? "#111827" : "transparent",
              color: viewMode === "delta" ? "#ffffff" : "#9ca3af",
              border: "none",
              padding: "6px 10px",
            }}
          >
            {(t as any).viewChangeFromBaseline ?? (uiLanguage === "sv"
              ? "Utveckling av handlingsutrymme"
              : "Change from baseline")}
          </button>

          <button
            onClick={() => {
              setViewMode("absolute");
            }}
            onMouseEnter={() => setHoveredViewMode("absolute")}
            onMouseLeave={() => setHoveredViewMode(null)}
            style={{
              background: viewMode === "absolute" ? "#2563eb" : hoveredViewMode === "absolute" ? "#111827" : "transparent",
              color: viewMode === "absolute" ? "#ffffff" : "#9ca3af",
              border: "none",
              padding: "6px 10px",
            }}
          >
            {(t as any).viewSystemLevel ?? (uiLanguage === "sv"
              ? "Systemnivå"
              : "System level")}
          </button>
        </div>
        <label
          style={{
            marginLeft: 12,
            fontSize: "11px",
            color: "#9ca3af",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <input
            type="checkbox"
            checked={showDriverOverlay}
            onChange={(e) => setShowDriverOverlay(e.target.checked)}
          />
          {uiLanguage === "sv" ? "Visa drivarakiveringar" : "Show driver activations"}
        </label>
      </div>
      )}
      <div
        ref={scrollContainerRef}
        style={{
          width: "100%",
          overflowX: "auto",
          overflowY: "hidden",
          background: "transparent",
        }}
        onScroll={(e) => {
          setScrollLeft(e.currentTarget.scrollLeft);
          const nextOffset = Math.round(
            e.currentTarget.scrollLeft / monthPixelWidth
          );
          setScrollOffset((prev) =>
            prev === nextOffset ? prev : Math.min(nextOffset, maxScrollOffset)
          );
        }}
      >
        <div
          style={{
            minWidth: chartWidth,
            position: "relative",
          }}
        >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${chartWidth} 300`}
        preserveAspectRatio="none"
        width={chartWidth}
        height={svgDisplayHeightPx}
        style={{
          display: "block",
          background: graphBackground,
          border: execRealEstateGraphPassive ? "1px solid rgba(51,65,85,0.55)" : "1px solid #e5e7eb",
          borderRadius: "4px",
          minHeight: svgDisplayHeightPx,
          minWidth: chartWidth,
        }}
        onMouseMove={(e) => {
          const idx = resolveIndexFromClientX(e.currentTarget, e.clientX);
          if (idx !== null) setHoverIndex(idx);
          else setHoverIndex(null);
        }}
        onClick={(e) => {
          emitSelectMonthForIndex(
            resolveIndexFromClientX(e.currentTarget, e.clientX)
          );
        }}
        onMouseLeave={() => setHoverIndex(null)}
      >
      <defs>
        {execRealEstateGraphPassive && (
          <linearGradient id="execMicroDivergenceTint" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(37,99,235,0.055)" />
            <stop offset="48%" stopColor="rgba(51,102,204,0.032)" />
            <stop offset="100%" stopColor="rgba(217,119,6,0.028)" />
          </linearGradient>
        )}
      </defs>
      <rect x={0} y={0} width={chartWidth} height={300} fill={graphBackground} />
      {execRealEstateGraphPassive &&
        totalSteps > 4 &&
        (() => {
          const bandX0 = scaleX(1) - monthPixelWidth * 0.3;
          const bandW = scaleX(4) - scaleX(1) + monthPixelWidth * 0.65;
          return bandW > 2 ? (
            <rect
              x={bandX0}
              y={plotAreaY}
              width={bandW}
              height={plotAreaH}
              fill="url(#execMicroDivergenceTint)"
              opacity={0.68}
              style={{ pointerEvents: "none" }}
            />
          ) : null;
        })()}
      <text
        x={14}
        y={150}
        fill={execRealEstateGraphPassive ? "#64748b" : "#6b7280"}
        fontSize={execRealEstateGraphPassive ? 10 : 11}
        fontWeight={500}
        transform="rotate(-90 14 150)"
        textAnchor="middle"
        opacity={execRealEstateGraphPassive ? 0.82 : 1}
      >
        {marginLabel}
      </text>
      <line
        x1={LEFT_PADDING}
        y1={0}
        x2={LEFT_PADDING}
        y2={300}
        stroke="#9ca3af"
        strokeWidth={1}
      />
      {Array.from({ length: gridLevels }).map((_, i) => {
        const value = yMin + (range / (gridLevels - 1)) * i;
        const y = scaleY(value);
        return (
          <line
            key={`grid-${i}`}
            x1={LEFT_PADDING}
            x2={chartWidth}
            y1={y}
            y2={y}
            stroke={value === 0 ? "#6b7280" : "#e5e7eb"}
            strokeWidth={value === 0 ? 1.6 : 1}
            strokeOpacity={value === 0 ? 0.6 : 0.4}
          />
        );
      })}
      {yTickValues.map((value, i) => (
        <text
          key={`ytick-${i}`}
          x={LEFT_PADDING - 10}
          y={scaleY(value)}
          textAnchor="end"
          dominantBaseline="middle"
          fontSize={10}
          fill="#9CA3AF"
          opacity={0.75}
        >
          {`${Math.round(value * 10)}%`}
        </text>
      ))}
      {inspectionDepth === "expert" && (
        <line
          x1={LEFT_PADDING}
          x2={chartWidth}
          y1={scaleY(EXEC_SUSTAIN_THRESHOLD)}
          y2={scaleY(EXEC_SUSTAIN_THRESHOLD)}
          stroke="#9CA3AF"
          strokeWidth={1.25}
          strokeDasharray="6 4"
          opacity={0.85}
        />
      )}
      {zeroBetween && (
        <>
          <line
            x1={LEFT_PADDING}
            y1={scaleY(0)}
            x2={chartWidth}
            y2={scaleY(0)}
            stroke={theme.graphBg === "#0b0f14" ? "#E5E7EB" : "#4B5563"}
            strokeWidth={2}
          />
          {viewMode === "absolute" && (
            <text
              x={LEFT_PADDING + 8}
              y={scaleY(0) - 8}
              fill="#9CA3AF"
              fontSize={10}
              fontWeight={500}
              textAnchor="start"
              opacity={0.9}
            >
              {uiLanguage === "sv" ? "Stabil nivå (0%)" : "Stable level (0%)"}
            </text>
          )}
        </>
      )}

      {/* Zone threshold lines (no background fills) */}
      <line
        x1={LEFT_PADDING}
        x2={LEFT_PADDING + graphWidth}
        y1={yRobust}
        y2={yRobust}
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={1.5}
      />

      {inspectionDepth === "expert" && (
        <line
          x1={LEFT_PADDING}
          x2={LEFT_PADDING + graphWidth}
          y1={ySustainable}
          y2={ySustainable}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={1.5}
        />
      )}

      <line
        x1={LEFT_PADDING}
        x2={LEFT_PADDING + graphWidth}
        y1={yErosion}
        y2={yErosion}
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={1.5}
      />

      {inspectionDepth === "expert" && (
        <line
          x1={LEFT_PADDING}
          x2={LEFT_PADDING + graphWidth}
          y1={yCollapse}
          y2={yCollapse}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={1.5}
        />
      )}
      {/* Tipping risk window (behind series paths, after grid / zone lines) */}
      {showTippingRiskBand && (
        <>
          <rect
            x={xTippingBandLeft}
            y={plotAreaY}
            width={tippingBandWidth}
            height={plotAreaH}
            fill="rgba(239, 68, 68, 0.16)"
            stroke="rgba(220, 38, 38, 0.35)"
            strokeWidth={1}
            opacity={emphasisOpacity("tippingRisk")}
          />
          <text
            x={tippingBandCenterX}
            y={plotAreaY - 4}
            fill="#b91c1c"
            fontSize={9}
            fontWeight={600}
            textAnchor="middle"
            opacity={emphasisOpacity("tippingRisk")}
          >
            {tippingWindowLabel}
          </text>
        </>
      )}
      {tippingIndex !== null && tippingY !== null && tippingTriggerIndex !== null && (
        <>
          <line
            x1={xTippingTrigger}
            x2={xTippingTrigger}
            y1={plotAreaY}
            y2={plotAreaY + plotAreaH}
            stroke="#dc2626"
            strokeWidth={1.25}
            strokeDasharray="5 4"
            opacity={0.92 * emphasisOpacity("tippingRisk")}
          />
          <text
            x={xTippingTrigger + 4}
            y={plotAreaY + 11}
            fill="#b91c1c"
            fontSize={9}
            fontWeight={500}
            textAnchor="start"
            opacity={emphasisOpacity("tippingRisk")}
          >
            {tippingTriggerLabel}
          </text>
        </>
      )}
      {dominantConstraintMessage &&
        constraintActivationTimeline &&
        constraintActivationTimeline.length > 0 &&
        (() => {
          const match = constraintActivationTimeline.find(
            (entry) =>
              entry.constraintType === dominantConstraintMessage.constraintKey
          );

          if (!match) return null;

          const x = scaleX(match.monthIndex);

          return (
            <g opacity={execRealEstateGraphPassive ? 0.82 : 1}>
              <line
                x1={x}
                x2={x}
                y1={plotAreaY}
                y2={plotAreaY + plotAreaH}
                stroke="#888"
                strokeDasharray="4 3"
                strokeWidth={execRealEstateGraphPassive ? 1.1 : 1.5}
              />

              <text
                x={x + 6}
                y={plotAreaY + 12}
                fontSize={execRealEstateGraphPassive ? 8 : 10}
                fill={execRealEstateGraphPassive ? "#64748b" : "#666"}
              >
                {uiLanguage === "sv"
                  ? "Dominerande begränsning"
                  : "Dominant constraint"}
              </text>

              <text
                x={x + 6}
                y={plotAreaY + 24}
                fontSize={execRealEstateGraphPassive ? 8 : 10}
                fill={execRealEstateGraphPassive ? "#788499" : "#666"}
              >
                {mapDominantPortfolioConstraintKeyToPolicyLabel(
                  dominantConstraintMessage.constraintKey,
                  uiLanguage,
                  execRiskLabelOpts
                )}
              </text>
            </g>
          );
        })()}
      {divergenceMonthIndex !== null &&
        divergenceMonthIndex !== undefined && (
          <g>
            <line
              x1={scaleX(divergenceMonthIndex)}
              x2={scaleX(divergenceMonthIndex)}
              y1={plotAreaY}
              y2={plotAreaY + plotAreaH}
              stroke="#64748b"
              strokeDasharray="5 4"
              strokeWidth={execRealEstateGraphPassive ? 1.08 : 1.25}
              opacity={execRealEstateGraphPassive ? 0.62 : 0.9}
            />
            <text
              x={scaleX(divergenceMonthIndex) + 6}
              y={plotAreaY + 36}
              fontSize={execRealEstateGraphPassive ? 8 : 10}
              fill={execRealEstateGraphPassive ? "#64748b" : "#666"}
              opacity={execRealEstateGraphPassive ? 0.75 : 1}
            >
              {uiLanguage === "sv"
                ? "Strukturell divergens"
                : "Structural divergence"}
            </text>
          </g>
        )}
      {executiveDemoMode &&
        caseType === "real-estate" &&
        executiveNarrativeMarkers &&
        executiveNarrativeMarkers.length > 0 &&
        executiveNarrativeMarkers.map((marker, markerIdx) => {
          const { monthIndex } = marker;
          if (monthIndex < 0 || monthIndex >= totalSteps) return null;
          const xi = scaleX(monthIndex);
          const labelY =
            TOP_PADDING +
            (execRealEstateGraphPassive ? 13 : 16) +
            markerIdx * (execRealEstateGraphPassive ? 10 : 11);
          const inSeparationWindow =
            execRealEstateGraphPassive && monthIndex >= 1 && monthIndex <= 4;
          return (
            <g key={`exec-narrative-${marker.monthIndex}-${markerIdx}`}>
              <line
                x1={xi}
                x2={xi}
                y1={plotAreaY}
                y2={plotAreaY + plotAreaH}
                stroke={inSeparationWindow ? "#6e7b8f" : "#64748b"}
                strokeDasharray={inSeparationWindow ? "3 5" : "3 6"}
                strokeWidth={
                  execRealEstateGraphPassive
                    ? inSeparationWindow
                      ? 1.06
                      : 1
                    : 1.1
                }
                opacity={
                  execRealEstateGraphPassive
                    ? inSeparationWindow
                      ? 0.58
                      : 0.52
                    : 0.75
                }
              />
              <text
                x={xi + 10}
                y={labelY + 2}
                fontSize={execRealEstateGraphPassive ? 9 : 9}
                fill={
                  execRealEstateGraphPassive
                    ? inSeparationWindow
                      ? "#d8dee9"
                      : "#cbd5e1"
                    : "#dbeafe"
                }
                fontWeight={600}
                opacity={
                  execRealEstateGraphPassive
                    ? inSeparationWindow
                      ? 0.91
                      : 0.88
                    : 0.95
                }
              >
                {marker.label}
              </text>
            </g>
          );
        })}
      {demandShiftA !== null && (
        <>
          <line
            x1={scaleX(demandShiftA)}
            x2={scaleX(demandShiftA)}
            y1={plotAreaY}
            y2={plotAreaY + plotAreaH}
            stroke="#60a5fa"
            strokeWidth={1}
            strokeDasharray="3 4"
            opacity={0.45}
          />
          <text
            x={scaleX(demandShiftA) + 3}
            y={plotAreaY + 22}
            fill="#93c5fd"
            fontSize={9}
            fontWeight={500}
            textAnchor="start"
            opacity={0.85}
          >
            {demandShiftLabel}
          </text>
        </>
      )}
      {demandShiftB !== null && (
        <>
          <line
            x1={scaleX(demandShiftB)}
            x2={scaleX(demandShiftB)}
            y1={plotAreaY}
            y2={plotAreaY + plotAreaH}
            stroke="#fbbf24"
            strokeWidth={1}
            strokeDasharray="3 4"
            opacity={0.45}
          />
          <text
            x={scaleX(demandShiftB) + 3}
            y={plotAreaY + 34}
            fill="#fcd34d"
            fontSize={9}
            fontWeight={500}
            textAnchor="start"
            opacity={0.85}
          >
            {demandShiftLabel}
          </text>
        </>
      )}
      {demandShiftA !== null &&
        demandShiftB !== null &&
        demandShiftA !== demandShiftB && (
          <text
            x={LEFT_PADDING + graphWidth / 2}
            y={plotAreaY + 12}
            fill="#cbd5e1"
            fontSize={9}
            fontWeight={600}
            textAnchor="middle"
            opacity={0.9}
          >
            {demandDivergenceLabel}
          </text>
        )}
      {/* (zone guide lines removed; only threshold lines remain) */}
      {inspectionDepth === "expert" && tippingIndex !== null && tippingY !== null && (
        <polygon
          points={`
            ${scaleX(tippingIndex)},${scaleY(normalizedB[tippingIndex]) - 6}
            ${scaleX(tippingIndex) - 6},${scaleY(normalizedB[tippingIndex])}
            ${scaleX(tippingIndex)},${scaleY(normalizedB[tippingIndex]) + 6}
            ${scaleX(tippingIndex) + 6},${scaleY(normalizedB[tippingIndex])}
          `}
          fill="#ff4d4f"
          stroke="white"
          strokeWidth={2}
        />
      )}
      {hoverIndex !== null && marginHistoryA[hoverIndex] !== undefined && (
        <g stroke="white" strokeWidth={1.5}>
          {(() => {
            const index = hoverIndex;
            const value = normalizedA[hoverIndex];
            const isBaselinePoint = index === 0;
            const isSelectedPoint = index === selectedMonthIndex;
            const isTippingPoint = index === tippingMarginIndexA || index === tippingMarginIndexB;
            return renderMarkerShape(
              scaleX(index),
              scaleY(value),
              "#2563eb",
              isBaselinePoint
                ? "baseline"
                : isTippingPoint
                  ? "tipping"
                  : isSelectedPoint
                    ? "selected"
                    : "default"
            );
          })()}
        </g>
      )}
      {hoverIndex !== null && displayMarginB[hoverIndex] !== undefined && (
        <g stroke="white" strokeWidth={1.5}>
          {(() => {
            const index = hoverIndex;
            const value = normalizedB[hoverIndex];
            const isBaselinePoint = index === 0;
            const isSelectedPoint = index === selectedMonthIndex;
            const isTippingPoint = index === tippingMarginIndexA || index === tippingMarginIndexB;
            return renderMarkerShape(
              scaleX(index),
              scaleY(value),
              execRealEstateGraphPassive ? "#d97706" : "#F59E0B",
              isBaselinePoint
                ? "baseline"
                : isTippingPoint
                  ? "tipping"
                  : isSelectedPoint
                    ? "selected"
                    : "default"
            );
          })()}
        </g>
      )}
      {marginHistoryA.length > 0 &&
        (showBaselineOnly ? (
          <g>
            <rect
              x={scaleX(0) - 4}
              y={scaleY(normalizedA[0]) - 4}
              width={8}
              height={8}
              fill="none"
              stroke="#22c55e"
              strokeWidth={2}
              strokeOpacity={0.95}
            />
            {renderMarkerShape(scaleX(0), scaleY(normalizedA[0]), "white", "baseline")}
          </g>
        ) : (
          renderMarkerShape(scaleX(0), scaleY(normalizedA[0]), "white", "baseline")
        ))}
      {viewMode === "delta" && normalizedA.length > 0 && (
        <text
          x={scaleX(0) + 8}
          y={scaleY(0) - 10}
          fontSize="10"
          fill="#6b7280"
          textAnchor="start"
        >
          {baselineText}
        </text>
      )}
      {viewMode === "delta" && (
        <line
          x1={scaleX(0)}
          y1={0}
          x2={scaleX(0)}
          y2={height}
          stroke="#9CA3AF"
          strokeWidth={2.4}
          strokeOpacity={0.4}
        />
      )}
      {/* Control visibility of scenarios (A/B) via showA/showB */}
      {/* Scenario A margin line (blue) */}
      {showA && marginHistoryA.length > 0 && (
        <>
          <path
            d={buildSmoothPath(normalizedA, scaleX, scaleY)}
            fill="none"
            stroke={strategyColors.baseline}
            strokeWidth={
              highlightedSeries === "margin"
                ? 3
                : execRealEstateGraphPassive
                  ? 2.22
                  : 2
            }
            opacity={
              execRealEstateGraphPassive
                ? 0.98 * emphasisOpacity("margin")
                : emphasisOpacity("margin")
            }
            filter={
              highlightedSeries === "margin"
                ? "drop-shadow(0 0 6px rgba(59,130,246,0.6))"
                : "none"
            }
          />
        </>
      )}
      {/* Scenario B margin line (orange), only when B has data */}
      {showB && displayMarginB.length > 0 && (
        <path
          d={buildSmoothPath(normalizedB, scaleX, scaleY)}
          fill="none"
          stroke={strategyColors.goal}
          strokeWidth={
            highlightedSeries === "margin"
              ? 3
              : execRealEstateGraphPassive
                ? 2.02
                : 2
          }
          strokeDasharray={execRealEstateGraphPassive ? "9 6" : "6 4"}
          opacity={
            execRealEstateGraphPassive
              ? 0.93 * emphasisOpacity("margin")
              : emphasisOpacity("margin")
          }
          filter={
            highlightedSeries === "margin"
              ? "drop-shadow(0 0 6px rgba(59,130,246,0.6))"
              : "none"
          }
        />
      )}
      {execRealEstateGraphPassive &&
        executionMarkers.map((marker) => {
          const series = marker.scenario === "A" ? normalizedA : normalizedB;
          const isVisible = marker.scenario === "A" ? showA : showB;
          const value = series[marker.graphIndex];
          if (!isVisible || !Number.isFinite(value)) return null;
          const x = scaleX(marker.graphIndex);
          const pointY = scaleY(value);
          const markerY = Math.max(
            TOP_PADDING + 10,
            Math.min(
              300 - BOTTOM_PADDING - 16,
              pointY + (marker.scenario === "A" ? -13 : 13)
            )
          );
          const color = marker.scenario === "A" ? SERIES_COLOR_A : SERIES_COLOR_B;
          return (
            <g
              key={`${marker.scenario}-${marker.actionId}-${marker.actualExecutionStep}`}
              className="scheduled-execution-marker"
              role="img"
              tabIndex={0}
              aria-label={marker.accessibleLabel}
              focusable="true"
            >
              <title>{marker.accessibleLabel}</title>
              <line
                x1={x}
                x2={x}
                y1={pointY}
                y2={markerY}
                stroke={color}
                strokeWidth={1.25}
                strokeDasharray="2 2"
                opacity={0.9}
                aria-hidden="true"
              />
              {marker.scenario === "A" ? (
                <circle
                  className="scheduled-execution-marker-focus"
                  cx={x}
                  cy={markerY}
                  r={7}
                  fill={color}
                  stroke="#dbeafe"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              ) : (
                <rect
                  className="scheduled-execution-marker-focus"
                  x={x - 6}
                  y={markerY - 6}
                  width={12}
                  height={12}
                  rx={1}
                  fill={color}
                  stroke="#fef3c7"
                  strokeWidth={1.5}
                  transform={`rotate(45 ${x} ${markerY})`}
                  aria-hidden="true"
                />
              )}
              <text
                x={x}
                y={markerY + 2.6}
                textAnchor="middle"
                fontSize={7}
                fontWeight={800}
                fill="#0b1220"
                pointerEvents="none"
                aria-hidden="true"
              >
                {marker.scenario}
              </text>
            </g>
          );
        })}
      {selectedMonthIndex !== undefined &&
        selectedMonthIndex >= 0 &&
        selectedMonthIndex < marginHistoryA.length && (
          <>
            <line
              x1={scaleX(selectedMonthIndex)}
              y1={0}
              x2={scaleX(selectedMonthIndex)}
              y2={height}
              stroke="#64748b"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            {showA && Number.isFinite(marginHistoryA[selectedMonthIndex]) && (
              <g stroke="white" strokeWidth={2}>
                {(() => {
                  const index = selectedMonthIndex;
                  const value = normalizedA[selectedMonthIndex];
                  const isBaselinePoint = index === 0;
                  const isSelectedPoint = index === selectedMonthIndex;
                  const isTippingPoint = index === tippingMarginIndexA || index === tippingMarginIndexB;
                  return renderMarkerShape(
                    scaleX(index),
                    scaleY(value),
                    "#2563eb",
                    isBaselinePoint
                      ? "baseline"
                      : isTippingPoint
                        ? "tipping"
                        : isSelectedPoint
                          ? "selected"
                          : "default"
                  );
                })()}
              </g>
            )}
            {showB &&
              Number.isFinite(
                displayMarginB[selectedMonthIndex] ??
                  marginHistoryB[selectedMonthIndex]
              ) && (
                <g stroke="white" strokeWidth={2}>
                  {(() => {
                    const index = selectedMonthIndex;
                    const value = normalizedB[selectedMonthIndex];
                    const isBaselinePoint = index === 0;
                    const isSelectedPoint = index === selectedMonthIndex;
                    const isTippingPoint = index === tippingMarginIndexA || index === tippingMarginIndexB;
                    return renderMarkerShape(
                      scaleX(index),
                      scaleY(value),
                      execRealEstateGraphPassive ? "#d97706" : "#ef4444",
                      isBaselinePoint
                        ? "baseline"
                        : isTippingPoint
                          ? "tipping"
                          : isSelectedPoint
                            ? "selected"
                            : "default"
                    );
                  })()}
                </g>
              )}
          </>
        )}
      {showA &&
        tippingMarginIndexA != null &&
        marginHistoryA[tippingMarginIndexA] != null && (
          renderMarkerShape(
            scaleX(tippingMarginIndexA),
            scaleY(normalizedA[tippingMarginIndexA]),
            execRealEstateGraphPassive ? "#2563eb" : "#3b82f6",
            "tipping"
          )
        )}

      {driverActivationLineMarkers.map((event, index) => {
          console.log("driverEvent object:", event);
          return (
            <line
              key={`driver-activation-line-${index}-${event.month}`}
              x1={scaleX((event as any).timeIndex ?? event.month ?? (event as any).index)}
              x2={scaleX((event as any).timeIndex ?? event.month ?? (event as any).index)}
              y1={plotAreaY}
              y2={plotAreaY + plotAreaH}
              stroke="rgba(120,180,255,0.35)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          );
        })}
      {scenarioTargetDriverActivationLineMarkers.map((event, index) => {
          const adjustedIndex =
            ((event as any).timeIndex ?? event.month ?? (event as any).index ?? 0) + 1;
          const x = scaleX(adjustedIndex) + 6;

          return (
            <line
              key={`scenario-target-driver-activation-line-${index}-${event.month}`}
              x1={x}
              x2={x}
              y1={plotAreaY}
              y2={plotAreaY + plotAreaH}
              stroke="rgba(120,180,255,0.35)"
              strokeWidth={1}
              strokeDasharray="2,2"
              opacity={0.6}
            />
          );
        })}
      {timelineMonths.map((month, i) => {
          const inSeparationWindow = execRealEstateGraphPassive && i >= 1 && i <= 4;
          return (
            <text
              key={`month-label-${month}`}
              x={scaleX(i)}
              y={height - 6}
              textAnchor="middle"
              fontSize={execRealEstateGraphPassive ? 8 : 10}
              fill={execRealEstateGraphPassive ? (inSeparationWindow ? "#7a8698" : "#64748b") : "#9CA3AF"}
              opacity={execRealEstateGraphPassive ? (inSeparationWindow ? 0.69 : 0.62) : 0.8}
            >
              {`M${i + 1}`}
            </text>
          );
        })}
      </svg>
          {showDriverOverlay &&
            driverActivationOverlayMarkers.map((event, index) => (
              <React.Fragment key={`driver-activation-overlay-${index}`}>
                <div
                  className="driver-marker-wrapper"
                  style={{
                    left: `calc(${plotAreaLeftPercent}% + (${event.xPercent} * ${plotAreaWidthPercent} / 100)%)`,
                    top: `${event.yTopPercent}%`,
                    height: `${event.yHeightPercent}%`,
                  }}
                >
                  <div className="driver-marker-tooltip">
                    {event.label ?? (uiLanguage === "sv" ? "Drivaraktivering" : "Driver activation")}
                  </div>
                  <div className="driver-marker-line" />
                </div>
                <div
                  className="driver-marker-inline-label"
                  style={{
                    left: `calc(${plotAreaLeftPercent}% + (${event.xPercent} * ${plotAreaWidthPercent} / 100)%)`,
                    transform: "translateX(calc(-50% + 1px))",
                    top: `calc(${event.yTopPercent}% + ${42 + event.sameMonthIndex * 18}px)`,
                  }}
                >
                  {event.label ?? (uiLanguage === "sv" ? "Drivaraktivering" : "Driver activation")}
                </div>
              </React.Fragment>
            ))}
        </div>
      </div>
      <div style={{ width: "100%", marginTop: execRealEstateGraphPassive ? "2px" : "6px" }}>
        <div
          ref={sliderTrackRef}
          onMouseDown={(event) => {
            isSliderDraggingRef.current = true;
            updateScrollFromSliderClientX(event.clientX);
          }}
          style={{
            width: "100%",
            height: execRealEstateGraphPassive ? 5 : 6,
            borderRadius: 4,
            background: execRealEstateGraphPassive
              ? "rgba(59, 130, 246, 0.16)"
              : "rgba(59, 130, 246, 0.24)",
            position: "relative",
            cursor: "pointer",
            overflow: "hidden",
          }}
        >
          <div
            onMouseDown={(event) => {
              event.stopPropagation();
              isSliderDraggingRef.current = true;
            }}
            style={{
              position: "absolute",
              left: thumbLeft,
              top: 0,
              width: thumbWidth,
              height: execRealEstateGraphPassive ? 5 : 6,
              borderRadius: 4,
              background: "rgba(96, 165, 250, 0.9)",
              boxShadow: "0 0 0 1px rgba(147, 197, 253, 0.45)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/** Legend row above the margin graph: mirrors `renderMarkerShape` semantics (strategy lines + zone colors). */
export function MarginGraphLegendRow({
  uiLanguage,
  scenarioALabelText,
  scenarioBLabelText,
  selectedScenarioALabel,
  selectedScenarioBLabel,
  executiveDemoMode = false,
  compactExecutivePresentation = false,
}: {
  uiLanguage: "sv" | "en";
  scenarioALabelText?: string;
  scenarioBLabelText?: string;
  selectedScenarioALabel?: string;
  selectedScenarioBLabel?: string;
  /** Simpler labels and fewer legend items for executive demo. */
  executiveDemoMode?: boolean;
  /** Tighter typography and subdued comparison line / icons for real-estate executive polish. */
  compactExecutivePresentation?: boolean;
}) {
  const t = pulseLanguage[uiLanguage];
  const structuralReferencePointsLabel =
    uiLanguage === "sv" ? "Strukturella referenspunkter" : "Structural reference points";
  const stabilizedStructuralMarginLabel =
    uiLanguage === "sv"
      ? "Stabiliserad strukturell marginalnivå"
      : "Stabilised structural margin level";
  const labelStyle = {
    fontSize: compactExecutivePresentation ? "9.5px" : "11px",
    color: compactExecutivePresentation ? "#94a3b8" : "#9CA3AF",
  } as const;
  const rowStyle = {
    fontSize: compactExecutivePresentation ? "11px" : "12px",
    color: "#9CA3AF",
    display: "flex",
    gap: compactExecutivePresentation ? "8px" : "12px",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: compactExecutivePresentation ? "3px" : "8px",
  } as const;
  const scenarioComparisonLabel =
    `${selectedScenarioALabel ?? scenarioALabelText ?? "Scenario A"} vs ${
      selectedScenarioBLabel ?? scenarioBLabelText ?? "Scenario B"
    }`;

  return (
    <div>
      <div style={rowStyle}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
          <span
            style={{
              width: compactExecutivePresentation ? "9px" : "10px",
              height: "2px",
              background: "#3B82F6",
              opacity: compactExecutivePresentation ? 0.75 : 1,
            }}
          />
          <span style={labelStyle}>{scenarioALabelText ?? t.currentStrategy}</span>
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
          <span
            style={{
              width: compactExecutivePresentation ? "9px" : "10px",
              height: "2px",
              background: "#F59E0B",
              opacity: compactExecutivePresentation ? 0.75 : 1,
            }}
          />
          <span style={labelStyle}>{scenarioBLabelText ?? t.alternativeStrategy}</span>
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden style={{ display: "block" }}>
            <circle cx={7} cy={7} r={4} fill="white" stroke="#9ca3af" strokeWidth={1} />
          </svg>
          <span style={labelStyle}>{t.baseline}</span>
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden style={{ display: "block" }}>
            <polygon points="7,1 1,13 13,13" fill="#2563eb" />
          </svg>
          <span style={labelStyle}>{t.selectedTimePoint}</span>
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden style={{ display: "block" }}>
            <polygon points="7,1 1,7 7,13 13,7" fill="#3b82f6" />
          </svg>
          <span style={labelStyle}>{t.tippingPoint}</span>
        </span>
        {!executiveDemoMode && (
          <>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden style={{ display: "block" }}>
            <rect x={2} y={2} width={10} height={10} fill="#22c55e" />
          </svg>
          <span style={labelStyle}>{structuralReferencePointsLabel}</span>
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <svg width={16} height={14} viewBox="0 0 16 14" aria-hidden style={{ display: "block" }}>
            <line
              x1={1}
              y1={7}
              x2={15}
              y2={7}
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="5 3"
            />
          </svg>
          <span style={labelStyle}>{stabilizedStructuralMarginLabel}</span>
        </span>
          </>
        )}
      </div>
      {!compactExecutivePresentation && (
      <div style={{ marginBottom: "6px", fontSize: "12px", opacity: 0.85 }}>
        {scenarioComparisonLabel}
      </div>
      )}
    </div>
  );
}

const MemoizedMarginGraph = React.memo(MarginGraph);

export { MemoizedMarginGraph as default };
