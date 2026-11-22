import { z } from "zod";
import {
  appointmentDate,
  isoDate,
  type DeviceData,
  type Meta,
  type StateName,
  type Values,
} from "../../../catalog";
import { paperworkWordsFor } from "../lang";
import { attachment, seedDate } from "../seeds";

const kind = "signatureForms";
const revision = z.string().min(1).max(120);
export const signatureStyle = z.enum(["pad", "initials"]);
const hostForm = z.strictObject({
  instance: z.string(),
  document: attachment,
  signer: z.string(),
  style: signatureStyle.optional(),
  datedStamp: z.boolean().optional(),
  version: revision,
  openedVersion: revision.optional(),
  reviewedVersion: revision.optional(),
  draft: z
    .strictObject({
      version: revision,
      revision,
      date: isoDate.optional(),
      mark: z
        .string()
        .max(120)
        .regex(/^local:[a-zA-Z0-9_-]+$/),
    })
    .optional(),
  saved: z.strictObject({ version: revision, date: isoDate }).optional(),
  failure: z.strictObject({ version: revision, action: z.enum(["open", "save"]) }).optional(),
});

function signatureOptionsMatch(form: z.output<typeof hostForm>, input: Readonly<Values>): boolean {
  return (
    (form.style ?? "pad") === (input.style ?? "pad") &&
    (form.datedStamp === true) === (input.datedStamp === true)
  );
}

/** Match the current form and save settings. The host must supply one authoritative snapshot. */
export function signatureHost(input: Readonly<Values>, instance: string, data: DeviceData) {
  const matches = (data[kind] ?? []).flatMap((source) => {
    const result = hostForm.safeParse(source);
    if (!result.success) return [];
    const form = result.data;
    return form.instance === instance &&
      form.document === input.document &&
      form.signer === input.signer &&
      signatureOptionsMatch(form, input)
      ? [form]
      : [];
  });
  const form = matches.length === 1 ? matches[0] : undefined;
  if (!form)
    return { opened: false, reviewed: false, draft: undefined, savedOn: undefined, failure: undefined };
  const opened = form.openedVersion === form.version;
  const reviewed = opened && form.reviewedVersion === form.version;
  const draft = reviewed && form.draft?.version === form.version ? form.draft : undefined;
  const savedOn = reviewed && form.saved?.version === form.version ? form.saved.date : undefined;
  const failure = form.failure?.version === form.version ? form.failure.action : undefined;
  return { opened, reviewed, draft, savedOn, failure };
}

type SignatureHost = ReturnType<typeof signatureHost>;
type SignatureWords = ReturnType<typeof paperworkWordsFor>["signature"];

function padLabel(
  w: Pick<SignatureWords, "draft" | "draw" | "locked">,
  reviewed: boolean,
  hasDraft: boolean,
) {
  return hasDraft ? w.draft : reviewed ? w.draw : w.locked;
}

function signatureProjection(input: Readonly<Values>, instance: string, data: DeviceData) {
  const { opened, reviewed, draft, savedOn } = signatureHost(input, instance, data);
  return {
    reviewed,
    can_review: opened && !reviewed,
    can_draw: reviewed && !savedOn,
    can_save: Boolean(draft && !savedOn),
    savedOn,
    ...(input.datedStamp === true && draft?.date ? { stampDate: draft.date } : {}),
    // Identity for the clear confirmation, never a mark reference or drawing payload.
    clearRevision:
      draft && !savedOn
        ? JSON.stringify([
            instance,
            draft.version,
            draft.revision,
            input.style ?? "pad",
            input.datedStamp === true,
          ])
        : undefined,
  };
}

/** The host opens the file, attests review, owns the capture and writes the dated copy via onAction. */
const record = {
  deviceData: [kind],
  live: { derive: signatureProjection },
  deviceDataFlags: { has_mark: (_data, props) => typeof props.clearRevision === "string" },
  recordRuntime: {
    kind,
    scope: "document",
    project: () => ({}),
    actions: {
      "clear.press": {
        target: (props) => (typeof props.clearRevision === "string" ? props.clearRevision : undefined),
        plan: () => ({}),
      },
    },
  },
} as const satisfies Pick<Meta, "deviceData" | "live" | "deviceDataFlags" | "recordRuntime">;

export const signatureRecord = record;

