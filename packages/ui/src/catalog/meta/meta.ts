import type { ActionSpec, StateName, Tier } from "../types";

export type Meta = {
  id: string;
  group: "structure" | "content" | "data" | "input" | "action" | "beyond" | "signature" | "escape";
  purpose: string;
  pick: string;
  region: "top" | "body" | "bottom";
  weight: 1 | 2 | 3;
  tier: Tier;
  realPath: string;
  /**
   * `visible: "first"` when only the first item is drawn (a card stack): the reader shows it and
   * counts the rest ("+2 more"), and conformance expects only the first item on screen.
   */
  items?: { key: string; parts: readonly string[]; prefix?: string; visible?: "all" | "first" };
  parts?: readonly string[];
  states?: readonly StateName[];
  actions?: ActionSpec;
  aliases: readonly string[];
  read?: (props: unknown, state: StateName) => string[];
  signature?: string;
  status?: "draft" | "ready";
};

export type BaseRoles = Record<
  "bg" | "surface" | "raised" | "line" | "text" | "muted" | "good" | "warn" | "bad",
  string
>;
export type AccentRoles = Record<"accent" | "accentSoft" | "onAccent", string>;
export type PresetMeta = {
  id: string;
  mood: string;
  font: "humanist" | "grotesk" | "rounded" | "serif";
  numbers: "regular" | "condensed";
  /** `strong` sets every text role one step heavier (bold preset). */
  weight: "regular" | "strong";
  shape: "sharp" | "soft" | "round";
  density: "compact" | "regular" | "airy";
  surface: "soft" | "solid" | "hairline";
  roles: { light: BaseRoles; dark: BaseRoles };
};
export type AccentMeta = { id: string; light: AccentRoles; dark: AccentRoles };
