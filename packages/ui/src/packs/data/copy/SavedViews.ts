import { z } from "zod";
import {
  emptyLine,
  numberLine,
  pluralForm,
  text,
  type DeviceData,
  type RecordRuntime,
} from "../../../catalog";
import { dataWordsFor } from "../lang";

export const savedViewLimit = 6;
export const savedViewId = text(24).meta({ kind: undefined });
const savedViewMatchKind = "saved_view_matches";
export { savedViewMatchKind };
const matchedRecord = z.object({ id: text(64), viewIds: z.array(savedViewId).max(savedViewLimit) });
type Layout = keyof ReturnType<typeof dataWordsFor>["savedViews"]["layouts"];
export type SavedViewRow = {
  id: string;
  viewId: string;
  label: string;
  summary?: string | undefined;
  layout?: Layout | undefined;
  active?: boolean;
};
type Display = {
  views: SavedViewRow[];
  style: "chips" | "list";
  detail?: string | undefined;
  canSave: boolean;
  removed?: boolean;
};

/** The host supplies dataset records and the presets they match, never precomputed counts. */
export function savedViewCounts(views: readonly SavedViewRow[], data?: DeviceData) {
  const records = data?.[savedViewMatchKind];
  if (!records) return;
  const matches = new Map(views.map(({ viewId }) => [viewId, new Set<string>()]));
  for (const row of records) {
    const parsed = matchedRecord.safeParse(row);
    if (parsed.success) for (const viewId of parsed.data.viewIds) matches.get(viewId)?.add(parsed.data.id);
  }
  return new Map([...matches].map(([id, records]) => [id, records.size]));
}

export function savedViewCopy(row: SavedViewRow, count: number | undefined, lang?: string) {
  const words = dataWordsFor(lang).savedViews;
  return {
    chip: count === undefined ? row.label : words.chip(row.label, numberLine(count, lang)),
    count: count === undefined ? undefined : words.matches(numberLine(count, lang), pluralForm(count, lang)),
    layout: row.layout && words.layouts[row.layout],
  };
}

export function savedViewsReading(input: Display, success: boolean, data?: DeviceData, lang?: string) {
  const { views, canSave, detail, style, removed } = input;
  const words = dataWordsFor(lang).savedViews;
  const counts = savedViewCounts(views, data);
  const lines = [words.title];
  if (removed || success) lines.push(removed ? words.removed : words.success);
  for (const row of views) {
    const copy = savedViewCopy(row, counts?.get(row.viewId), lang);
    if (style === "chips") lines.push(copy.chip);
    else {
      if (detail !== "brief") for (const label of [row.summary, copy.layout]) if (label) lines.push(label);
      if (copy.count) lines.push(copy.count);
      lines.push(words.remove(row.label));
    }
  }
  if (!views.length) lines.push(emptyLine(undefined, lang));
  if (canSave) lines.push(words.save);
  return lines;
}

export const savedViewsRuntime = {
  presses: {
    remove: {
      target: (row) => String(row.viewId),
      plan: (_context, row) => ({ operation: String(row.viewId) }),
    },
  },
  project: ({ props, journal }) => {
    const removed = new Set(journal);
    const views = (props.views as SavedViewRow[]).filter(({ viewId }) => !removed.has(viewId));
    return {
      views,
      removed: views.length < (props.views as SavedViewRow[]).length,
      canSave: Boolean(props.canSave) && views.length < savedViewLimit,
    };
  },
} satisfies Omit<RecordRuntime, "kind">;

export function previewSavedViewMatches(views: readonly { id: string }[]): DeviceData {
  return {
    [savedViewMatchKind]: Array.from({ length: 24 }, (_, index) => ({
      id: `sample_${index + 1}`,
      viewIds: views
        .slice(0, Math.max(1, views.length - (index % Math.max(1, views.length))))
        .map(({ id }) => id),
    })),
  };
}
