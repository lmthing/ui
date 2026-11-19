export type ItemState = "ready" | "pack in progress" | "draft";

export type Item = {
  id: string;
  group: string;
  tier: string;
  purpose: string;
  pick: string;
  pack: string | null;
  state: ItemState;
  /** The first catalog example as the JSON line a model writes, or "" when it is too long to show. */
  line: string;
};

export type Pack = {
  id: string;
  ready: boolean;
  pick: string;
  example: string;
  plannedComponents: number;
  plannedArchetypes: number;
  builtArchetypes: number;
  items: Item[];
  planned: Planned[];
  wave: number;
  lines: string[];
};

export type Planned = { id: string; group: string; tier: string; summary: string };
export type RecordedScreen = {
  model: string;
  pack: string | null;
  screen: { id: string; title?: string; components: ({ id: string; c: string } & Record<string, unknown>)[] };
};
export type ReadProbe = { model: string; task: string; text: string; address: string; action: string };
export type WaveInfo = { wave: number; why: string; packs: string[] };

export type Preset = { id: string; mood: string; shape: string; density: string; font: string; roles: Roles };
export type Roles = { light: Record<string, string>; dark: Record<string, string> };
export type Accent = { id: string; roles: Roles };

export type Stats = {
  core: number;
  coreByGroup: [string, number][];
  built: number;
  shipped: number;
  drafts: number;
  plannedTotal: number;
  packsReady: number;
  packsInProgress: number;
  packsPlanned: number;
  archetypes: number;
  presetsBuilt: number;
  accentsBuilt: number;
  themesBuilt: number;
};

/** Recorded model output: loaded on demand, because it is the largest part of the data. */
export type RecordedData = { screens: RecordedScreen[]; readProbes: ReadProbe[] };

export type SiteData = {
  repo: string;
  commit: string;
  built: string;
  items: Item[];
  packs: Pack[];
  presets: Preset[];
  accents: Accent[];
  stats: Stats;
  waves: WaveInfo[];
  themeVars: Record<string, Record<string, string>>;
};
