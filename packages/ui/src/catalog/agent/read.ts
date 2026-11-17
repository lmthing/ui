import { z } from "zod";
import type { Definition } from "../probes";
import type { StateName } from "../types";
import { stampItemIds } from "../lines";
import { affordancesOf, formatAffordance, type Affordance } from "./affordances";

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
    if (field.kind === "secret" && typeof v === "string") return ["(secret)"];
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

const risks: Record<string, string> = {
  ok: " !needs-ok",
  people: " !needs-people",
  service: " !needs-service",
};

/** Live values (keyed by address relative to the screen) replace a toggle's or check's initial state. */
function withValues(affordances: Affordance[], values: Record<string, unknown>, risk: string) {
  return affordances.map((a) => {
    const value = values[a.address];
    let detail = a.detail;
    if (typeof value === "boolean" && a.action === "toggle") detail = `:${value ? "on" : "off"}`;
    if (typeof value === "boolean" && a.action === "check") detail = `:${value ? "done" : "todo"}`;
    if (value !== undefined && ["type", "set", "select"].includes(a.action))
      detail = ` = ${JSON.stringify(value)}`;
    return { ...a, detail: `${detail}${risk}` };
  });
}

/**
 * The default reader: one line per component, items indented, text quoted, affordances in brackets
 * with their part. No pixels, colours or fonts. Format: plan 4.12. Actions on a part whose tier is
 * not `phone` carry a risk mark (`!needs-ok`): a real app would gate them. Secrets read as `(secret)`.
 */
export function readComponent(
  def: Definition,
  input: unknown,
  instance: string,
  state: StateName = "filled",
  values: Record<string, unknown> = {},
): string[] {
  const props = stampItemIds(def.meta, def.props.parse(input) as Props);
  const schema = z.toJSONSchema(def.props, { io: "input", unrepresentable: "any" }) as Json;
  const head = `${instance} ${def.meta.id}${variantsOf(schema, props)}${state === "filled" ? "" : ` (${state})`}`;
  if (state !== "filled") return [head];
  const affordances = withValues(
    affordancesOf(def.meta, props, instance),
    values,
    risks[def.meta.tier] ?? "",
  );
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
export function readScreen(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  values: Record<string, unknown> = {},
): string {
  const local = Object.fromEntries(
    Object.entries(values).map(([address, value]) => [address.replace(`${screen.id}/`, ""), value]),
  );
  const header = `screen ${screen.id}${screen.title ? ` ${quote(screen.title)}` : ""}`;
  const lines = screen.components.flatMap(({ id, c, state, ...props }) => {
    const def = defs[c];
    return def ? readComponent(def, props, id, state, local) : [`${id} ${c} (unknown)`];
  });
  return [header, ...lines].join("\n");
}
