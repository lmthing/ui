import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import {
  previewSignature,
  signatureDisplay,
  signatureHost,
  signatureReading,
  signatureRecord,
  signatureStyle,
} from "../copy";
import { paperworkWordsFor } from "../lang";
import { attachment, seedFile, seedRows } from "../seeds";

// Core first: Field/toggle captures a yes or no, not a hand-drawn mark bound to a reviewed document.
export const meta = {
  id: "Signature",
  status: "ready",
  group: "input",
  purpose: "Draw a personal signature and save a dated copy of the reviewed form.",
  pick: "Hand-draw a signature or initials with a finger or stylus on a reviewed form, then save a local signed copy. Not filling named form fields (FormFiller), a yes/no field (Field), typed client waiver acceptance (Agreement) or just viewing a file (Documents).",
  writeHints: [
    "document must be an opaque local:<id> or supplied synthetic lib:<id>. Do not write strokes, marks, version, timestamp, review or saved state; those belong to the host.",
    "Never claim verified identity, legal validity or remote signing. Omit hint unless supplied or useful.",
    'Exact axis defaults are {"density":null,"surface":null,"detail":null}. Override only the one axis explicitly requested: tighter spacing changes density to "compact"; a plain background with no surrounding card changes surface to "plain"; hiding the optional hint changes detail to "brief".',
    'For hiding the hint alone use {"density":null,"surface":null,"detail":"brief"} and keep the supplied hint text in hint. For a plain background alone use {"density":null,"surface":"plain","detail":null}. Never write "plain" merely because the brief asks for fewer words, nor "full" for an unrequested detail axis.',
    'Use style:"initials" only for hand-drawn initials. Set datedStamp:true only if asked to stamp the signing date on the copy itself; never supply the date. Merely keeping a dated local copy does not request a stamp.',
  ],
  region: "body",
  weight: 3,
  tier: "phone",
  realPath:
    "Touch or stylus input saves a dated local signed copy of the reviewed version without altering the original or verifying identity.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["hint"] } },
  // prettier-ignore
  parts: ["root", "title", "signer", "hint", "document", "document_label", "document_icon",
    "review", "review_label", "pad", "pad_frame", "clear", "clear_label", "save", "save_label", "success", "error", "sub", "date_stamp"],
  states: ["empty", "filled", "loading", "success", "error"],
  confirmParts: ["clear"],
  emptyActions: ["document.press", "review.check", "pad.set"],
  ...c.hostOnlyParts({ parts: ["pad"] }),
  ...signatureRecord,
  previewDeviceData: previewSignature,
  actions: {
    parts: { document: ["press"], review: ["check"], pad: ["set"], clear: ["press"], save: ["press"] },
    // These gates are projected by the drawing host, never supplied by a Writer.
    when: {
      review: { can_review: true },
      pad: { can_draw: true },
      clear: { has_mark: true },
      save: { can_save: true },
    },
  },
  readSuccess: true,
  read: signatureReading,
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    title: c.text(32),
    document: attachment,
    signer: c.text(28),
    hint: c.text(60).optional(),
    style: signatureStyle.default("pad"),
    datedStamp: z.boolean().optional(),
  })
  .overwrite((input) => (input.detail === "brief" ? { ...input, hint: undefined } : input));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const { title, detail } = seedRows(input, 32, 28)[0]!;
  return { title, signer: detail, document: seedFile };
}

