export type BaseRoles = Record<
  "bg" | "surface" | "raised" | "line" | "text" | "muted" | "good" | "warn" | "bad",
  string
>;
export type AccentRoles = Record<"accent" | "accentSoft" | "onAccent", string>;
type PresetFont = "humanist" | "grotesk" | "rounded" | "serif";
export type PresetMeta = {
  id: string;
  mood: string;
  font: PresetFont;
  heading?: PresetFont;
  numbers: "regular" | "condensed";
  /** `strong` sets every text role one step heavier (bold preset). */
  weight: "regular" | "strong";
  shape: "sharp" | "soft" | "round";
  density: "compact" | "regular" | "airy";
  surface: "soft" | "solid" | "hairline";
  roles: { light: BaseRoles; dark: BaseRoles };
};
export type AccentMeta = { id: string; light: AccentRoles; dark: AccentRoles };
