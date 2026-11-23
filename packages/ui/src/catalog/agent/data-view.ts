import { z } from "zod";
import { screenId, text } from "../props";
import { peekLimit } from "../lang";
import { safeParseItemProps } from "../lines";
import type { Definition } from "../probes";
import type { StateName } from "../types";
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
type Option = { id?: string; view?: View | undefined; on?: boolean };
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

function panelCandidates(screen: ScreenLike, defs: Record<string, Definition>) {
  return screen.components.filter(({ c }) => {
    const meta = defs[c]?.meta;
    return meta && (meta.group === "content" || meta.group === "data") && meta.region === "body";
  });
}

function dataViewBindings(screen: ScreenLike, defs: Record<string, Definition>) {
  return screen.components.flatMap(({ id, c, state, ...raw }) => {
    const def = defs[c];
    const key = def?.meta.dataView;
    if (!def || !key || !Array.isArray(raw[key])) return [];
    if (!raw.filter && !(raw[key] as Option[]).some((option) => option?.view)) return [];
    const { parsed } = safeParseItemProps(def, raw);
    return parsed.success ? [{ id, state, key, meta: def.meta, props: parsed.data }] : [];
  });
}

export function checkDataViewTargets(screen: ScreenLike, defs: Record<string, Definition>) {
  const targets = new Map(panelCandidates(screen, defs).map(({ id, c }) => [id, c]));
  return dataViewBindings(screen, defs).flatMap(({ id, key, props }) => {
    const filter = props.filter as Filter | undefined;
    const issue = (part: string, message: string) => ({
      code: "S.data_view",
      address: `${screen.id}/${id}/${part}`,
      message,
    });
    if (filter)
      return targets.get(filter.list) === "List" ? [] : [issue("filter", "Filter must name a sibling List")];
    return (props[key] as Option[]).flatMap(({ id, view }) =>
      view?.panel && !targets.has(view.panel)
        ? [issue(`${id}/root`, "Option panel must name a sibling body content or data component")]
        : [],
    );
  });
}

/** Resolve presentation from the original screen and staged or committed selection values. */
export function resolveDataViews(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  local: Values = {},
): DataViews {
  const result: DataViews = { hidden: new Set(), empty: new Map(), lists: new Map() };
  const siblings = panelCandidates(screen, defs);
  for (const { id, state, meta, key, props } of dataViewBindings(screen, defs)) {
    if (state && state !== "filled") continue;
    const get = (part: string) => local[`${id}/${part}`];
    const selected = projectLegacySelection(meta, props, get);
    const options = selected[key] as Option[];
    const views = options.map(({ view }) => view!);
    const active = options.flatMap(({ view, on }, index) =>
      view && (key === "options" ? selected.at === index : on) ? [view] : [],
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
  state: StateName = "filled",
): { props: Values; empty?: string } {
  const filters = views.lists.get(id);
  if (!filters || !Array.isArray(props.rows)) return { props };
  if (state === "empty") {
    const selected = filters.find(({ active }) => active.length);
    return {
      props: { ...props, rows: [], more: undefined },
      ...(selected ? { empty: selected.empty } : {}),
    };
  }
  if (state !== "filled") return { props };
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
