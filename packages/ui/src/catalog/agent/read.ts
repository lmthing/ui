import { controlValueKey, liveProps, parseControlProps, projectParsedControls } from "./live-props";
import { z } from "zod";
import { numberLine } from "../format";
import { peekLimit, wordsFor } from "../lang";
import type { Definition } from "../probes";
import type { StateName } from "../types";
import { affordancesOf, formatAffordance, partTierAt, type Affordance } from "./affordances";
import { numericSetAt, projectClocks } from "./clocks";
import { nestedRemaining, visibleNestedProps } from "./selection";
import { choiceValues, selectionOffer } from "./validate-value";
import type { Meta } from "../meta";
import { drawState, drawStatus, projectDraw, readDraw } from "./draw";
import { sessionKey, sessionState, sessionStatus, type SessionState } from "./session";
import { migrateLine, migrateScreen } from "../migrations";
import { componentTexts, itemTexts, type ReadSchema as Json } from "./reading";
import { projectVisibleItems, visibleItems } from "./visibility";

type Props = Record<string, unknown>;

const quote = (value: string) => JSON.stringify(value);
const variantKeys = ["style", "kind", "tone"];

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
  def: Definition,
  props: Props,
  instance: string,
) {
  const { meta } = def;
  return affordances.map((a) => {
    const risk = risks[partTierAt(meta, props, a.part)] ?? "";
    const target = a.address === instance ? "root" : a.address.slice(instance.length + 1);
    const choices = a.action === "select" && choiceValues(meta, props, target);
    const set = a.action === "set" && numericSetAt(meta, props, target);
    const value = choices
      ? props[selectionOffer(meta, target)!.prop]
      : set
        ? values[`${instance}/${controlValueKey(def, set.key)}`] === undefined
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

function readingProps(meta: Meta, props: Props, instance: string, values: Props, session?: SessionState) {
  const get = (part: string) => values[`${instance}/${part}`];
  const runtime = Boolean(get("$runtime"));
  const reading = projectParsedControls(meta, props, get, runtime);
  const timed = runtime ? projectClocks(meta, reading, get, Number(get("$now") ?? Date.now())) : reading;
  const projected = projectVisibleItems(meta, visibleNestedProps(meta, projectDraw(meta, timed, get), get));
  if (!session) return projected;
  const current = session.kind === "rounds" ? { [meta.session!.items]: [session.item] } : {};
  return { ...projected, ...current, [sessionKey]: session };
}

function migrateInput(component: string, input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.hasOwn(input, "c")) return input;
  const line = { ...input, c: component };
  const migrated = migrateLine(line, { variantOnly: true });
  if (migrated === line) return input;
  const { c: _c, ...props } = migrated;
  return props;
}

/** Read addressed text and affordances, without styling or secrets (plan 4.12). */
export function readComponent(
  def: Definition,
  input: unknown,
  instance: string,
  state: StateName = "filled",
  values: Record<string, unknown> = {},
  lang?: string,
): string[] {
  const { meta } = def;
  const get = (part: string) => values[`${instance}/${part}`];
  const validated = parseControlProps(def, migrateInput(meta.id, input), get);
  const props = liveProps(meta, validated, instance, values, true);
  const base = drawStatus(meta, props, (props.state as StateName | undefined) ?? state, get);
  state = sessionStatus(meta, props, base, get);
  const schema = z.toJSONSchema(def.props, { io: "input", unrepresentable: "any" }) as Json;
  const head = `${instance} ${meta.id}${variantsOf(schema, props)}${state === "filled" ? "" : ` (${state})`}`;
  const draw = drawState(def.meta, props, get),
    session = sessionState(meta, props, get);
  const offered = affordancesOf(meta, props, instance, values, state);
  const affordances = withValues(offered, values, def, props, instance);
  if (state !== "filled" && !(state === "success" && (draw || session)))
    return [
      [head, ...(state === "empty" ? readDraw(draw) : []), ...affordances.map(formatAffordance)].join(" "),
    ];
  const roundKey = session?.kind === "rounds" ? meta.session?.items : undefined;
  const key = meta.items?.key === roundKey ? undefined : meta.items?.key;
  const remaining = nestedRemaining(meta, props);
  const own = [
    ...(meta.read?.(readingProps(meta, validated, instance, values, session), state, lang) ?? []),
    ...readDraw(draw),
    ...(remaining === undefined ? [] : [`remaining ${numberLine(remaining, lang)}`]),
    ...componentTexts(schema, props, key, roundKey, session?.kind === "rounds" ? session.item : undefined),
  ];
  return readItems(
    meta,
    schema,
    visibleNestedProps(meta, props, get),
    instance,
    key,
    head,
    own,
    affordances,
    get("more") === true,
    lang,
  );
}

function readItems(
  meta: Meta,
  schema: Json,
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
  const line = [head, own.join(" — "), ...ownAff.map((a) => formatAffordance(a))].filter(Boolean);
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
        ...mine.map((a) => formatAffordance(a)),
      ]
        .filter(Boolean)
        .join(" ")}`;
    }),
    ...(hidden ? [`  ${(firstOnly ? words.moreRead : words.peekCount)(numberLine(hidden, lang))}`] : []),
    ...(disclosure ? [`  ${peekOpen ? words.peekLess : words.peekMore}`] : []),
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
  const lines = migrateScreen(screen, { variantOnly: true }).components.flatMap(
    ({ id, c, state, ...props }) => {
      const def = defs[c];
      return def ? readComponent(def, props, id, state, local, lang) : [`${id} ${c} (unknown)`];
    },
  );
  return [header, ...lines].join("\n");
}
