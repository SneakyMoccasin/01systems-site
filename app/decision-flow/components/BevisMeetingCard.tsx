"use client";

import BevisMode from "./BevisMode";

// Read-only component for Bevis mode left panel
// Shows case selector and comparison summary

type BevisMeetingCardProps = {
  selectedCaseId?: string;
  onCaseChange?: (caseId: string) => void;
  onTimelineDataChange?: (planAData: any[], planBData: any[]) => void;
};

export default function BevisMeetingCard({ selectedCaseId, onCaseChange, onTimelineDataChange }: BevisMeetingCardProps) {
  return (
    <div>
      <BevisMode 
        selectedCaseId={selectedCaseId}
        onCaseChange={onCaseChange}
        onTimelineDataChange={onTimelineDataChange}
      />
    </div>
  );
}
