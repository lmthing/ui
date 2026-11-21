import { z } from "zod";
import type { Meta } from "../../meta";
import { numberLine } from "../../format";
import { peekLimit, wordsFor } from "../../lang";
import { migrateLine } from "../../migrations";
import { formatAffordance, visibleItems, type Affordance } from "../index";
import { groupItemLines } from "./group-item-lines";
import { matches } from "../visibility";
export { readAffordances, readOffers } from "./read-affordances";

type Props = Record<string, unknown>;
export type ReadSchema = {
  properties?: Record<string, ReadSchema>;
  items?: ReadSchema;
  kind?: string;
  default?: unknown;
  type?: string;
  anyOf?: ReadSchema[];
};

export function migrateInput(component: string, input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.hasOwn(input, "c")) return input;
  const line = { ...input, c: component };
  const migrated = migrateLine(line, { variantOnly: true });
  if (migrated === line) return input;
  const { c: _c, ...props } = migrated;
  return props;
}

function isGroupText(field: ReadSchema | undefined): boolean {
  if (!field || (field.kind !== undefined && field.kind !== "text")) return false;
  if (field.anyOf) {
    const nonnull = field.anyOf.filter((option) => option.type !== "null");
    return nonnull.length > 0 && nonnull.every(isGroupText);
  }
  return field.kind === "text";
}

export function itemTexts(
  schema: ReadSchema | undefined,
  item: Props,
  nestedKey?: string,
  omit?: string,
  secrets?: readonly string[],
): string[] {
  const nested =
    nestedKey && Array.isArray(item[nestedKey])
      ? (item[nestedKey] as Props[]).flatMap((child) =>
          textsOf(schema?.properties?.[nestedKey]?.items, child),
        )
      : [];
  return [...textsOf(schema, item, omit, secrets), ...nested];
}

function textsOf(
  schema: ReadSchema | undefined,
  value: Props,
  omit?: string,
  secrets?: readonly string[],
): string[] {
  return Object.entries(schema?.properties ?? {}).flatMap(([key, field]) => {
    if (key === omit) return [];
    const v = value[key];
    if (secrets?.includes(key)) return typeof v === "string" ? ["(secret)"] : [];
    if (field.kind === "text" && typeof v === "string") return [JSON.stringify(v)];
    if (field.kind === "photo" && typeof v === "string") return [`photo:${v.replace(/^lib:/, "")}`];
    if (field.kind === "secret" && typeof v === "string") return ["(secret)"];
    if (field.type === "object" && v && typeof v === "object") return textsOf(field, v as Props);
    return [];
  });
}

export function componentTexts(
  schema: ReadSchema,
  props: Props,
  key?: string,
  roundKey?: string,
  round?: Props,
) {
  const properties = Object.fromEntries(
    Object.entries(schema.properties ?? {}).filter(([k]) => k !== key && k !== roundKey),
  );
  return [
    ...textsOf({ properties }, props),
    ...(roundKey && round ? textsOf(schema.properties?.[roundKey]?.items, round) : []),
  ];
}

function itemSchemaOf(schema: ReadSchema, key: string | undefined, host: Meta["items"]) {
  if (!key) return;
  return host?.deviceData
    ? (z.toJSONSchema(host.deviceData.schema, { unrepresentable: "any" }) as ReadSchema)
    : schema.properties?.[key]?.items;
}

export function readItems(
  meta: Meta,
  schema: ReadSchema,
  props: Props,
  instance: string,
  key: string | undefined,
  head: string,
  own: string[],
  affordances: Affordance[],
  peekOpen: boolean,
  lang?: string,
) {
  const all = key ? visibleItems(meta, props) : [];
  const host = meta.items?.deviceData;
  const itemSchema = itemSchemaOf(schema, key, meta.items);
  const group = meta.items?.readGroupBy;
  const secrets = meta.items?.readSecrets;
  const groupBy =
    group && !secrets?.fields.includes(group) && isGroupText(itemSchema?.properties?.[group])
      ? group
      : undefined;
  const exactIds =
    host ||
    group ||
    meta.items?.move?.derived ||
    meta.items?.visibleWhen ||
    (meta.deviceData?.length && meta.live?.derive);
  const ids = exactIds && new Set(all.map(({ id }) => String(id)));
  const ownAff = affordances.filter(({ address }) => {
    if (!key) return true;
    const target = address.slice(instance.length);
    return ids ? !ids.has(target.split("/")[1] ?? "") : !/^\/r\d+(?:\/|$)/.test(target);
  });
  const line = [head, own.join(" — "), ...ownAff.map(formatAffordance)].filter(Boolean);
  const firstOnly = meta.items?.visible === "first",
    peek = props.overflow === "peek" && meta.variants?.overflow?.includes("peek");
  const items = firstOnly ? all.slice(0, 1) : peek && !peekOpen ? all.slice(0, peekLimit) : all;
  const words = wordsFor(lang),
    hidden = all.length - items.length;
  const disclosure = peek && ownAff.some(({ part, action }) => part === "more" && action === "toggle");
  // prettier-ignore
  const render = (item: Props) => {
    const base = `${instance}/${String(item.id)}`;
    const mine = affordances.filter((a) => a.address === base || a.address.startsWith(`${base}/`));
    const redact = secrets && matches(secrets.when, item, props) ? secrets.fields : undefined;
    return [
      String(item.id), itemTexts(itemSchema, item, meta.items?.nested?.key, groupBy, redact).join(" · "),
      ...mine.map(formatAffordance),
    ].filter(Boolean).join(" ");
  };
  const rows = groupBy ? groupItemLines(items, groupBy, render) : items.map(render);
  return [
    line.join(" "),
    ...rows.map((row) => `  ${row}`),
    ...(hidden ? [`  ${(firstOnly ? words.moreRead : words.peekCount)(numberLine(hidden, lang))}`] : []),
    ...(disclosure ? [`  ${peekOpen ? words.peekLess : words.peekMore}`] : []),
  ];
}
