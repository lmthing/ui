import { liveProps, parseControlProps, projectParsedControls } from "./live-props";
import { z } from "zod";
import { numberLine } from "../format";
import { wordsFor } from "../lang";
import type { Definition } from "../probes";
import type { StateName } from "../types";
import { affordancesOf, formatAffordance, type Affordance } from "./affordances";
import { numericSetAt, projectClocks } from "./clocks";
import { choiceValues } from "./selection";
import type { Meta } from "../meta";

type Json = {
  properties?: Record<string, Json>;
  items?: Json;
  kind?: string;
  default?: unknown;
  type?: string;
};
type Props = Record<string, unknown>;

const quote = (value: string) => JSON.stringify(value);
const variantKeys = ["style", "kind", "tone"];

function itemTexts(schema: Json | undefined, item: Props, nestedKey: string | undefined): string[] {
  const nested =
    nestedKey && Array.isArray(item[nestedKey])
      ? (item[nestedKey] as Props[]).flatMap((child) =>
          textsOf(schema?.properties?.[nestedKey]?.items, child),
        )
      : [];
  return [...textsOf(schema, item), ...nested];
}

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
function withValues(
  affordances: Affordance[],
  values: Record<string, unknown>,
  meta: Meta,
  props: Props,
  instance: string,
) {
  return affordances.map((a) => {
    const risk = risks[meta.partTiers?.[a.part] ?? meta.tier] ?? "";
    const target = a.address === instance ? "root" : a.address.slice(instance.length + 1);
    const choices = a.action === "select" && choiceValues(meta, props, target);
    const set = a.action === "set" && numericSetAt(meta, props, target);
    const value = choices
      ? props[meta.select!.prop]
      : set
        ? values[`${instance}/${set.key}`] === undefined
          ? undefined
          : set.value
        : (values[`${a.address}/$draft`] ?? values[a.address]);
    let detail = a.detail;
    if (typeof value === "boolean" && a.action === "toggle") detail = `:${value ? "on" : "off"}`;
    if (typeof value === "boolean" && a.action === "check") detail = `:${value ? "done" : "todo"}`;
    if (value !== undefined && ["type", "set", "select"].includes(a.action))
      detail = ` = ${JSON.stringify(value)}`;
    if (choices) detail += `${detail ? ";" : ""} choices ${JSON.stringify(choices)}`;
    return { ...a, detail: `${detail}${risk}` };
  });
}

function readingProps(meta: Meta, props: Props, instance: string, values: Props) {
  const get = (part: string) => values[`${instance}/${part}`];
  const runtime = Boolean(get("$runtime"));
  const reading = projectParsedControls(meta, props, get, runtime);
  return runtime ? projectClocks(meta, reading, get, Number(get("$now") ?? Date.now())) : reading;
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
  lang?: string,
): string[] {
  const validated = parseControlProps(def, input, (part) => values[`${instance}/${part}`]);
  const props = liveProps(def.meta, validated, instance, values, true);
  state = (props.state as StateName | undefined) ?? state;
  const schema = z.toJSONSchema(def.props, { io: "input", unrepresentable: "any" }) as Json;
  const head = `${instance} ${def.meta.id}${variantsOf(schema, props)}${state === "filled" ? "" : ` (${state})`}`;
  if (state !== "filled") return [head];
  const affordances = withValues(
    affordancesOf(def.meta, props, instance, values),
    values,
    def.meta,
    props,
    instance,
  );
  const key = def.meta.items?.key;
  const own = [
    ...(def.meta.read?.(readingProps(def.meta, validated, instance, values), state, lang) ?? []),
    ...textsOf(
      { properties: Object.fromEntries(Object.entries(schema.properties ?? {}).filter(([k]) => k !== key)) },
      props,
    ),
  ];
  const ownAff = affordances.filter((a) => !key || !/^\/r\d+(?:\/|$)/.test(a.address.slice(instance.length)));
  const line = [head, own.join(" — "), ...ownAff.map((a) => formatAffordance(a))].filter(Boolean);
  const all = key && Array.isArray(props[key]) ? (props[key] as Props[]) : [];
  // A stack shows only its first item; the rest are counted, not read.
  const firstOnly = def.meta.items?.visible === "first";
  const items = firstOnly ? all.slice(0, 1) : all;
  const itemSchema = key ? schema.properties?.[key]?.items : undefined;
  return [
    line.join(" "),
    ...items.map((item) => {
      const base = `${instance}/${String(item.id)}`;
      const mine = affordances.filter((a) => a.address === base || a.address.startsWith(`${base}/`));
      return `  ${[
        String(item.id),
        itemTexts(itemSchema, item, def.meta.items?.nested?.key).join(" · "),
        ...mine.map((a) => formatAffordance(a)),
      ]
        .filter(Boolean)
        .join(" ")}`;
    }),
    ...(firstOnly && all.length > 1
      ? [`  ${wordsFor(lang).moreRead(numberLine(all.length - 1, lang))}`]
      : []),
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
  lang?: string,
): string {
  const local = Object.fromEntries(
    Object.entries(values).map(([address, value]) => [address.replace(`${screen.id}/`, ""), value]),
  );
  const header = `screen ${screen.id}${screen.title ? ` ${quote(screen.title)}` : ""}`;
  const lines = screen.components.flatMap(({ id, c, state, ...props }) => {
    const def = defs[c];
    return def ? readComponent(def, props, id, state, local, lang) : [`${id} ${c} (unknown)`];
  });
  return [header, ...lines].join("\n");
}
