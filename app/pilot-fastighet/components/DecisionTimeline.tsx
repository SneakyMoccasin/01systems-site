import React, { useState } from "react";
import { EVENT_TRANSLATIONS } from "@/src/pilotFastighet/uiText";
import { pulseLanguage } from "@/src/i18n/pulseLanguage";

type DecisionImpact = "stabilising" | "pressure" | "shock";

type DecisionEvent = {
  quarter: number;
  type: string;
  impact?: DecisionImpact;
};

type Props = {
  events: DecisionEvent[];
  totalQuarters: number;
  language: "sv" | "en";
};

const getImpactColor = (impact?: DecisionImpact): string => {
  if (impact === "stabilising") return "#22c55e";
  if (impact === "pressure") return "#f97316";
  if (impact === "shock") return "#ef4444";
  return "#3b82f6";
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const DecisionTimeline: React.FC<Props> = ({
  events,
  totalQuarters,
  language,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const uiLanguage = language;
  const t = pulseLanguage[uiLanguage];

  const header = (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "12px",
        color: "#9CA3AF",
        marginBottom: "6px",
      }}
    >
      <span>{t.decisionTimeline}</span>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            marginLeft: "10px",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#22c55e",
            }}
          />
          <span>{t.action}</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            marginLeft: "10px",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#f97316",
            }}
          />
          <span>{t.riskDecision}</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            marginLeft: "10px",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#ef4444",
            }}
          />
          <span>{t.systemEvent}</span>
        </div>
      </div>
    </div>
  );

  if (!events || events.length === 0 || totalQuarters <= 0) {
    return (
      <>
        {header}
        <div
          style={{
            height: "48px",
            borderTop: "1px solid #1f2937",
            borderBottom: "1px solid #1f2937",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: "12px",
            marginBottom: "12px",
          }}
        >
          <span style={{ fontSize: "12px", color: "#6b7280" }}>
            {t.noDecisionEvents}
          </span>
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      <div
        style={{
          overflowX: "auto",
          maxWidth: "100%",
          overflowY: "hidden",
          paddingBottom: 6,
        }}
      >
        <div
          style={{
            position: "relative",
            height: "62px",
            borderTop: "1px solid #1f2937",
            borderBottom: "1px solid #1f2937",
            marginTop: "12px",
            marginBottom: "12px",
            minWidth: `${totalQuarters * 48}px`,
          }}
        >
        <div
          style={{
            position: "absolute",
            top: "17px",
            left: 0,
            right: 0,
            height: "2px",
            background: "#374151",
          }}
        />
        {Array.from({ length: totalQuarters }, (_, i) => {
          const quarter = i + 1;
          const index = quarter - 1;
          const totalSteps = Math.max(totalQuarters, 1);
          const LEFT_PADDING = 55;
          const RIGHT_PADDING = 10;
          const VIEWBOX_WIDTH = 600;
          const GRAPH_WIDTH = VIEWBOX_WIDTH - LEFT_PADDING - RIGHT_PADDING;
          let x = LEFT_PADDING;
          if (totalSteps > 1) {
            x = LEFT_PADDING + (index / (totalSteps - 1)) * GRAPH_WIDTH;
          }
          const left = `${(x / VIEWBOX_WIDTH) * 100}%`;
          return (
            <div
              key={`tick-${quarter}`}
              style={{
                position: "absolute",
                top: "14px",
                left,
                width: "1px",
                height: "6px",
                background: "#374151",
                opacity: 0.6,
                transform: "translateX(-50%)",
              }}
            />
          );
        })}
        {events.map((event, index) => {
          const eventIndex = event.quarter - 1;
          const totalSteps = Math.max(totalQuarters, 1);
          const LEFT_PADDING = 55;
          const RIGHT_PADDING = 10;
          const VIEWBOX_WIDTH = 600;
          const GRAPH_WIDTH = VIEWBOX_WIDTH - LEFT_PADDING - RIGHT_PADDING;
          const offsetY = index % 2 === 0 ? -16 : 20;
          let x = LEFT_PADDING;
          if (totalSteps > 1) {
            x = LEFT_PADDING + (eventIndex / (totalSteps - 1)) * GRAPH_WIDTH;
          }
          const left = `${(x / VIEWBOX_WIDTH) * 100}%`;
          const isHovered = hoverIndex === index;

          return (
            <React.Fragment
              key={`${event.quarter}-${event.type}-${index}`}
            >
              <div
                style={{
                  position: "absolute",
                  top: "12px",
                  left,
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: getImpactColor(event.impact),
                  transform: "translateX(-50%)",
                  cursor: "pointer",
                }}
                onMouseEnter={() => setHoverIndex(index)}
                onMouseLeave={() => setHoverIndex(null)}
              >
                {isHovered && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "20px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "#111827",
                      border: "1px solid #1f2937",
                      padding: "4px 8px",
                      fontSize: "10px",
                      borderRadius: "4px",
                      whiteSpace: "nowrap",
                      color: "#e5e7eb",
                      zIndex: 10,
                    }}
                  >
                    {`Q${event.quarter} – ${
                      EVENT_TRANSLATIONS[
                        event.type as keyof typeof EVENT_TRANSLATIONS
                      ]?.[language] ?? event.type
                    }`}
                  </div>
                )}
              </div>
              <span
                style={{
                  position: "absolute",
                  top: `${-12 + offsetY}px`,
                  left,
                  transform: "translateX(-50%)",
                  fontSize: "10px",
                  color: "#9CA3AF",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                }}
              >
                {EVENT_TRANSLATIONS[event.type as keyof typeof EVENT_TRANSLATIONS]?.[
                  language
                ] ?? event.type}
              </span>
            </React.Fragment>
          );
        })}
        {Array.from({ length: totalQuarters }, (_, i) => {
          const index = i;
          const totalSteps = Math.max(totalQuarters, 1);
          const LEFT_PADDING = 55;
          const RIGHT_PADDING = 10;
          const VIEWBOX_WIDTH = 600;
          const GRAPH_WIDTH = VIEWBOX_WIDTH - LEFT_PADDING - RIGHT_PADDING;
          const offsetY = index % 2 === 0 ? -16 : 20;
          let x = LEFT_PADDING;
          if (totalSteps > 1) {
            x = LEFT_PADDING + (index / (totalSteps - 1)) * GRAPH_WIDTH;
          }
          const left = `${(x / VIEWBOX_WIDTH) * 100}%`;
          return (
            <span
              key={`label-${i + 1}`}
              style={{
                position: "absolute",
                top: `${28 + offsetY}px`,
                left,
                transform: "translateX(-50%)",
                fontSize: "10px",
                color: "#6B7280",
              }}
            >
              {`M${i + 1}`}
            </span>
          );
        })}
        </div>
      </div>
    </>
  );
};

export default DecisionTimeline;