export function previewSignature({
  input,
  state,
}: {
  input: Readonly<Values>;
  state: StateName;
}): DeviceData {
  const active = state === "filled" || state === "success";
  const version = "demo";
  return {
    [kind]: ["c1", "s1"].map((instance) => ({
      instance,
      document: input.document,
      signer: input.signer,
      ...(input.style === "initials" ? { style: input.style } : {}),
      ...(input.datedStamp === true ? { datedStamp: true } : {}),
      version,
      ...(active ? { openedVersion: version, reviewedVersion: version } : {}),
      ...(state === "filled"
        ? {
            draft: {
              version,
              revision: "demo-draft",
              mark: "local:synthetic",
              ...(input.datedStamp === true ? { date: seedDate } : {}),
            },
          }
        : {}),
      ...(state === "success" ? { saved: { version, date: seedDate } } : {}),
      ...(state === "error" ? { failure: { version, action: "open" } } : {}),
    })),
  };
}

type SignatureOptions = { style?: unknown; datedStamp?: unknown };

function signingCopy(w: SignatureWords, options: SignatureOptions) {
  const mark = options.style === "initials" ? w.initials : w;
  const stamped = options.datedStamp === true;
  return { mark, stamped, savedOn: stamped ? w.dateStamped : w.savedOn };
}

function signatureStamp(w: SignatureWords, date: unknown, lang?: string) {
  return typeof date === "string" ? w.stampDate(appointmentDate(date, lang)) : w.dateStamp;
}

function signatureFeedback(
  state: StateName,
  host: SignatureHost,
  w: SignatureWords,
  options: SignatureOptions,
  lang?: string,
) {
  const { mark, savedOn: dateLine } = signingCopy(w, options);
  const { savedOn, failure } = host;
  if (state === "error" || (state === "success" && !savedOn))
    return {
      part: "error",
      title:
        failure === "save" && options.style === "initials"
          ? w.initials.failed
          : failure
            ? w.failed[failure]
            : w.unavailable,
      sub: failure === "open" ? w.checkOriginal : w.originalSafe,
      icon: "alert",
      tone: "neutral",
    } as const;
  if (state === "success" && savedOn)
    return {
      part: "success",
      title: mark.saved,
      sub: dateLine(appointmentDate(savedOn, lang)),
      icon: "circle_check",
      tone: "good",
    } as const;
}

export function signatureDisplay(
  signer: string,
  state: StateName,
  host: SignatureHost,
  lang?: string,
  options: SignatureOptions = {},
) {
  const w = paperworkWordsFor(lang).signature;
  const { mark, stamped } = signingCopy(w, options);
  const { draft, reviewed, opened, savedOn } = host;
  const activeDraft = state === "filled" && !savedOn ? draft : undefined;
  const loading = state === "loading";
  return {
    signer: w.signer(signer),
    open: w.open,
    review: w.review,
    save: mark.save,
    clear: w.clear,
    pad: padLabel(mark, reviewed, Boolean(activeDraft)),
    dateStamp: stamped ? signatureStamp(w, activeDraft?.date, lang) : undefined,
    loading,
    feedback: signatureFeedback(state, host, w, options, lang),
    reviewed,
    mark: activeDraft?.mark,
    canReview: !loading && opened && !reviewed,
    canDraw: !loading && reviewed && !savedOn,
    canSave: Boolean(activeDraft),
    canClear: Boolean(activeDraft),
  };
}

export function signatureReading(input: unknown, state: StateName, lang?: string): string[] {
  const w = paperworkWordsFor(lang).signature;
  const { signer, reviewed, has_mark, savedOn, style, datedStamp, stampDate } = input as Values;
  const { mark, stamped, savedOn: dateLine } = signingCopy(w, { style, datedStamp });
  const identity = typeof signer === "string" ? [w.signer(signer)] : [];
  const controls = [
    w.open,
    w.review,
    mark.save,
    w.clear,
    ...(stamped ? [signatureStamp(w, state === "filled" && has_mark ? stampDate : undefined, lang)] : []),
  ];
  if (state === "empty") return [...identity, ...controls, mark.locked];
  if (state === "success")
    return [
      w.privateFile,
      ...identity,
      ...(typeof savedOn === "string" ? [mark.saved, dateLine(appointmentDate(savedOn, lang))] : []),
    ];
  return [
    w.privateFile,
    ...identity,
    ...(has_mark ? [w.privateMark] : []),
    ...controls,
    padLabel(mark, reviewed === true, has_mark === true),
  ];
}
