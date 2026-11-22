import { z } from "zod";
import {
  defineLocalState,
  isoDate,
  numberLine,
  text,
  type DeviceData,
  type StateName,
  type Values,
} from "../../../catalog";
import { paperworkWordsFor } from "../lang";
import { attachment } from "../seeds";

export const formLimit = 16;
const valueLimit = 80;
export const formField = z.strictObject({
  label: text(28),
  kind: z.enum(["text", "date", "number", "check"]),
  value: z
    .union([text(valueLimit), z.boolean()])
    .meta({ read: false })
    .optional(),
  required: z.boolean().default(false),
});

const draftField = formField.extend({
  id: z.string().regex(/^r[1-9]\d?$/),
  required: z.boolean(),
  value: z.union([z.string().max(valueLimit), z.boolean()]).optional(),
});
const draft = z.strictObject({ document: attachment, fields: z.array(draftField).min(1).max(formLimit) });
type Draft = z.output<typeof draft>;
type Field = z.output<typeof draftField>;

function usableNumber(value: string) {
  return /^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value) && Number.isFinite(Number(value));
}

export function fieldStatus({ kind, value }: Pick<Field, "kind" | "value">): "missing" | "invalid" | "done" {
  if (value === undefined) return "missing";
  if (kind === "check") return typeof value !== "boolean" ? "invalid" : value ? "done" : "missing";
  if (typeof value !== "string") return "invalid";
  const trimmed = value.trim();
  if (!trimmed) return "missing";
  if (kind === "date" && !isoDate.safeParse(trimmed).success) return "invalid";
  if (kind === "number" && !usableNumber(trimmed)) return "invalid";
  return "done";
}

export const formDraft = defineLocalState({
  schema: draft,
  events: ["clear.press"],
  itemEvents: ["field.type", "check.check"],
  initial: ({ document, fields }) => ({ document: String(document), fields: fields as Field[] }),
  project: ({ fields }) => ({ fields }),
  reduce: (state, { part, item, value }) => {
    if (part === "clear")
      return { state: { ...state, fields: state.fields.map((field) => ({ ...field, value: undefined })) } };
    const field = state.fields.find(({ id }) => id === item);
    if (!field) return { error: "Field is no longer in this form" };
    if (part === "check" && field.kind === "check")
      value = typeof value === "boolean" ? value : field.value !== true;
    else if (
      part !== "field" ||
      field.kind === "check" ||
      typeof value !== "string" ||
      value.length > valueLimit
    )
      return { error: "Use text within the field limit" };
    const next = value as string | boolean;
    return {
      state: {
        ...state,
        fields: state.fields.map((row) => (row === field ? { ...field, value: next } : row)),
      },
    };
  },
});

type ProjectedField = Field & {
  shown: boolean;
  status: ReturnType<typeof fieldStatus>;
  checkbox: boolean;
  checked: boolean;
};
type Progress = { done: number; total: number; ratio: number };

export function formProgress(fields: ProjectedField[]): Progress {
  const visible = fields.filter(({ shown }) => shown);
  const done = visible.filter(({ status }) => status === "done").length;
  return { done, total: visible.length, ratio: visible.length ? done / visible.length : 0 };
}

export function formGates(input: Readonly<Values>) {
  const fields = (input.fields as Field[]).map<ProjectedField>((field) => ({
    // The generic check reader uses the first boolean for check state.
    checked: field.kind === "check" && field.value === true,
    ...field,
    checkbox: field.kind === "check",
    shown: input.detail !== "brief" || field.required,
    status: fieldStatus(field),
  }));
  const invalid = fields.some(({ status, shown }) => shown && status === "invalid");
  return {
    fields,
    invalid,
    canSave: !invalid && fields.every(({ status, required }) => !required || status === "done"),
    canClear: fields.some(({ value }) => value !== undefined && value !== ""),
  };
}

type LiveForm = ReturnType<typeof formGates>;

export function formCopyRequest(input: Readonly<Values>) {
  const { fields, canSave } = input as unknown as LiveForm;
  if (!canSave || typeof input.document !== "string") return;
  // Four fields per scalar keep even fully JSON-escaped values within the host bridge's 4096-character limit.
  const batchSize = 4;
  const data = fields.map(({ label, kind, value, status }) => [
    label,
    kind,
    typeof value === "boolean" ? value : status === "done" ? String(value).trim() : null,
  ]);
  const batches = Object.fromEntries(
    Array.from({ length: Math.ceil(data.length / batchSize) }, (_, index) => [
      `fields${index + 1}`,
      JSON.stringify(data.slice(index * batchSize, (index + 1) * batchSize)),
    ]),
  );
  return { document: input.document, ...batches };
}

export function formCount({ done, total }: Progress, lang?: string) {
  return paperworkWordsFor(lang).formFiller.count(numberLine(done, lang), numberLine(total, lang));
}

export function formReading(input: unknown, state: StateName, lang?: string) {
  const words = paperworkWordsFor(lang).formFiller;
  if (state === "empty") return [words.empty];
  if (state === "success") return [words.saved];
  if (state === "error") return [words.failed];
  if (state !== "filled") return [];
  const { fields, canSave, invalid } = input as LiveForm;
  const visible = fields.filter(({ shown }) => shown);
  return [
    words.privateFile,
    words.progress,
    formCount(formProgress(fields), lang),
    words.preview,
    ...(visible.length ? [] : [words.noneRequired]),
    ...visible.flatMap(({ label, required, status, value }) => [
      words.reading(
        required ? words.requiredLabel(label) : label,
        words[status === "done" ? "complete" : "incomplete"],
      ),
      ...(typeof value === "string" && value.trim() ? [JSON.stringify(value)] : []),
    ]),
    words.save,
    words.clear,
    ...(!canSave ? [invalid ? words.invalid : words.blocked] : []),
  ];
}

export function formFailure(data: DeviceData, instance: string) {
  return data.formPreviewFailures?.includes(instance) === true;
}
