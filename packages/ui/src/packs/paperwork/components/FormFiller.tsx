import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
// prettier-ignore
import { fieldStatus, formCopyRequest, formCount, formDraft, formFailure, formField, formGates, formLimit, formProgress, formReading } from "../copy";
import { paperworkWordsFor } from "../lang";
import { attachment, seedFile, seedRows } from "../seeds";

// Core first: Field/text edits one generic value, not a document-bound set of named fields and a local copy.
export const meta = {
  id: "FormFiller",
  status: "ready",
  group: "input",
  purpose: "Complete a personal form and keep a local copy of the filled document.",
  pick: "Fill named fields tied to a personal PDF or administrative template, check completeness and save a separate local copy. Not standalone input (Field), drawing a signature (Signature), or a client agreement (Agreement).",
  writeHints: [
    'Use the supplied local:<id> or synthetic lib:<id> template reference. List every named field with kind text, date, number or check. Check values are booleans; number values are decimal strings (for example "12"); date values are real YYYY-MM-DD strings.',
    'Write null for unspecified values. For a required-only view, use "detail":"brief" and retain all required and optional field definitions; this does not request density "compact". Leave other axes null unless requested.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "The device previews the original and saves a separate local copy with the entered values.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["root", "label", "hint", "field", "check"] } },
  parts: ["root", "title", "label", "amount", "preview", "save", "clear", "status"],
  items: { key: "fields", parts: ["root", "label", "hint", "field", "check"], visibleWhen: { shown: true } },
  actions: {
    parts: { preview: ["press"], save: ["press"], clear: ["press"] },
    items: { field: ["type"], check: ["check"] },
    when: {
      field: { checkbox: false },
      check: { checkbox: true },
      save: { canSave: true },
      clear: { canClear: true },
    },
  },
  confirmParts: ["clear"],
  states: ["empty", "filled", "loading", "success", "error"],
  readSuccess: true,
  read: formReading,
  deviceData: ["formPreviewFailures"],
  previewDeviceData: ({ input, state }): c.DeviceData => ({
    formPreviewFailures: state === "error" && input.document === examples[1]?.document ? ["c1"] : [],
  }),
  localState: formDraft,
  live: { derive: formGates },
  hostCommands: {
    identity: ({ props }) => String(props.document),
    parts: {
      "preview.press": {
        kind: "command",
        name: "formFillerPreview",
        input: ({ props }) => ({ document: String(props.document) }),
      },
      "save.press": {
        kind: "command",
        name: "formFillerSaveCopy",
        input: ({ props }) => formCopyRequest(props),
      },
    },
  },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    title: c.text(32),
    document: attachment,
    fields: z.array(formField).min(1).max(formLimit),
  })
  .refine(({ fields }) => fields.every((field) => fieldStatus(field) !== "invalid"), {
    path: ["fields"],
    message: "Field values must match their declared kind",
  });

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const { title, detail } = seedRows(input, 32, 28)[0]!;
  return { title, document: seedFile, fields: [{ label: detail, kind: "text" }] };
}

