import type { ActionName, ActionSpec, Component, ComponentId, StateName, Tier } from "../types";
import type { PackProbe, ChooseProbe } from "../probes";
import type { PackId } from "./pack-ids";
import type { ClockMeta } from "./clocks";

export type NumericAdjustments = Readonly<
  Partial<Record<`${string}.${ActionName}`, { prop: string; delta: number; min?: number; max?: number }>>
>;

export type Meta = {
  id: string;
  group: "structure" | "content" | "data" | "input" | "action" | "beyond" | "signature" | "escape";
  purpose: string;
  pick: string;
  /** Constraints and examples that a compact JSON Schema signature cannot express. */
  writeHints?: readonly string[];
  /** `overlay`: over the screen, outside its flow (a sheet); it has no weight. */
  region: "top" | "body" | "bottom" | "overlay";
  weight: 0 | 1 | 2 | 3;
  weightByStyle?: Readonly<Record<string, 0 | 1 | 2 | 3>>;
  signatureByStyle?: Readonly<Record<string, string>>;
  tier: Tier;
  /** A part that needs more than the component does (a reply that reaches other people) carries its own tier. */
  partTiers?: Readonly<Record<string, Tier>>;
  realPath: string;
  dense?: true;
  confirmParts?: readonly string[];
  clocks?: readonly ClockMeta[];
  adjust?: NumericAdjustments;
  /**
   * `visible: "first"` when only the first item is drawn (a card stack): the reader shows it and
   * counts the rest ("+2 more"), and conformance expects only the first item on screen.
   */
  items?: {
    key: string;
    parts: readonly string[];
    prefix?: string;
    visible?: "all" | "first";
    clocks?: readonly ClockMeta[];
    adjust?: NumericAdjustments;
    nested?: {
      key: string;
      clocks?: readonly ClockMeta[];
      parts: Readonly<
        Record<
          string,
          {
            action: "toggle" | "set";
            prop: string;
            min?: number;
            max?: number;
            integer?: boolean;
            when?: string;
          }
        >
      >;
    };
  };
  select?: {
    prop: string;
    value: "index" | "position" | { field: string };
    mode?: "one" | "flags";
    parts?: Readonly<Record<string, unknown>>;
  };
  parts?: readonly string[];
  states?: readonly StateName[];
  actions?: ActionSpec;
  read?: (props: unknown, state: StateName, lang?: string) => string[];
  signature?: string;
  status?: "draft" | "ready";
  /**
   * Built by code, never chosen or written by the model (TabBar from the sections marked nav). It
   * stays in the catalog and is read like any component, but choose and write prompts leave it out
   * and it has only `read` probes.
   */
  codeOwned?: boolean;
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

export type PackMeta = {
  id: PackId;
  example: string;
  probes: readonly (PackProbe | ChooseProbe)[];
};
export type Slot = {
  allow: readonly ComponentId[];
  required: boolean;
  min?: number;
  max?: number;
  variant?: string;
};
export type ArchetypeMeta = {
  id: string;
  job: string;
  layouts: Record<
    string,
    { recipe: readonly Slot[]; defaults: readonly Component[]; writeHints?: readonly string[] }
  >;
  defaultLayout: string;
};
