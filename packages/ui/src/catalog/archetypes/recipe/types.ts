import type { Tier } from "../../types";

export type Slot = {
  id: string;
  allow: readonly string[];
  min: number;
  max: number;
  variant?: string;
};
export type DefaultLine = {
  c: string;
  variant?: string;
  seed?: Readonly<Record<string, unknown>>;
  /** Suggested default copy, not a requirement on model-authored screens. */
  example?: Readonly<Record<string, unknown>>;
};
export type ArchetypeMeta = {
  id: string;
  purpose: string;
  tier?: Tier;
  layouts: Readonly<
    Record<string, { slots: readonly Slot[]; writeHints?: readonly string[]; packOverride?: true }>
  >;
  defaults: Readonly<Record<string, readonly DefaultLine[]>>;
};
export type ComposeProbe = { kind: "compose"; archetype: string; layout: string; brief: string };
