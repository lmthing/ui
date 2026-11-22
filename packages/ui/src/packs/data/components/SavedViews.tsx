import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import {
  previewSavedViewMatches,
  savedViewCopy,
  savedViewCounts,
  savedViewId,
  savedViewLimit,
  savedViewMatchKind,
  savedViewsReading,
  savedViewsRuntime,
  type SavedViewRow,
} from "../copy";
import { dataWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-SavedViews.generated";

// Core first: FilterBar/default changes individual filters but cannot save, switch, or remove named query and layout presets.
// prettier-ignore
export const meta = {
  id: "SavedViews",
  status: "ready",
  group: "input",
  tier: "phone",
  pick: prompt.pick,
  purpose: prompt.purpose,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  realPath: "The app applies selected presets to the local query and saves the current query on request.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["summary", "layout"] } },
  parts: ["root", "title", "track", "save", "save_label", "status"],
  items: { key: "views", parts: ["root", "label", "summary", "layout", "count", "remove"] },
  actions: {
    parts: { save: ["press"] }, items: { root: ["select"], remove: ["press"] },
    when: { save: { canSave: true }, remove: { style: "list" } },
  },
  select: { prop: "active", value: { field: "viewIndex" }, mode: "flags", runtime: true },
  confirmParts: ["remove"],
  states: ["filled", "empty", "loading", "success"],
  emptyActions: ["save.press"],
  successActions: ["root.select", "save.press", "remove.press"],
  readSuccess: true,
  deviceData: [savedViewMatchKind],
  previewDeviceData: ({ input }): c.DeviceData => previewSavedViewMatches(input.views as SavedViewRow[]),
  recordRuntime: { kind: "saved_query_views", ...savedViewsRuntime },
  read: (input, state, lang, data): string[] => {
    if (state === "loading") return [];
    const live = input as Parameters<typeof savedViewsReading>[0];
    const words = dataWordsFor(lang).savedViews;
    return state === "empty" ? (live.canSave ? [words.save] : [])
      : savedViewsReading(live, state === "success", data, lang);
  },
} as const satisfies c.Meta;

// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  views: z
    .array(
      z.strictObject({
        id: savedViewId,
        label: c.text(20),
        summary: c.text(36).optional().meta({ read: false }),
        layout: z.enum(["table", "cards", "board"]).optional(),
      }),
    )
    .min(1)
    .max(savedViewLimit),
  activeId: savedViewId.optional().meta({ read: false }),
  canSave: z.boolean().default(true),
  style: z.enum(["chips", "list"]).default("chips"),
}).refine(({ views }) => new Set(views.map(({ id }) => id)).size === views.length, { path: ["views"] })
  .refine(({ views, activeId }) => activeId === undefined || views.some(({ id }) => id === activeId),
    { path: ["activeId"] })
  .overwrite((input) => ({
    ...input, views: input.views.map((row, viewIndex) => ({ ...row, viewIndex, viewId: row.id, active: row.id === input.activeId })),
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const names = c.itemsOf(cast, 3, thing?.type).flatMap((item) => c.titleOf(item, 20, thing) ?? []);
  const labels = names.length ? names : [c.clip(c.placeholderTitle(0, lang), 20)];
  return { views: labels.map((label, index) => ({ id: `view_${index + 1}`, label })) };
}

// prettier-ignore
export const examples = [
  { style: "list", activeId: "needs_water", views: [
    { id: "all_plants", label: "All plants", summary: "Sorted by name", layout: "table" },
    { id: "needs_water", label: "Needs water", summary: "Due today, soonest first", layout: "cards" },
    { id: "balcony", label: "Balcony", summary: "Only plants on the balcony", layout: "board" },
  ] },
  { activeId: "this_week", views: [
    { id: "all_walks", label: "All walks" },
    { id: "this_week", label: "This week" },
    { id: "unassigned", label: "Unassigned walks" },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("SavedViews");
// prettier-ignore
export const probes = [
  choose("Let me save a combination of filters, sort order and layout as a named preset, switch to it later, and remove old presets."),
  choose("Add a search above the records with separate Region and Status filter dropdowns and a button to clear both. No named presets or saving.", "FilterBar"),
  write("Show named saved presets All walks (all_walks) and This week (this_week); This week is active. Let me save the current view."),
  {
    ...write("List saved presets All plants (all_plants), sorted by name, table layout, and Needs water (needs_water), due today, cards layout. Keep the summaries and layouts in data but hide them on screen."),
    variant: { axis: "detail", value: "brief" },
  },
  read("Switch to the Needs water preset.", { address: "s1/r2", action: "select" }),
  read("Save my current filter and sort settings as a view.", { address: "s1/save", action: "press" }),
  read("Start removing the Balcony preset, without deleting any plants.", { address: "s1/r3/remove", action: "press" }),
] satisfies c.Probe[];

type ViewProps = c.Props<typeof props, typeof meta>;
type LiveView = Omit<ViewProps, "views"> & { views: SavedViewRow[]; removed?: boolean };
type ViewCopy = ReturnType<typeof savedViewCopy>;

// prettier-ignore
function PresetRow({ row, copy, selected, loading, full, density }: {
  row: SavedViewRow; copy: ViewCopy; selected: boolean; full: boolean; loading: boolean; density: c.ThemeDensity;
}) {
  const scope = kit.usePartContext();
  const { words } = kit.useWords(dataWordsFor);
  const details = full ? [{ text: row.summary, part: "summary" }, { text: copy.layout, part: "layout" }] : [];
  return <kit.PartScope {...scope} item={row.id}>
    <kit.KitGrid fitLast density={density}>
      <kit.KitRow part="root" role={loading ? "group" : "button"} label={row.label}
        selected={selected && !loading} density={density}
        trailing={<kit.KitLayoutText line={{ text: copy.count, part: "count", role: "figure", compact: true, tabular: true }}
          align="end" density={density} />}>
        <kit.KitMetaLine title={{ text: row.label, part: "label" }} density={density} />
      </kit.KitRow>
      <kit.KitAction part="remove" icon="close" a11y={words.savedViews.remove(row.label)} kind="quiet" contentParts={{}} />
    </kit.KitGrid>
    {details.some(({ text }) => text) && <kit.KitContent inset="md" density={density}>
      <kit.KitMetaLine title={{ ...details[0], role: "meta", tone: "muted" }}
        meta={details.slice(1)} density={density} />
    </kit.KitContent>}
  </kit.PartScope>;
}

// prettier-ignore
export function SavedViews(input: ViewProps) {
  const scope = kit.usePartContext(), state = kit.useComponentState();
  const density = kit.useKit().density;
  const full = kit.useVariant("detail", meta.variants.detail, input.detail) === "full";
  const { words: { savedViews: words }, lang } = kit.useWords(dataWordsFor);
  const { views, canSave, removed } = kit.useLiveControls(meta, input) as LiveView;
  const counts = savedViewCounts(views, kit.useDeviceData());
  const loading = state === "loading";
  const empty = state === "empty" || !views.length;
  const status = removed && state === "filled" ? "success" : state;
  const body = input.style === "list" ? <kit.KitRowGroup density={density} spacing="groups" separators={false}>
    {views.map((row) => <PresetRow key={row.id} {...{ row, loading, full, density }}
      copy={savedViewCopy(row, counts?.get(row.viewId), lang)} selected={row.active === true} />)}
  </kit.KitRowGroup> : <kit.KitContent inset="md" density={density}>
    <kit.KitTrack part="track" role="radiogroup" label={words.title}>
      {views.map((row) => <kit.KitChip key={row.id} item={row.id} role="radio" disabled={false}
        label={savedViewCopy(row, counts?.get(row.viewId), lang).chip} on={row.active === true} />)}
    </kit.KitTrack>
  </kit.KitContent>;
  const feedback = status === "success";
  return <kit.KitCard padded align={empty ? "center" : "start"} density={density} surface="card">
    {!empty && <kit.KitContent inset="md" density={density}>
      <kit.KitHeader title={{ text: words.title, part: "title" }}
        {...(feedback && { meta: { text: removed ? words.removed : words.success, part: "status", tone: "good" } })}
        density={density} />
    </kit.KitContent>}
    <kit.PartScope {...scope} state={feedback && !empty ? "filled" : status}>
      <kit.KitState part={empty ? "status" : null}
        message={feedback ? (removed ? words.removed : words.success) : undefined}
        loading={body} density={density}>
        {body}
      </kit.KitState>
    </kit.PartScope>
    {canSave && views.length < savedViewLimit && <kit.KitActionFooter align="start" density={density}>
      <kit.KitAction part="save" label={words.save} icon="plus" kind="secondary" contentParts={{ label: "save_label" }} />
    </kit.KitActionFooter>}
  </kit.KitCard>;
}
