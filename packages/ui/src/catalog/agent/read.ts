import { z } from "zod";
import type { Definition } from "../probes";
import type { StateName } from "../types";
import { stampItemIds } from "../lines";
import { affordancesOf, formatAffordance } from "./affordances";

type Json = {
  properties?: Record<string, Json>;
  items?: Json;
  kind?: string;
  default?: unknown;
  type?: string;
};
type Props = Record<string, unknown>;

const quote = (value: string) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
const variantKeys = ["style", "kind", "tone"];

function textsOf(schema: Json | undefined, value: Props): string[] {
  return Object.entries(schema?.properties ?? {}).flatMap(([key, field]) => {
    const v = value[key];
    if (field.kind === "text" && typeof v === "string") return [quote(v)];
    if (field.kind === "photo" && typeof v === "string") return [`photo:${v.replace(/^lib:/, "")}`];
    if (field.type === "object" && v && typeof v === "object") return textsOf(field, v as Props);
    return [];
  });
}

function variantsOf(schema: Json, props: Props): string {
  return variantKeys
    .filter((key) => props[key] !== undefined && props[key] !== schema.properties?.[key]?.default)
    .filter((key) => !(key === "tone" && props[key] === "neutral"))
    .map((key) => `[${String(props[key])}]`)
    .join("");
}

/**
 * The default reader: one line per component, items indented, text quoted, affordances in brackets
 * with their part. No pixels, colours or fonts. Format: plan 4.12.
 */
export function readComponent(
  def: Definition,
  input: unknown,
  instance: string,
  state: StateName = "filled",
): string[] {
  const props = stampItemIds(def.meta, def.props.parse(input) as Props);
  const schema = z.toJSONSchema(def.props, { io: "input", unrepresentable: "any" }) as Json;
  const head = `${instance} ${def.meta.id}${variantsOf(schema, props)}${state === "filled" ? "" : ` (${state})`}`;
  if (state !== "filled") return [head];
  const affordances = affordancesOf(def.meta, props, instance);
  const key = def.meta.items?.key;
  const own = textsOf(
    { properties: Object.fromEntries(Object.entries(schema.properties ?? {}).filter(([k]) => k !== key)) },
    props,
  );
  const ownAff = affordances.filter((a) => !a.address.startsWith(`${instance}/r`) || !key);
  const line = [head, own.join(" — "), ...ownAff.map((a) => formatAffordance(a, false))].filter(Boolean);
  const items = key && Array.isArray(props[key]) ? (props[key] as Props[]) : [];
  const itemSchema = key ? schema.properties?.[key]?.items : undefined;
  return [
    line.join(" "),
    ...items.map((item) => {
      const base = `${instance}/${String(item.id)}`;
      const mine = affordances.filter((a) => a.address === base || a.address.startsWith(`${base}/`));
      return `  ${[
        String(item.id),
        textsOf(itemSchema, item).join(" · "),
        ...mine.map((a) => formatAffordance(a, true)),
      ]
        .filter(Boolean)
        .join(" ")}`;
    }),
  ];
}

export type ScreenLike = {
  id: string;
  title?: string;
  components: ({ id: string; c: string; state?: StateName } & Props)[];
};

/** A whole screen as text, for a model to read before acting. */
export function readScreen(screen: ScreenLike, defs: Record<string, Definition>): string {
  const header = `screen ${screen.id}${screen.title ? ` ${quote(screen.title)}` : ""}`;
  const lines = screen.components.flatMap(({ id, c, state, ...props }) => {
    const def = defs[c];
    return def ? readComponent(def, props, id, state) : [`${id} ${c} (unknown)`];
  });
  return [header, ...lines].join("\n");
}
