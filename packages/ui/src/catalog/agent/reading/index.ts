import { z } from "zod";
import type { Meta } from "../../meta";
import { numberLine } from "../../format";
import { peekLimit, wordsFor } from "../../lang";
import { migrateLine } from "../../migrations";
import { formatAffordance, visibleItems, type Affordance } from "../index";
import { groupItemLines } from "./group-item-lines";
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
): string[] {
  const nested =
    nestedKey && Array.isArray(item[nestedKey])
      ? (item[nestedKey] as Props[]).flatMap((child) =>
          textsOf(schema?.properties?.[nestedKey]?.items, child),
        )
      : [];
  return [...textsOf(schema, item, omit), ...nested];
}

function textsOf(schema: ReadSchema | undefined, value: Props, omit?: string): string[] {
  return Object.entries(schema?.properties ?? {}).flatMap(([key, field]) => {
    if (key === omit) return [];
    const v = value[key];
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
  const itemSchema = !key
    ? undefined
    : host
      ? (z.toJSONSchema(host.schema, { unrepresentable: "any" }) as ReadSchema)
      : schema.properties?.[key]?.items;
  const group = meta.items?.readGroupBy;
  const groupBy = group && isGroupText(itemSchema?.properties?.[group]) ? group : undefined;
  const exactIds =
    host ||
    group ||
    meta.items?.move?.derived ||
    meta.items?.visibleWhen ||
    (meta.deviceData?.length && meta.live?.derive);
  const ids = (exactIds || meta.sequence || meta.items?.media) && new Set(all.map(({ id }) => String(id)));
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
  const render = (item: Props) => {
    const base = `${instance}/${String(item.id)}`;
    const mine = affordances.filter((a) => a.address === base || a.address.startsWith(`${base}/`));
    return [
      String(item.id),
      itemTexts(itemSchema, item, meta.items?.nested?.key, groupBy).join(" · "),
      ...mine.map(formatAffordance),
    ]
      .filter(Boolean)
      .join(" ");
  };
  const rows = groupBy ? groupItemLines(items, groupBy, render) : items.map(render);
  return [
    line.join(" "),
    ...rows.map((row) => `  ${row}`),
    ...(hidden ? [`  ${(firstOnly ? words.moreRead : words.peekCount)(numberLine(hidden, lang))}`] : []),
    ...(disclosure ? [`  ${peekOpen ? words.peekLess : words.peekMore}`] : []),
  ];
}
