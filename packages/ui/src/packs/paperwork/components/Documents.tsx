import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { documentDetails, documentReading } from "../copy";
import { paperworkWordsFor } from "../lang";
import { attachment, seedRows } from "../seeds";
import { prompt } from "../../../entry/prompt-Documents.generated";

// Core first: List/default opens ordinary rows, but cannot file private records with masked numbers and expiry.
export const meta = {
  id: "Documents",
  status: "ready",
  group: "data",
  ...prompt,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "Records and attachments stay on device, with a local file viewer and identifiers masked and read as (secret).",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["issuer", "number", "issued", "tags"] } },
  parts: ["root", "empty", "error"],
  // prettier-ignore
  items: {
    key: "docs",
    parts: ["root", "title", "kind", "owner", "issuer", "number", "issued", "expires", "file", "tags", "warning", "remove", "remove_icon"],
  },
  confirmParts: ["remove"],
  states: ["filled", "empty", "loading", "error"],
  actions: {
    items: { root: ["press"], remove: ["press"] },
    when: { root: { can_open: true } },
    noGoto: { items: ["remove"] },
  },
  read: (input, _state, lang): string[] =>
    (input as z.output<typeof props>).docs.flatMap((row) => documentReading(row, new Date(), lang)),
} as const satisfies c.Meta;

const doc = z
  .strictObject({
    title: c.text(32),
    kind: z.enum(["id", "insurance", "certificate", "tax", "contract", "form", "other"]),
    owner: c.text(24),
    issuer: c.text(24).optional(),
    number: c.secret(32).optional(),
    issued: c.isoDate.optional(),
    expires: c.isoDate.optional(),
    file: attachment.optional(),
    tags: z.array(c.text(16)).min(0).max(3),
    goto: c.screenId.optional(),
  })
  .overwrite((row) => ({ ...row, can_open: Boolean(row.file || row.goto) }));

// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants), docs: z.array(doc).min(1).max(6), style: z.enum(["cards"]).optional(),
}).overwrite((value) => value.detail === "brief" ? {
  ...value, docs: value.docs.map((row) => ({ ...row, issuer: undefined, number: undefined, issued: undefined, tags: [] })),
} : value);

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    docs: seedRows(input, 32, 24).map(({ title, detail }) => ({
      title,
      owner: detail,
      kind: "other",
      tags: [],
    })),
  };
}

