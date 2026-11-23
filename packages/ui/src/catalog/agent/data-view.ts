import { z } from "zod";
import { screenId, text } from "../props";
import { peekLimit } from "../lang";
import { safeParseItemProps } from "../lines";
import type { Definition } from "../probes";
import type { ScreenLike } from "./read";
import type { Values } from "./act";
import { projectLegacySelection } from "./selection";

export const dataViewFilter = z.strictObject({
  list: screenId,
  field: z.enum(["category", "badge"]),
});
export const dataViewOption = z
  .strictObject({
    panel: screenId.optional(),
    match: text(24).optional(),
    empty: text(64),
  })
  .meta({ read: false });

type View = z.output<typeof dataViewOption>;
type Filter = z.output<typeof dataViewFilter>;
type Option = { view?: View | undefined; on?: boolean };
type Entry = ScreenLike["components"][number];
type ListView = { filter: Filter; active: View[]; empty: string };
type DataViews = { hidden: Set<string>; empty: Map<string, string>; lists: Map<string, ListView[]> };

/** Legacy unbound lines still parse. Bound controls always name a view for every option. */
export function validDataView(options: readonly Option[], filter?: Filter, multi = false) {
  if (!filter && options.every(({ view }) => !view)) return true;
  return options.every(
    ({ view }) =>
      view && (filter ? !view.panel && (!multi || view.match !== undefined) : view.match === undefined),
  );
}

function bindPanels(
  result: DataViews,
  siblings: readonly Entry[],
  id: string,
  options: View[],
  active: View[],
) {
  const panels = new Set(options.map(({ panel }) => panel));
  const targets = siblings.filter((entry) => panels.has(entry.id));
  const shown = new Set(active.map(({ panel }) => panel));
  if (!active.length) return;
  for (const target of targets) if (!shown.has(target.id)) result.hidden.add(target.id);
  if (!targets.some((target) => shown.has(target.id) && target.state !== "empty"))
    result.empty.set(id, active[0]!.empty);
  for (const target of targets) if (target.state === "empty") result.hidden.add(target.id);
}

/** Resolve presentation from the original screen and staged or committed selection values. */
export function resolveDataViews(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  local: Values = {},
): DataViews {
  const result: DataViews = { hidden: new Set(), empty: new Map(), lists: new Map() };
  const siblings = screen.components.filter(({ c }) => {
    const meta = defs[c]?.meta;
    return meta && (meta.group === "content" || meta.group === "data") && meta.region === "body";
  });
  for (const { id, c, state, ...raw } of screen.components) {
    const def = defs[c];
    const binding = def?.meta.dataView;
    if (!binding || (state && state !== "filled") || !Array.isArray(raw[binding])) continue;
    if (!raw.filter && !(raw[binding] as Option[]).some((option) => option?.view)) continue;
    const { parsed } = safeParseItemProps(def, raw);
    if (!parsed.success) continue;
    const get = (part: string) => local[`${id}/${part}`];
    const selected = projectLegacySelection(def.meta, parsed.data, get);
    const options = selected[binding] as Option[];
    const views = options.map(({ view }) => view!);
    const active = options.flatMap(({ view, on }, index) =>
      view && (binding === "options" ? selected.at === index : on) ? [view] : [],
    );
    const filter = selected.filter as Filter | undefined;
    if (!filter) bindPanels(result, siblings, id, views, active);
    else {
      const empty = (active[0] ?? views[0])!.empty;
      if (siblings.some((entry) => entry.id === filter.list && entry.c === "List")) {
        const list = result.lists.get(filter.list) ?? [];
        result.lists.set(filter.list, [...list, { filter, active, empty }]);
      } else result.empty.set(id, empty);
    }
  }
  return result;
}

/** Filter only after parsing and stamping; never change the wire rows or renumber addresses. */
export function projectDataViewList(
  views: DataViews,
  id: string,
  props: Values,
): { props: Values; empty?: string } {
  const filters = views.lists.get(id);
  if (!filters || !Array.isArray(props.rows)) return { props };
  let rows = props.rows as Values[];
  let empty: string | undefined;
  for (const { active, filter, empty: message } of filters) {
    if (!active.length || active.some(({ match }) => match === undefined)) continue;
    rows = rows.filter((row) => active.some(({ match }) => row[filter.field] === match));
    if (!rows.length) {
      empty = message;
      break;
    }
  }
  return {
    props: { ...props, rows, more: rows.length > peekLimit ? props.more : undefined },
    ...(empty ? { empty } : {}),
  };
}
