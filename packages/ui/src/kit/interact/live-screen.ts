import { projectSelection, type Definition, type ScreenLike, type Values } from "../../catalog";
export type TimerState = { running: boolean; from: number; seconds: number };
export const valueKey = (screen: string, id: string, part: string) => `${screen}/${id}/${part}`;
export function timerSeconds(
  input: Values,
  timer: TimerState | undefined,
  held: unknown,
  now: number,
): number {
  const initial = Number(held ?? input.seconds ?? 0);
  if (!timer?.running) return initial;
  const elapsed = Math.max(0, Math.floor((now - timer.from) / 1000));
  return Math.min(86400, Math.max(0, timer.seconds + (input.style === "up" ? elapsed : -elapsed)));
}
/** Project only schema-owned props; raw drafts, expansion and swipe cursors remain in the store. */
export function projectScreen(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
  now: number,
  openSheet?: string,
  includeSheet = false,
): ScreenLike {
  return {
    ...screen,
    components: screen.components
      .filter(
        (entry) =>
          !values[valueKey(screen.id, entry.id, "$dismissed")] &&
          (entry.c !== "Sheet" || includeSheet || entry.id === openSheet),
      )
      .map((entry) => projectEntry(entry, screen, defs, values, now)),
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
): Entry {
  const get = (part: string) => values[valueKey(screen.id, entry.id, part)];
  const result = { ...entry };
  const { id: _id, c: _c, state: _state, ...input } = entry;
  const parsed = defs[entry.c]?.props.parse(input) as Values | undefined;
  if (!parsed) return result;
  if (entry.c === "Field" && get("field") !== undefined) {
    if (parsed.kind === "repeat") result.repeat = get("field");
    else result.value = String(get("field")).trim() ? String(get("field")) : undefined;
  }
  if (entry.c === "Composer" && get("field") !== undefined)
    result.value = String(get("field")).length ? String(get("field")) : undefined;
  Object.assign(result, projectSelection(defs[entry.c]!.meta, result, get));
  if (["Counter", "Scale"].includes(entry.c) && get("$value") !== undefined) result.value = get("$value");
  projectItems(entry, parsed, get, result);
  if (entry.c === "Timer" && parsed.style !== "until")
    result.seconds = timerSeconds(parsed, get("$timer") as TimerState | undefined, get("$seconds"), now);
  if (entry.c === "Player" && typeof get("scrubber") === "number")
    result.at = Math.floor(Number(get("scrubber")));
  if (entry.c === "Bubbles" && Array.isArray(get("$messages"))) result.messages = get("$messages");
  if (entry.c === "SwipeStack" && Number(get("$cursor") ?? 0) >= (entry.cards as unknown[]).length)
    result.state = "empty";
  return result;
}
