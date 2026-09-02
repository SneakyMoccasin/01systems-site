"use client";

import { useRef, useState } from "react";

export type ModelSetupTemplate = {
  id: string;
  title: string;
  description: string;
};

type Props = {
  language: "sv" | "en";
  templates: readonly ModelSetupTemplate[];
  loadedTemplateId: string;
  changed: boolean;
  onLoadTemplate: (templateId: string) => void;
  onReturnToManual: () => void;
};

export default function ModelSetupSection({
  language,
  templates,
  loadedTemplateId,
  changed,
  onLoadTemplate,
  onReturnToManual,
}: Props) {
  const [candidateId, setCandidateId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const loadButtonRef = useRef<HTMLButtonElement | null>(null);
  const candidate = templates.find((template) => template.id === candidateId) ?? null;
  const loadedTemplate =
    templates.find((template) => template.id === loadedTemplateId) ?? null;

  const copy =
    language === "sv"
      ? {
          heading: "Modellstart",
          manual: "Manuell konfiguration",
          load: "Ladda mall",
          guidance: "Laddar ett redigerbart exempel som utgångspunkt.",
          choose: "Välj mall",
          current: "Aktuell modellstart",
          editable: "Redigerbar efter inläsning",
          returnManual: "Återgå till manuell konfiguration",
          confirmTitle: "Ersätt väntande ändringar?",
          confirmBody:
            "Den valda mallen ersätter den aktuella konfigurationen. Mallens värden kan redigeras efter inläsning.",
          confirm: "Bekräfta och ladda",
          cancel: "Avbryt",
        }
      : {
          heading: "Model setup",
          manual: "Manual configuration",
          load: "Load template",
          guidance: "Loads an editable example as a starting point.",
          choose: "Choose template",
          current: "Current model setup",
          editable: "Editable after loading",
          returnManual: "Return to manual configuration",
          confirmTitle: "Replace pending changes?",
          confirmBody:
            "The selected template replaces the current configuration. Its values remain editable after loading.",
          confirm: "Confirm and load",
          cancel: "Cancel",
        };

  const applyCandidate = () => {
    if (!candidate) return;
    onLoadTemplate(candidate.id);
    setConfirming(false);
    loadButtonRef.current?.focus();
  };

  const requestLoad = () => {
    if (!candidate) return;
    if (changed) {
      setConfirming(true);
      return;
    }
    applyCandidate();
  };

  const cancelConfirmation = () => {
    setConfirming(false);
    loadButtonRef.current?.focus();
  };

  return (
    <section
      aria-labelledby="ce-model-setup-heading"
      className="border-b px-4 py-4"
      style={{ borderColor: "var(--ce-border)" }}
    >
      <div id="ce-model-setup-heading" className="text-xs font-semibold">
        {copy.heading}
      </div>
      <div
        role="status"
        aria-live="polite"
        data-testid="model-setup-current-state"
        data-model-setup-state={loadedTemplate ? "template" : "manual"}
        className="mt-1 text-[11px]"
        style={{ color: "var(--ce-text-secondary)" }}
      >
        {copy.current}: {loadedTemplate?.title ?? copy.manual}
        {loadedTemplate ? ` · ${copy.editable}` : ""}
      </div>

      <label className="mt-3 block text-[11px]" htmlFor="ce-model-template-choice">
        {copy.choose}
      </label>
      <select
        id="ce-model-template-choice"
        value={candidateId}
        onChange={(event) => {
          setCandidateId(event.target.value);
          setConfirming(false);
        }}
        className="mt-1 w-full rounded-md border px-2.5 py-2 text-xs"
        style={{
          borderColor: "var(--ce-border)",
          background: "var(--ce-control-bg)",
          color: "var(--ce-text-primary)",
        }}
      >
        <option value="">{copy.choose}</option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.title}
          </option>
        ))}
      </select>

      <div
        data-testid="model-template-description"
        className="mt-2 min-h-8 text-[11px] leading-4"
        style={{ color: "var(--ce-text-secondary)" }}
      >
        {candidate?.description ?? copy.guidance}
      </div>

      {!confirming ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            ref={loadButtonRef}
            type="button"
            disabled={!candidate}
            onClick={requestLoad}
            className="rounded-md border px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              borderColor: "var(--ce-divider-strong)",
              background: "var(--ce-control-bg)",
              color: "var(--ce-text-primary)",
            }}
          >
            {copy.load}
          </button>
          {loadedTemplate && (
            <button
              type="button"
              onClick={onReturnToManual}
              className="px-1 py-1.5 text-xs underline-offset-4 hover:underline"
              style={{ color: "var(--ce-text-secondary)" }}
            >
              {copy.returnManual}
            </button>
          )}
        </div>
      ) : (
        <div
          role="alertdialog"
          aria-labelledby="ce-template-confirm-title"
          aria-describedby="ce-template-confirm-description"
          className="mt-3 rounded-md border p-3"
          style={{ borderColor: "var(--ce-divider-strong)" }}
        >
          <div id="ce-template-confirm-title" className="text-xs font-semibold">
            {copy.confirmTitle}
          </div>
          <p
            id="ce-template-confirm-description"
            className="mt-1 text-[11px] leading-4"
            style={{ color: "var(--ce-text-secondary)" }}
          >
            {copy.confirmBody}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={applyCandidate}
              className="rounded-md border px-2.5 py-1.5 text-xs font-medium"
              style={{
                borderColor: "var(--ce-divider-strong)",
                background: "var(--ce-control-bg)",
                color: "var(--ce-text-primary)",
              }}
            >
              {copy.confirm}
            </button>
            <button
              type="button"
              onClick={cancelConfirmation}
              className="px-2.5 py-1.5 text-xs"
              style={{ color: "var(--ce-text-secondary)" }}
            >
              {copy.cancel}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