export const examples = [
  {
    title: "Allotment access form",
    document: "lib:ledge_access",
    signer: "Mina",
    hint: "Review the access rules first.",
  },
  {
    title: "Trot office access form",
    document: "lib:trot_access",
    signer: "Alex",
  },
  {
    title: "Trot key handover form",
    document: "lib:trot_keys",
    signer: "Alex",
    style: "initials",
    datedStamp: true,
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Signature");
export const probes = [
  choose(
    "Let me read my personal office access form, draw my signature with my finger, and keep a signed copy on this phone.",
  ),
  choose("Put a single yes or no switch on my form, labelled Use side entrance.", "Field"),
  write(
    "Let Mina draw her signature after reviewing the Allotment access form, supplied as synthetic attachment lib:ledge_access. Hint: Review the access rules first.",
  ),
  {
    ...write(
      "Give Mina a drawing pad for the Allotment access form, synthetic original lib:ledge_access. Put the pad and its controls on a plain background with no card around them.",
    ),
    variant: { axis: "surface", value: "plain" },
  },
  {
    ...write(
      "Let Mina sign the Allotment access form, synthetic original lib:ledge_access. Store the supplied hint 'Review the access rules first.' but hide that hint in a brief view. Keep the preview, review, drawing and save controls.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  {
    ...write(
      "Let Mina review the Allotment access form, synthetic original lib:ledge_access, and draw only her handwritten initials on the copy.",
    ),
    expectProps: { style: "initials" },
  },
  {
    ...write(
      "Let Mina sign the Allotment access form, synthetic original lib:ledge_access. Stamp the actual signing date on the signed copy itself, without changing the original.",
    ),
    expectProps: { datedStamp: true },
  },
  read(
    "Use the document preview action, not the signature pad, to open Mina's original allotment access form.",
    {
      address: "s1/document",
      action: "press",
    },
  ),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;
type Density = c.AxisValue<"density">;
type Display = ReturnType<typeof signatureDisplay>;

// prettier-ignore
function SignatureWorkflow({ copy, density, options }: { copy: Display; density: Density; options: boolean }) {
  const pad = <kit.KitSignaturePad part="pad_frame" target={{ part: "pad" }} label={copy.pad}
    loading={copy.loading} disabled={!copy.canDraw} {...(copy.mark ? { mark: copy.mark } : {})} />;
  return <>
    <kit.KitAction part="document" label={copy.open} icon="file_text" kind="secondary" full />
    <kit.KitRow part={null} label="" inline density={density} lineRole="label"
      trailing={copy.loading ? <kit.KitSkeleton shape="control" kind="quiet" /> :
        <kit.KitCheck part="review" label={copy.review} done={copy.reviewed}
        readonly={copy.reviewed} disabled={!copy.canReview && !copy.reviewed} />}>
      {copy.loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["label", copy.review]]} /> :
        <kit.KitText part="review_label" role="label" density={density}>{copy.review}</kit.KitText>}
    </kit.KitRow>
    {options ?
      <kit.KitFigure density={density} media={pad}
        caption={copy.dateStamp && <kit.KitLayoutText {...{ density }}
          line={{ part: "date_stamp", text: copy.dateStamp, role: "caption", tone: "muted" }} />} />
      : pad}
    <kit.KitGrid fitLast density={density}>
      <kit.KitAction part="save" label={copy.save} full disabled={!copy.canSave}
        kind={copy.loading || copy.canSave ? "primary" : "quiet"} />
      <kit.KitAction part="clear" label={copy.clear} kind={options ? "danger" : "quiet"} disabled={!copy.canClear} />
    </kit.KitGrid>
  </>;
}

// prettier-ignore
export function Signature(input: View) {
  const { component } = kit.usePartContext(), state = kit.useComponentState();
  const { lang } = kit.useWords(paperworkWordsFor);
  const host = signatureHost(input, component, kit.useDeviceData());
  const copy = signatureDisplay(input.signer, state, host, lang, input);
  const options = input.style === "initials" || input.datedStamp === true;
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const hint = detail === "full" ? input.hint : undefined;
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    {options ? <kit.KitHeader {...{ density }} title={{ part: "title", text: input.title, role: "title" }}
      meta={[{ part: "signer", text: copy.signer }, { part: "hint", text: hint }]} />
      : copy.loading ? <kit.KitSkeleton shape="figure" inset="none" density={density}
      content={[["title", input.title], ["label", copy.signer], ["label", hint]]} />
      : <kit.KitContent lineRole="title" density={density}>
        <kit.KitText part="title" role="title" density={density}>{input.title}</kit.KitText>
        <kit.KitText part="signer" role="label" tone="muted" density={density}>{copy.signer}</kit.KitText>
        {hint && <kit.KitText part="hint" role="label" tone="muted" density={density}>{hint}</kit.KitText>}
      </kit.KitContent>}
    {copy.feedback ? <kit.KitContent lineRole="body" group="response" density={density}
      lead={<kit.KitIcon name={copy.feedback.icon} tone={copy.feedback.tone === "good" ? "good" : "muted"} decorative />}>
      <kit.KitText part={copy.feedback.part} role="body" emphasis="strong" density={density}>{copy.feedback.title}</kit.KitText>
      <kit.KitText part="sub" role="label" tone="muted" density={density}>{copy.feedback.sub}</kit.KitText>
    </kit.KitContent>
      : <SignatureWorkflow {...{ copy, density, options }} />}
  </kit.KitCard>;
}