export const examples = [
  {
    title: "Allotment access form",
    document: "lib:ledge_access",
    fields: [
      { label: "Applicant name", kind: "text", required: true, value: "Mina Shaw" },
      { label: "Access start date", kind: "date", required: true },
      { label: "Plot number", kind: "number", value: "12" },
      { label: "I accept the access rules", kind: "check", required: true, value: false },
    ],
  },
  {
    title: "Trot office access form",
    document: "lib:trot_access",
    fields: [
      { label: "Applicant name", kind: "text", required: true, value: "Alex Reed" },
      { label: "Access start date", kind: "date", required: true, value: "2026-11-24" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("FormFiller");
export const probes = [
  choose(
    "Fill out my local allotment permit PDF using its named fields and save a separate filled copy without changing the template.",
  ),
  choose(
    "Put one standalone text box labelled Applicant name on this screen. No PDF, other fields, progress or export.",
    "Field",
  ),
  write(
    "Create Allotment access form with the supplied template lib:ledge_access. Required fields: Applicant name (text) and Access start date (date). Optional Plot number (number) starts at 12. Add a required unchecked box I accept the access rules.",
  ),
  {
    ...write(
      "Fill the Allotment access form from lib:ledge_access. Keep Applicant name (required text) and Plot number (optional number) in the data. Show only required fields without changing spacing or card finish.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Tick I accept the access rules. Leave the other inputs untouched.", {
    address: "f1/r4/check",
    action: "check",
  }),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;
type Form = Omit<View, "fields"> & ReturnType<typeof formGates>;
type Row = Form["fields"][number];
type Density = c.ThemeDensity;

// prettier-ignore
function FormField({ row, density }: { row: Row; density: Density }) {
  const { words: { formFiller: words } } = kit.useWords(paperworkWordsFor);
  const state = kit.useComponentState(), loading = state === "loading", inactive = state === "error";
  const label = row.required ? words.requiredLabel(row.label) : row.label;
  const error = row.status === "invalid" ? row.kind === "date" ? words.invalidDate : words.invalidNumber : undefined;
  const line = <kit.KitLayoutText {...{ density }} line={{ part: "label", text: label, role: "meta", strong: true }} />;
  if (inactive) {
    const value = row.checkbox ? (row.checked ? words.checked : words.unchecked) :
      (typeof row.value === "string" && row.value.trim()) || words.notEntered;
    return <kit.KitRow item={row.id} part={null} inset="none" inline fitContent label={label} {...{ density }}>
      <kit.KitContent {...{ density }}>{line}
        <kit.KitLayoutText {...{ density }} line={{ text: value, role: "body", tone: "muted" }} />
      </kit.KitContent></kit.KitRow>;
  }
  if (row.checkbox) return <kit.KitRow item={row.id} inset="none" inline label={label} {...{ density }}>
    <kit.KitGrid fitLast {...{ density }}>{line}
      {loading ? <kit.KitSkeleton shape="control" kind="quiet" /> :
        <kit.KitCheck part="check" done={row.checked} {...{ label }} />}
    </kit.KitGrid></kit.KitRow>;
  return <kit.KitRow item={row.id} inset="none" inline label={label} {...{ density }}>
    <kit.KitContent {...{ density }}>
      {line}
      <kit.KitInput part="field" kind={row.kind === "number" ? "number" : "text"} {...{ label }}
        hint={row.kind === "date" ? words.date : row.kind === "number" ? words.number : words.text}
        value={typeof row.value === "string" ? row.value : ""} compact={density === "compact"} projected />
      {error && <kit.KitLayoutText {...{ density }} line={{ part: "hint", text: error, role: "caption", tone: "bad" }} />}
    </kit.KitContent></kit.KitRow>;
}

// prettier-ignore
function FormProgress({ label, amount, ratio, density }: { label: string; amount: string; ratio: number; density: Density }) {
  const loading = kit.useComponentState() === "loading";
  return <kit.KitContent rhythm="flush" {...{ density }}>
    <kit.KitGrid fitLast {...{ density }}>
      <kit.KitLayoutText {...{ density }} line={{ part: "label", text: label, role: "meta" }} />
      <kit.KitLayoutText {...{ density }} align="end" line={{ part: "amount", text: amount, role: "meta", tone: "muted", tabular: true }} />
    </kit.KitGrid>
    <kit.KitMeter label="" amount="" ratio={loading ? 0 : ratio} slim addressed={false} />
  </kit.KitContent>;
}

// prettier-ignore
function FormBody({ form, density }: { form: Form; density: Density }) {
  const { lang, words: { formFiller: words } } = kit.useWords(paperworkWordsFor);
  const state = kit.useComponentState(), loading = state === "loading", inactive = state === "error";
  const scope = kit.usePartContext(), { interactive, controller } = kit.useKit();
  const preview = !interactive || controller?.actionsAt(c.formatAddress({ ...scope, part: "preview" })).includes("press");
  const progress = formProgress(form.fields), amount = formCount(progress, lang);
  const fields = form.fields.filter(({ shown }) => shown);
  return <>
    <kit.KitHeader {...{ density }} title={{ part: "title", text: form.title }} />
    <FormProgress label={words.progress} {...{ amount, density }} ratio={progress.ratio} />
    {!inactive && <kit.KitRow part={!loading && preview ? "preview" : null} role={!loading && preview ? "button" : "text"}
      label={words.preview} lineRole="label" inline inset="none" {...{ density }}
      leading={<kit.KitIcon name="file_text" decorative tone={preview ? "accent" : "muted"} {...{ loading }} />}>
      <kit.KitLayoutText {...{ density }} line={{ text: words.preview, role: "meta", tone: preview ? "accent" : "muted" }} />
    </kit.KitRow>}
    <kit.KitRowGroup {...{ density }} separators={false} spacing="groups">
      {fields.map((row) => <FormField key={row.id} {...{ row, density }} />)}
    </kit.KitRowGroup>
    {!fields.length && <kit.KitLayoutText {...{ density }} line={{ text: words.noneRequired, role: "meta", tone: "muted" }} />}
    {!inactive && <kit.KitActionFooter {...{ density }}>
      <kit.KitAction part={loading ? null : "save"} label={words.save} disabled={!form.canSave} contentParts={{}} />
      <kit.KitAction part={loading ? null : "clear"} label={words.clear} kind="danger" disabled={!form.canClear} contentParts={{}} />
    </kit.KitActionFooter>}
  </>;
}

// prettier-ignore
export function FormFiller(input: View) {
  const scope = kit.usePartContext(), { state } = scope;
  const { words: { formFiller: words } } = kit.useWords(paperworkWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const form = kit.useLiveControls(meta, { ...input, detail }) as Form;
  const [operation] = kit.useHostOperations();
  const save = operation?.name === "formFillerSaveCopy";
  const saving = save && operation?.status === "pending";
  const accepted = save && operation?.status === "accepted";
  const failed = operation?.status === "rejected";
  const display = saving ? "loading" : accepted ? "success" : failed ? "error" : state;
  const previewFailure = formFailure(kit.useDeviceData(), scope.component);
  const message = display === "success" ? words.saved : display === "error" ?
    (failed ? save ? words.failed : words.previewFailed : previewFailure ? words.previewFailed : words.failed) : words.empty;
  const body = <kit.PartScope {...scope} state={saving ? "loading" : state}><FormBody {...{ form, density }} /></kit.PartScope>;
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    <kit.PartScope {...scope} state={display}>
      <kit.KitState {...{ density, message }} part="status" icon={display === "empty" ? "file_text" : undefined}
        retain={display === "error" || accepted} loading={body}>{body}</kit.KitState>
    </kit.PartScope>
  </kit.KitCard>;
}
