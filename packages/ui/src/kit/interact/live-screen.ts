import {
  projectControls,
  projectControlInput,
  projectClocks,
  projectAdjustments,
  liveProps,
  hostItemInput,
  hostWireItemIds,
  parseControlProps,
  drawStatus,
  buzzStatus,
  hasPlaybackClock,
  sessionStatus,
  sequenceKey,
  atDeviceTime,
  projectDeviceData,
  withRecordScreen,
  type DeviceData,
  type ClockState,
  type Definition,
  type ScreenLike,
  type Values,
} from "../../catalog";
export type TimerState = ClockState;
export const valueKey = (screen: string, id: string, part: string) => `${screen}/${id}/${part}`;
/** Project only schema-owned props; raw drafts, expansion and swipe cursors remain in the store. */
export function projectScreen(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
  now: number,
  openSheet?: string,
  includeSheet = false,
  clocks = true,
  deviceData?: DeviceData,
): ScreenLike {
  return {
    ...screen,
    components: screen.components
      .filter(
        (entry) =>
          !values[valueKey(screen.id, entry.id, "$dismissed")] &&
          (entry.c !== "Sheet" || includeSheet || entry.id === openSheet),
      )
      .map((entry) => {
        const result = projectEntry(entry, screen, defs, values, now, clocks);
        if (clocks) projectSequenceCursor(defs[entry.c], result, screen, values, now, deviceData);
        return result;
      }),
  };
}

type Entry = ScreenLike["components"][number];
function projectItems(
  entry: Entry,
  parsed: Values,
  get: (part: string) => unknown,
  result: Entry,
  ids?: readonly (string | undefined)[],
) {
  const raw = (key: string) => entry[key] as Record<string, unknown>[];
  const item = (index: number) => ids?.[index] ?? `r${index + 1}`;
  if (entry.c === "Choice" && parsed.multi)
    result.options = raw("options").map((row, index) => ({
      ...row,
      on: get(item(index)) ?? row.on ?? false,
    }));
  if (entry.c === "List")
    result.rows = raw("rows").map((row, index) => {
      const on = get(`${item(index)}/trail`);
      return row.trail === "toggle" && typeof on === "boolean" ? { ...row, value: on ? "on" : "off" } : row;
    });
  if (entry.c === "Checklist")
    result.items = raw("items").map((row, index) => ({
      ...row,
      done: get(`${item(index)}/check`) ?? row.done ?? false,
    }));
}

function omitDerivedSelection(def: Definition, result: Entry) {
  const { meta } = def;
  const part = meta.select?.prop;
  if (
    part &&
    !Object.hasOwn(def.props.shape, part) &&
    (meta.items?.nested?.activeParent ||
      meta.live?.derive ||
      meta.items?.edits ||
      meta.items?.deviceData ||
      meta.recordRuntime)
  )
    delete result[part];
}

function seedDrawDefaults(def: Definition, result: Entry, parsed: Values) {
  for (const key of Object.keys(def.props.shape))
    if (result[key] === undefined && parsed[key] !== undefined) result[key] = parsed[key];
}

function projectEntry(
  entry: Entry,
  screen: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
  now: number,
  clocks: boolean,
): Entry {
  const get = (part: string) => values[valueKey(screen.id, entry.id, part)];
  const result = { ...entry };
  const { id: _id, c: _c, state: _state, ...input } = entry;
  const def = defs[entry.c];
  if (!def) return result;
  const { meta } = def;
  const parsed = def.props.parse(hostItemInput(def, input).wire);
  if (meta.draw) seedDrawDefaults(def, result, parsed);
  const projected = projectControlInput(def, input, get);
  Object.assign(result, projected);
  if (entry.c === "Field" && get("field") !== undefined) {
    if (parsed.kind === "repeat") result.repeat = get("field");
    else result.value = String(get("field")).trim() ? String(get("field")) : undefined;
  }
  if (entry.c === "Composer" && get("field") !== undefined)
    result.value = String(get("field")).length ? String(get("field")) : undefined;
  const ids = hostWireItemIds(def, projected);
  Object.assign(result, projectControls(meta, result, get, "wire", ids));
  omitDerivedSelection(def, result);
  if (["Counter", "Scale"].includes(entry.c) && get("$value") !== undefined) result.value = get("$value");
  projectItems(entry, parsed, get, result, ids);
  Object.assign(result, projectAdjustments(meta, result, get, false, ids));
  if (clocks || meta.draw)
    Object.assign(result, projectClocks(meta, result, get, now, "legacy", undefined, ids));
  else if (get("$state") !== undefined) result.state = get("$state") as NonNullable<Entry["state"]>;
  if (clocks && hasPlaybackClock(meta)) {
    const state = projectClocks(meta, parseControlProps(def, input, get), get, now, "playback").state;
    if (state !== undefined) result.state = state as NonNullable<Entry["state"]>;
  }
  if (meta.draw) {
    const local = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key.replace(`${screen.id}/`, ""), value]),
    );
    const props = liveProps(meta, parseControlProps(def, input, get), entry.id, local, true);
    const state = drawStatus(meta, props, (props.state as Entry["state"]) ?? result.state ?? "filled", get);
    if (state !== result.state && (result.state !== undefined || state !== "filled")) result.state = state;
  }
  if (meta.session || meta.buzz) {
    const { id: _id, c: _c, state: _state, ...wire } = result;
    const props = parseControlProps(def, wire, get);
    const base = result.state ?? "filled";
    const state = buzzStatus(meta, props, sessionStatus(meta, props, base, get), get);
    if (result.state !== undefined || state !== "filled") result.state = state;
  }
  if (entry.c === "Player" && typeof get("scrubber") === "number")
    result.at = Math.floor(Number(get("scrubber")));
  if (entry.c === "Bubbles" && Array.isArray(get("$messages"))) result.messages = get("$messages");
  if (entry.c === "SwipeStack" && Number(get("$cursor") ?? 0) >= (entry.cards as unknown[]).length)
    result.state = "empty";
  return result;
}

function projectSequenceCursor(
  def: Definition | undefined,
  result: Entry,
  screen: ScreenLike,
  values: Values,
  now: number,
  deviceData?: DeviceData,
) {
  const cursor = def?.meta.sequence?.cursor;
  if (!def || !cursor || !Object.hasOwn(def.props.shape, cursor)) return;
  if (values[valueKey(screen.id, result.id, sequenceKey)] === undefined && result[cursor] === undefined)
    return;
  const { id, c: _c, state: _state, ...wire } = result;
  const local = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key.replace(`${screen.id}/`, ""), value]),
  );
  const get = (part: string) => local[`${id}/${part}`];
  const data = withRecordScreen(atDeviceTime(projectDeviceData(deviceData, values), now), screen);
  const index = liveProps(def.meta, parseControlProps(def, wire, get), id, local, true, data, now)[cursor];
  if (def.props.safeParse({ ...hostItemInput(def, wire).wire, [cursor]: index }).success)
    result[cursor] = index;
}
