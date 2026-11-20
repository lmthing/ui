import {
  projectControls,
  projectControlInput,
  projectClocks,
  projectAdjustments,
  liveProps,
  parseControlProps,
  drawStatus,
  sessionStatus,
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
): ScreenLike {
  return {
    ...screen,
    components: screen.components
      .filter(
        (entry) =>
          !values[valueKey(screen.id, entry.id, "$dismissed")] &&
          (entry.c !== "Sheet" || includeSheet || entry.id === openSheet),
      )
      .map((entry) => projectEntry(entry, screen, defs, values, now, clocks)),
  };
}

type Entry = ScreenLike["components"][number];
function projectItems(entry: Entry, parsed: Values, get: (part: string) => unknown, result: Entry) {
  const raw = (key: string) => entry[key] as Record<string, unknown>[];
  if (entry.c === "Choice" && parsed.multi)
    result.options = raw("options").map((row, index) => ({
      ...row,
      on: get(`r${index + 1}`) ?? row.on ?? false,
    }));
  if (entry.c === "List")
    result.rows = raw("rows").map((row, index) => {
      const on = get(`r${index + 1}/trail`);
      return row.trail === "toggle" && typeof on === "boolean" ? { ...row, value: on ? "on" : "off" } : row;
    });
  if (entry.c === "Checklist")
    result.items = raw("items").map((row, index) => ({
      ...row,
      done: get(`r${index + 1}/check`) ?? row.done ?? false,
    }));
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
  const parsed = def.props.parse(input) as Values;
  if (meta.draw)
    for (const key of Object.keys(def.props.shape))
      if (result[key] === undefined && parsed[key] !== undefined) result[key] = parsed[key];
  Object.assign(result, projectControlInput(def, input, get));
  if (entry.c === "Field" && get("field") !== undefined) {
    if (parsed.kind === "repeat") result.repeat = get("field");
    else result.value = String(get("field")).trim() ? String(get("field")) : undefined;
  }
  if (entry.c === "Composer" && get("field") !== undefined)
    result.value = String(get("field")).length ? String(get("field")) : undefined;
  Object.assign(result, projectControls(meta, result, get));
  const parentSelection = meta.items?.nested?.activeParent && meta.select?.prop;
  if (parentSelection && !Object.hasOwn(def.props.shape, parentSelection)) delete result[parentSelection];
  if (["Counter", "Scale"].includes(entry.c) && get("$value") !== undefined) result.value = get("$value");
  projectItems(entry, parsed, get, result);
  Object.assign(result, projectAdjustments(meta, result, get));
  if (clocks || meta.draw) Object.assign(result, projectClocks(meta, result, get, now));
  else if (get("$state") !== undefined) result.state = get("$state") as NonNullable<Entry["state"]>;
  if (meta.draw) {
    const local = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key.replace(`${screen.id}/`, ""), value]),
    );
    const props = liveProps(meta, parseControlProps(def, input, get), entry.id, local, true);
    const state = drawStatus(meta, props, (props.state as Entry["state"]) ?? result.state ?? "filled", get);
    if (state !== result.state && (result.state !== undefined || state !== "filled")) result.state = state;
  }
  if (meta.session) {
    const { id: _id, c: _c, state: _state, ...wire } = result;
    const state = sessionStatus(meta, parseControlProps(def, wire, get), result.state ?? "filled", get);
    if (result.state !== undefined || state !== "filled") result.state = state;
  }
  if (entry.c === "Player" && typeof get("scrubber") === "number")
    result.at = Math.floor(Number(get("scrubber")));
  if (entry.c === "Bubbles" && Array.isArray(get("$messages"))) result.messages = get("$messages");
  if (entry.c === "SwipeStack" && Number(get("$cursor") ?? 0) >= (entry.cards as unknown[]).length)
    result.state = "empty";
  return result;
}
