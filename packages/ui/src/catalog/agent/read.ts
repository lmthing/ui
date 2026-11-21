import { liveProps, parseControlProps, projectParsedControls } from "./live-props";
import { z } from "zod";
import { numberLine } from "../format";
import type { Definition } from "../probes";
import type { StateName } from "../types";
import { affordancesOf, formatAffordance } from "./affordances";
import { projectLiveClocks, recordClockOffer } from "./clocks";
import { nestedRemaining, visibleNestedProps } from "./selection";
import type { Meta } from "../meta";
import { drawState, drawStatus, projectDraw, readDraw } from "./draw";
import { sessionKey, sessionState, sessionStatus, type SessionState } from "./session";
import { migrateLine, migrateScreen } from "../migrations";
import { componentTexts, readAffordances, readItems, type ReadSchema as Json } from "./reading";
import { projectVisibleItems } from "./visibility";
import { isDeviceDataVisible, projectDeviceData, selectDeviceData, type DeviceData } from "./device-data";
import {
  disabledSelectionChecks,
  projectSelectionBinding,
  selectionBindingFor,
  type BoundSelection,
} from "./selection-binding";

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

function readingProps(
  meta: Meta,
  props: Props,
  instance: string,
  values: Props,
  live: Props,
  session?: SessionState,
) {
  const get = (part: string) => values[`${instance}/${part}`];
  const runtime = Boolean(get("$runtime"));
  const reading = projectParsedControls(meta, props, get, runtime);
  const timed = projectLiveClocks(meta, reading, get, runtime);
  const useLive =
    meta.live ||
    meta.linkedEdits ||
    meta.selectionBinding ||
    meta.items?.visibleWhen ||
    meta.items?.records ||
    Object.values(meta.selections ?? {}).some((s) => s.runtime);
  const projected = projectVisibleItems(
    meta,
    visibleNestedProps(meta, useLive ? live : projectDraw(meta, timed, get), get),
  );
  if (!session) return projected;
  const current =
    session.kind === "rounds"
      ? { [meta.session!.items]: session.recall && session.complete ? [] : [session.item] }
      : {};
  return { ...projected, ...current, [sessionKey]: session };
}

function readProgress(session: SessionState | undefined, lang?: string): string[] {
  const assessment = session?.kind === "rounds" && session.assessment;
  if (!assessment || assessment.correct === undefined) return [];
  const { right, of } = assessment.score;
  return [`correct ${assessment.correct}`, `score ${numberLine(right, lang)}/${numberLine(of, lang)}`];
}

/** A feedback view can use the solution without making it part of the agent's read. */
function sessionForRead(meta: Meta, session: SessionState | undefined) {
  const hidden = meta.session?.kind === "rounds" ? meta.session.assessment?.readHidden : undefined;
  if (!hidden?.length || session?.kind !== "rounds") return session;
  const item = Object.fromEntries(Object.entries(session.item).filter(([key]) => !hidden.includes(key)));
  return { ...session, item };
}

function migrateInput(component: string, input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.hasOwn(input, "c")) return input;
  const line = { ...input, c: component };
  const migrated = migrateLine(line, { variantOnly: true });
  if (migrated === line) return input;
  const { c: _c, ...props } = migrated;
  return props;
}

function readInput(
  def: Definition,
  input: unknown,
  instance: string,
  values: Props,
  data: DeviceData | undefined,
  selection: BoundSelection | undefined,
) {
  const migrated = migrateInput(def.meta.id, input);
  const validated = parseControlProps(def, migrated, (part) => values[`${instance}/${part}`]);
  const live = liveProps(def.meta, validated, instance, values, true, data);
  return { migrated, validated, props: projectSelectionBinding(def.meta, live, selection) };
}

/** Read addressed text and affordances, without styling or secrets (plan 4.12). */
export function readComponent(
  def: Definition,
  input: unknown,
  instance: string,
  state: StateName = "filled",
  values: Record<string, unknown> = {},
  lang?: string,
  deviceData?: DeviceData,
  selection?: BoundSelection,
): string[] {
  const { meta } = def;
  deviceData = projectDeviceData(deviceData, values);
  if (!isDeviceDataVisible(meta, deviceData)) return [];
  const get = (part: string) => values[`${instance}/${part}`];
  const { migrated, validated, props } = readInput(def, input, instance, values, deviceData, selection);
  const base = drawStatus(meta, props, (props.state as StateName | undefined) ?? state, get);
  state = sessionStatus(meta, props, base, get);
  const schema = z.toJSONSchema(def.props, { io: "input", unrepresentable: "any" }) as Json;
  const head = `${instance} ${meta.id}${variantsOf(schema, props)}${state === "filled" ? "" : ` (${state})`}`;
  const draw = drawState(def.meta, props, get),
    session = sessionState(meta, props, get);
  const clock = recordClockOffer(def, migrated as Props, props, get, deviceData, undefined, values);
  const offered = affordancesOf(meta, props, instance, values, state, false, deviceData, clock);
  const affordances = readAffordances(offered, values, def, props, instance, session);
  const feedback = state === "error" && session?.kind === "rounds" && session.assessment?.correct === false;
  if (state !== "filled" && !feedback && !(state === "success" && (draw || session || meta.readSuccess)))
    return [
      [head, ...(state === "empty" ? readDraw(draw) : []), ...affordances.map(formatAffordance)].join(" "),
    ];
  const readable = sessionForRead(meta, session);
  const round = readable?.kind === "rounds" ? readable : undefined;
  const roundKey = round && meta.session?.items;
  const key = meta.items?.key === roundKey ? undefined : meta.items?.key;
  const remaining = nestedRemaining(meta, props);
  const own = [
    ...(meta.read?.(
      readingProps(meta, validated, instance, values, props, readable),
      state,
      lang,
      selectDeviceData(meta, deviceData),
    ) ?? []),
    ...readProgress(session, lang),
    ...readDraw(draw),
    ...(remaining === undefined ? [] : [`remaining ${numberLine(remaining, lang)}`]),
    ...componentTexts(schema, props, key, roundKey, round?.item),
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

export type ScreenLike = {
  id: string;
  title?: string;
  components: ({ id: string; c: string; state?: StateName } & Props)[];
  [disabledSelectionChecks]?: Pick<ReadonlySet<string>, "has">;
};

/** A whole screen as text, for a model to read before acting. */
export function readScreen(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  values: Record<string, unknown> = {},
  lang?: string,
  deviceData?: DeviceData,
): string {
  const snapshot = projectDeviceData(deviceData, values);
  const local = Object.fromEntries(
    Object.entries(values).map(([address, value]) => [address.replace(`${screen.id}/`, ""), value]),
  );
  const header = `screen ${screen.id}${screen.title ? ` ${quote(screen.title)}` : ""}`;
  const migrated = migrateScreen(screen, { variantOnly: true });
  const lines = migrated.components.flatMap(({ id, c, state, ...props }) => {
    const def = defs[c];
    if (!def) return [`${id} ${c} (unknown)`];
    const selection = selectionBindingFor(migrated, defs, def.meta, id, local, snapshot);
    return readComponent(def, props, id, state, local, lang, deviceData, selection?.view);
  });
  return [header, ...lines].join("\n");
}