// prettier-ignore
export const examples = [
  {
    docs: [{
      title: "Ledge greenhouse permit", kind: "certificate", owner: "Mina", issuer: "Garden office",
      number: "DEMO-A", issued: "2026-04-10", expires: "2027-04-10", file: "lib:greenhouse_permit",
      tags: ["permits"], goto: "permit",
    }],
  },
  {
    style: "cards",
    density: "compact",
    surface: "plain",
    docs: [
      { title: "Trot liability policy", kind: "insurance", owner: "Alex", expires: "2027-02-01", file: "lib:trot_policy", tags: ["insurance"] },
      { title: "First aid certificate", kind: "certificate", owner: "Alex", file: "lib:trot_aid", tags: [] },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Documents");
export const probes = [
  choose(
    "File my IDs and certificates with their owners, masked identification numbers, private scans and expiry warnings.",
  ),
  choose("Give me a plain list of three named links I can tap to open, with a chevron on each.", "List"),
  write(
    "File Mina's greenhouse permit as a certificate from Garden office, expires 2027-04-10, with the supplied synthetic attachment lib:greenhouse_permit and the permits tag.",
  ),
  {
    ...write(
      "File Mina's greenhouse permit, a certificate expiring 2027-04-10 with tag permits. Give the register a plain background with the rows directly on the screen and no enclosing card.",
    ),
    variant: { axis: "surface", value: "plain" },
  },
  {
    ...write(
      "File Mina's greenhouse permit, a certificate expiring 2027-04-10. Show a brief view hiding issuer, number, issue date and tags.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open Mina's greenhouse permit.", { address: "d1/r1", action: "press" }),
] satisfies c.Probe[];

type DocumentsProps = c.Props<typeof props, typeof meta>;
type DocumentRow = DocumentsProps["docs"][number];

// prettier-ignore
function DocumentFile({ row, density, surface, now }: {
  row: DocumentRow; density: c.ThemeDensity; surface: "card" | "plain" | undefined; now: Date;
}) {
  const { lang, words } = kit.useWords(paperworkWordsFor);
  const loading = kit.useComponentState() === "loading", canOpen = Boolean(row.file || row.goto);
  const lines = [{ part: "owner", line: row.owner }, ...documentDetails(row, now, lang).map((detail) =>
    detail.part === "file" ? { ...detail, line: words.documents.attached } : detail)];
  const fields = (...parts: string[]) => lines.filter(({ part }) => parts.includes(part));
  const draw = (...parts: string[]) => {
    const line = fields(...parts);
    if (!line.length) return null;
    if (loading) return <kit.KitSkeleton shape="figure" inset="none" content={[["caption", c.clip(
      line.map((entry) => entry.line).join(words.documents.separator), Math.max(1, row.title.length - 5),
    )]]} />;
    return <kit.KitText part={null} role="caption" tone="muted">{line.map((entry, index) =>
      <kit.KitText key={entry.part} part={entry.part} role="caption" tone={"tone" in entry ? entry.tone : "muted"}>
        {index ? words.documents.separator : undefined}{entry.line}
      </kit.KitText>)}</kit.KitText>;
  };
  const dot = <kit.KitSkeleton shape="figure" lead="dot" inset="none" content={[]} />;
  return (
    <kit.KitRow item={row.id} part={null} label="" {...{ density, surface }} trailing={loading ?
      <kit.KitSkeleton shape="control" kind="quiet" /> :
      <kit.KitAction icon="close" part="remove" kind="quiet" a11y={words.documents.remove(row.title)} />
    }>
      <kit.KitRow part={loading ? null : "root"} inline surface="plain" label={loading ? "" : row.title}
        goto={loading ? undefined : row.goto} role={!loading && row.file ? "button" : "text"} density={density}
        trailing={canOpen && (loading ? dot : <kit.KitIcon name="chevron_right" tone="muted" decorative />)}
        leading={loading ? dot : <kit.KitContent lead={<kit.KitIcon name="file_text" tone="muted" decorative />} children={null} />}>
        {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["body", row.title]]} />
          : <kit.KitText part="title" density={density}>{row.title}</kit.KitText>}
        {draw("owner", "kind")}{draw("issuer", "number")}
        {fields("issued", "expires", "file", "tags").length > 0 && <kit.KitContent group="response" density={density}>
          {draw("expires")}{draw("warning")}{draw("issued")}{draw("file", "tags")}
        </kit.KitContent>}
      </kit.KitRow>
    </kit.KitRow>
  );
}

// prettier-ignore
export function Documents({ docs, style, surface, density: requested }: DocumentsProps) {
  const density = kit.useVariant("density", meta.variants.density, requested);
  const state = kit.useComponentState(), { words } = kit.useWords(paperworkWordsFor);
  const now = new Date(), cards = style === "cards";
  return <kit.KitCard style={cards ? "cards" : "inset"} {...{ surface, density }}>
    {state === "empty" ? <kit.KitEmpty part="empty" icon="file_text" decorativeIcon />
      : state === "error" ? <kit.KitEmpty part="error" icon="file_text" decorativeIcon title={words.documents.unavailable} />
      : <kit.KitGrid list arrange="rows" listRowGap={cards ? "cards" : undefined} density={density}>
        {docs.map((row) => <DocumentFile key={row.id} {...{ row, density, now }} surface={cards ? surface : undefined} />)}
      </kit.KitGrid>}
  </kit.KitCard>;
}
