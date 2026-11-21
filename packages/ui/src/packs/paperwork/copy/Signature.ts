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
const hostForm = z.strictObject({
  instance: z.string(),
  document: attachment,
  signer: z.string(),
  version: revision,
  openedVersion: revision.optional(),
  reviewedVersion: revision.optional(),
  draft: z
    .strictObject({
      version: revision,
      revision,
      mark: z
        .string()
        .max(120)
        .regex(/^local:[a-zA-Z0-9_-]+$/),
    })
    .optional(),
  saved: z.strictObject({ version: revision, date: isoDate }).optional(),
});

/** Match the current component and form. The host must supply one authoritative snapshot. */
export function signatureHost(input: Readonly<Values>, instance: string, data: DeviceData) {
  const matches = (data[kind] ?? []).flatMap((source) => {
    const result = hostForm.safeParse(source);
    if (!result.success) return [];
    const form = result.data;
    return form.instance === instance && form.document === input.document && form.signer === input.signer
      ? [form]
      : [];
  });
  const form = matches.length === 1 ? matches[0] : undefined;
  const opened = Boolean(form && form.openedVersion === form.version);
  const reviewed = opened && form!.reviewedVersion === form!.version;
  const draft = reviewed && form!.draft?.version === form!.version ? form!.draft : undefined;
  const savedOn = reviewed && form!.saved?.version === form!.version ? form!.saved?.date : undefined;
  return { opened, reviewed, draft, savedOn };
}

type SignatureHost = ReturnType<typeof signatureHost>;

function signatureProjection(input: Readonly<Values>, instance: string, data: DeviceData) {
  const { opened, reviewed, draft, savedOn } = signatureHost(input, instance, data);
  return {
    reviewed,
    can_review: opened && !reviewed,
    can_draw: reviewed && !savedOn,
    can_save: Boolean(draft && !savedOn),
    savedOn,
    // Identity for the clear confirmation, never a mark reference or drawing payload.
    clearRevision: draft && !savedOn ? JSON.stringify([instance, draft.version, draft.revision]) : undefined,
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
      version,
      ...(active ? { openedVersion: version, reviewedVersion: version } : {}),
      ...(state === "filled" ? { draft: { version, revision: "demo-draft", mark: "local:synthetic" } } : {}),
      ...(state === "success" ? { saved: { version, date: seedDate } } : {}),
    })),
  };
}

export function signatureDisplay(signer: string, state: StateName, host: SignatureHost, lang?: string) {
  const w = paperworkWordsFor(lang).signature;
  const { draft, reviewed, opened, savedOn } = host;
  const feedback =
    state === "error" || (state === "success" && !savedOn)
      ? ({
          part: "error",
          title: w.unavailable,
          sub: w.originalSafe,
          icon: "alert",
          tone: "neutral",
        } as const)
      : state === "success" && savedOn
        ? ({
            part: "success",
            title: w.saved,
            sub: w.savedOn(appointmentDate(savedOn, lang)),
            icon: "circle_check",
            tone: "good",
          } as const)
        : undefined;
  const loading = state === "loading";
  return {
    signer: w.signer(signer),
    open: w.open,
    review: w.review,
    save: w.save,
    clear: w.clear,
    pad: draft && state === "filled" ? w.draft : reviewed ? w.draw : w.locked,
    loading,
    feedback,
    reviewed,
    mark: state === "filled" ? draft?.mark : undefined,
    canReview: !loading && opened && !reviewed,
    canDraw: !loading && reviewed && !savedOn,
    canSave: state === "filled" && Boolean(draft && !savedOn),
    canClear: state === "filled" && Boolean(draft && !savedOn),
  };
}

export function signatureReading(input: unknown, state: StateName, lang?: string): string[] {
  const w = paperworkWordsFor(lang).signature;
  const { signer, has_mark, savedOn } = input as Values;
  return [
    w.privateFile,
    ...(typeof signer === "string" ? [w.signer(signer)] : []),
    ...(has_mark ? [w.privateMark] : []),
    ...(state === "success" && typeof savedOn === "string"
      ? [w.saved, w.savedOn(appointmentDate(savedOn, lang))]
      : []),
  ];
}
