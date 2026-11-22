import { z } from "zod";
import {
  defineLocalState,
  numberLine,
  pluralForm,
  text,
  type DeviceData,
  type StateName,
  type Values,
} from "../../../catalog";
import { paperworkWordsFor } from "../lang";
import { attachment } from "../seeds";

export const scanLimit = 24;
export const scanPage = z.strictObject({
  file: attachment,
  label: text(16).meta({ read: false }).optional(),
});
const draftPage = scanPage.extend({ id: z.string().regex(/^r[1-9]\d?$/) });
const draft = z.strictObject({
  pages: z.array(draftPage).max(scanLimit),
  active: z.string().nullable(),
});
type Page = z.output<typeof draftPage>;
type Draft = z.output<typeof draft>;

export const scanDraft = defineLocalState({
  schema: draft,
  itemEvents: ["root.move", "remove.press", "preview.press"],
  initial: ({ pages }) => ({ pages: pages as Page[], active: null }),
  project: (state) => state,
  reduce: (state, { item, part, value }) => {
    const pages = [...state.pages];
    const from = pages.findIndex(({ id }) => id === item);
    if (from < 0) return { error: "Page is no longer in the batch" };
    if (part === "preview") return { state: { ...state, active: pages[from]!.id } };
    if (part === "remove") {
      const [removed] = pages.splice(from, 1);
      const active =
        state.active === removed!.id ? (pages[from]?.id ?? pages.at(-1)?.id ?? null) : state.active;
      return { state: { pages, active } };
    }
    const to = pages.findIndex(({ id }) => id === value);
    if (to < 0 || to === from) return { error: "Choose another page slot in this batch" };
    pages.splice(to, 0, pages.splice(from, 1)[0]!);
    return { state: { pages, active: state.active ?? state.pages[0]?.id ?? null } };
  },
});

export function scanBatchGates(input: Readonly<Values>) {
  const { pages, active } = input as unknown as Draft;
  const selected = active ?? pages[0]?.id;
  const linked = typeof input.captureGoto === "string";
  return {
    canAdd: pages.length < scanLimit,
    linked,
    add: linked ? { goto: input.captureGoto } : {},
    canSave: pages.length > 0,
    canMove: pages.length > 1,
    pages: pages.map((page) => ({ ...page, managing: input.style !== "review" || page.id === selected })),
  };
}

export function scanBatchRequest(input: Readonly<Values>) {
  const { pages } = input as unknown as Draft;
  return {
    // Separate arrays keep both fields within the command bridge's string bound after JSON escaping.
    files: JSON.stringify(pages.map(({ file }) => file)),
    labels: JSON.stringify(pages.map(({ label }) => label ?? null)),
    title: typeof input.title === "string" ? input.title : null,
  };
}

export function scanCount(count: number, lang?: string) {
  return paperworkWordsFor(lang).scanBatch.count(numberLine(count, lang), pluralForm(count, lang));
}

export function scanPageLabel(index: number, lang?: string) {
  return paperworkWordsFor(lang).scanBatch.page(numberLine(index + 1, lang));
}

export function scanFailure(data: DeviceData, instance: string) {
  return data.scanPermissionFailures?.includes(instance) === true;
}

export function scanBatchReading(input: unknown, state: StateName, lang?: string) {
  const { pages, active, style, detail, title } = input as Draft & {
    style: string;
    detail?: string;
    title?: string;
  };
  const words = paperworkWordsFor(lang).scanBatch;
  if (state === "success") return [words.saved];
  if (state === "empty" || (state === "filled" && !pages.length)) return [words.empty, words.add];
  if (state === "error") return [pages.length ? words.saveFailed : words.scanFailed];
  if (state !== "filled") return [];
  return [
    ...(title ? [] : [words.title]),
    scanCount(pages.length, lang),
    ...(style === "review" && pages.length
      ? [
          words.review(
            scanPageLabel(
              Math.max(
                pages.findIndex(({ id }) => id === active),
                0,
              ),
              lang,
            ),
          ),
        ]
      : []),
    ...pages.map(({ id, label }, index) =>
      words.slot(
        id,
        scanPageLabel(index, lang),
        label && detail !== "brief" ? words.pageLabel(label, words.privateFile) : words.privateFile,
      ),
    ),
    ...(pages.length < scanLimit ? [words.add] : []),
    words.save,
  ];
}
