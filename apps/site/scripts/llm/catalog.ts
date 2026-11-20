// The built catalog, loaded the same way as in site-data.ts, with just the parts the text files need.
import { toJSONSchema } from "zod";

type Schema = {
  safeParse: (value: unknown) => {
    success: boolean;
    error?: { issues: { path: PropertyKey[]; message: string }[] };
  };
};
export type Meta = {
  id: string;
  group: string;
  purpose: string;
  pick: string;
  tier: string;
  realPath?: string;
  parts?: readonly string[];
  states?: readonly string[];
  actions?: { parts?: Record<string, readonly string[]>; when?: Record<string, unknown> };
  items?: { key?: string; variants?: Record<string, readonly string[]> };
  variants?: Record<string, readonly string[]>;
};
export type Def = { meta: Meta; props: Schema; examples: unknown[] };
type Affordance = { address: string; part: string; action: string; detail: string };
export type Screen = { id: string; components: ({ id: string; c: string } & Record<string, unknown>)[] };

type Cat = {
  components: Record<string, Def>;
  readScreen: (screen: Screen, defs: Record<string, Def>) => string;
  affordancesOf: (meta: Meta, props: unknown, instance: string, values: unknown) => Affordance[];
  stampItemIds: (meta: Meta, props: unknown) => unknown;
  writerFormat: (registry: { ids: string[]; defs: Def[] }) => unknown;
  writerFormatFor: (def: Def) => unknown;
  variantAxes: Record<string, { kind: string; values: readonly string[] }>;
  archetypes: Record<string, { meta: { id: string; purpose?: string } }>;
  packArchetypes: Record<string, { id: string; job?: string }[] | undefined>;
  packIds: string[];
  createRegistry: (options: { includeDrafts?: boolean; packs?: string[] }) => {
    ids: string[];
    defs: Def[];
    packOf: Record<string, string | undefined>;
  };
};

const root = new URL("../../../../packages/ui/dist/catalog.js", import.meta.url).href;
export const cat = (await import(root)) as unknown as Cat;

/** The component's props as JSON Schema, the input side (defaulted fields are optional). */
export const schemaOf = (def: Def): Record<string, unknown> =>
  toJSONSchema(def.props as never, { io: "input", unrepresentable: "any" }) as Record<string, unknown>;

/** `{ id, c, ...props }`, the wire line for an example. Item ids are not written: code stamps them. */
export const lineOf = (id: string, c: string, props: unknown): string =>
  JSON.stringify({ id, c, ...(props as object) });

export const screenOf = (id: string, lines: string[]): Screen => ({
  id,
  components: lines.map((line) => JSON.parse(line) as Screen["components"][number]),
});

/** Text an agent reads for a screen, or "" when the catalog cannot read it. */
export function readText(screen: Screen): string {
  try {
    return cat.readScreen(screen, cat.components);
  } catch {
    return "";
  }
}

/** A sample answer for the act step: the first press or toggle the screen offers. */
export function sampleAct(screen: Screen): { address: string; action: string } | null {
  const offered = screen.components.flatMap(({ id, c, ...props }) => {
    const def = cat.components[c];
    return def ? cat.affordancesOf(def.meta, cat.stampItemIds(def.meta, props), id, {}) : [];
  });
  const pick = offered.find((a) => a.action === "press" || a.action === "toggle") ?? offered[0];
  return pick ? { address: pick.address, action: pick.action } : null;
}
