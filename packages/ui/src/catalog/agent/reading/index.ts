import type { Meta } from "../../meta";
import { numberLine } from "../../format";
import { peekLimit, wordsFor } from "../../lang";
import { formatAffordance, visibleItems, type Affordance } from "../index";
export { readAffordances } from "./read-affordances";

type Props = Record<string, unknown>;
export type ReadSchema = {
  properties?: Record<string, ReadSchema>;
  items?: ReadSchema;
  kind?: string;
  default?: unknown;
  type?: string;
};

export function itemTexts(schema: ReadSchema | undefined, item: Props, nestedKey?: string): string[] {
  const nested =
    nestedKey && Array.isArray(item[nestedKey])
      ? (item[nestedKey] as Props[]).flatMap((child) =>
          textsOf(schema?.properties?.[nestedKey]?.items, child),
        )
      : [];
  return [...textsOf(schema, item), ...nested];
}

function textsOf(schema: ReadSchema | undefined, value: Props): string[] {
  return Object.entries(schema?.properties ?? {}).flatMap(([key, field]) => {
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
  const ids = meta.items?.visibleWhen && new Set(all.map(({ id }) => id));
  const ownAff = affordances.filter(({ address }) => {
    if (!key) return true;
    const target = address.slice(instance.length);
    return ids ? !ids.has(target.split("/")[1]) : !/^\/r\d+(?:\/|$)/.test(target);
  });
  const line = [head, own.join(" — "), ...ownAff.map(formatAffordance)].filter(Boolean);
  const firstOnly = meta.items?.visible === "first",
    peek = props.overflow === "peek" && meta.variants?.overflow?.includes("peek");
  const items = firstOnly ? all.slice(0, 1) : peek && !peekOpen ? all.slice(0, peekLimit) : all;
  const words = wordsFor(lang),
    hidden = all.length - items.length;
  const disclosure = peek && ownAff.some(({ part, action }) => part === "more" && action === "toggle");
  const itemSchema = key ? schema.properties?.[key]?.items : undefined;
  return [
    line.join(" "),
    ...items.map((item) => {
      const base = `${instance}/${String(item.id)}`;
      const mine = affordances.filter((a) => a.address === base || a.address.startsWith(`${base}/`));
      return `  ${[
        String(item.id),
        itemTexts(itemSchema, item, meta.items?.nested?.key).join(" · "),
        ...mine.map(formatAffordance),
      ]
        .filter(Boolean)
        .join(" ")}`;
    }),
    ...(hidden ? [`  ${(firstOnly ? words.moreRead : words.peekCount)(numberLine(hidden, lang))}`] : []),
    ...(disclosure ? [`  ${peekOpen ? words.peekLess : words.peekMore}`] : []),
  ];
}
