export type Slot = {
  id: string;
  allow: readonly string[];
  min: number;
  max: number;
  variant?: string;
};
export type DefaultLine = { c: string; variant?: string };
export type ArchetypeMeta = {
  id: string;
  purpose: string;
  layouts: Readonly<
    Record<string, { slots: readonly Slot[]; writeHints?: readonly string[]; packOverride?: true }>
  >;
  defaults: Readonly<Record<string, readonly DefaultLine[]>>;
};
export type ComposeProbe = { kind: "compose"; archetype: string; layout: string; brief: string };
