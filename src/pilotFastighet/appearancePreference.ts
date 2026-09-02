export const CE_APPEARANCE_STORAGE_KEY = "cascade-engine:appearance-preference";

export type CascadeAppearancePreference = "system" | "light" | "dark";
export type CascadeResolvedAppearance = "light" | "dark";
export const DEFAULT_CASCADE_APPEARANCE: CascadeAppearancePreference = "dark";

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem">;
type ColorSchemeQuery = {
  matches: boolean;
  addEventListener: (type: "change", listener: (event: { matches: boolean }) => void) => void;
  removeEventListener: (type: "change", listener: (event: { matches: boolean }) => void) => void;
};

export function isCascadeAppearancePreference(value: unknown): value is CascadeAppearancePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function readCascadeAppearancePreference(
  storage: StorageReader | null | undefined
): CascadeAppearancePreference {
  if (!storage) return DEFAULT_CASCADE_APPEARANCE;
  try {
    const value = storage.getItem(CE_APPEARANCE_STORAGE_KEY);
    return isCascadeAppearancePreference(value) ? value : DEFAULT_CASCADE_APPEARANCE;
  } catch {
    return DEFAULT_CASCADE_APPEARANCE;
  }
}

export function writeCascadeAppearancePreference(
  storage: StorageWriter | null | undefined,
  preference: CascadeAppearancePreference
): void {
  if (!storage) return;
  try {
    storage.setItem(CE_APPEARANCE_STORAGE_KEY, preference);
  } catch {
    // Appearance must remain usable when browser storage is unavailable.
  }
}

export function resolveCascadeAppearance(
  preference: CascadeAppearancePreference,
  systemDark: boolean
): CascadeResolvedAppearance {
  return preference === "system" ? (systemDark ? "dark" : "light") : preference;
}

export function subscribeToSystemAppearance(
  query: ColorSchemeQuery,
  preference: CascadeAppearancePreference,
  onChange: (appearance: CascadeResolvedAppearance) => void
): () => void {
  if (preference !== "system") return () => undefined;
  const listener = (event: { matches: boolean }) => onChange(event.matches ? "dark" : "light");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
