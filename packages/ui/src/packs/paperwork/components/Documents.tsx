import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { documentDetails, documentFolders, documentReading } from "../copy";
import { paperworkWordsFor } from "../lang";
import { attachment, seedRows } from "../seeds";

// Core first: List/default opens ordinary rows, but cannot file private records with masked numbers and expiry.
export const meta = {
  id: "Documents",
  status: "ready",
  group: "data",
  purpose: "Keep private records together and see when they expire.",
  pick: "A private life-admin file register with owners, identifiers and expiry dates. Not ordinary links (List), documents checked against a trip (TravelDocs), purchase warranties (Warranties) or rental terms (Lease).",
  writeHints: [
    "Never invent a document number or expiry warning. Copy dates only if known. File is an opaque local:<id> or supplied synthetic lib:<id>, never a URL or file content.",
    "Exact defaults are style:null, density:null, surface:null, detail:null. Change each field only for its own explicit request: cards for separate file tiles, compact for tighter spacing, plain for no enclosing card, brief for fewer details.",
    'A request to hide issuer, number, issue date and tags changes only detail to "brief". Keep surface:null and density:null unless separately requested. If only a plain background is requested, set surface:"plain" and keep density:null and detail:null.',
    'For a register grouped into folders, set style:"folders" and put each supplied folder name in its document row. Set pages only for an explicitly supplied page count. Set share:true only for a row with an attachment and an explicit request to offer sharing; never supply a recipient.',
  ],
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
    parts: ["root", "title", "kind", "owner", "issuer", "number", "issued", "expires", "file", "tags", "warning", "folder", "pages", "share", "remove", "remove_icon"],
  },
  partTiers: { share: "service" },
  confirmParts: ["remove", "share"],
  states: ["filled", "empty", "loading", "error"],
  actions: {
    items: { root: ["press"], remove: ["press"], share: ["press"] },
    when: { root: { can_open: true }, share: { can_share: true } },
    noGoto: { items: ["remove", "share"] },
  },
  hostCommands: {
    items: { "share.press": { kind: "command", name: "shareDocument" } },
    identity: ({ row }) => (row?.can_share === true && typeof row.file === "string" ? row.file : undefined),
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
    folder: c.text(24).optional(),
    pages: z.int().min(1).optional(),
    share: z.boolean().optional(),
  })
  .overwrite((row) => ({
    ...row,
    can_open: Boolean(row.file || row.goto),
    ...(row.share && row.file ? { can_share: true } : {}),
  }));

// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants), docs: z.array(doc).min(1).max(6), style: z.enum(["cards", "folders"]).optional(),
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
  {
    style: "folders",
    docs: [
      { title: "Trot liability policy", kind: "insurance", owner: "Alex", folder: "Insurance", pages: 8, file: "lib:trot_policy", share: true, tags: [] },
      { title: "Trot office lease", kind: "contract", owner: "Alex", folder: "Office", pages: 4, tags: [] },
      { title: "First aid certificate", kind: "certificate", owner: "Alex", tags: [] },
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
  {
    ...write(
      "Group Mina's file register into folders. Put her Greenhouse permit certificate in the Permits folder.",
    ),
    expectProps: { style: "folders", docs: [{ folder: "Permits" }] },
  },
  {
    ...write(
      "File Mina's Greenhouse permit certificate under the Permits folder. Display it as a separate file card instead of grouping the register.",
    ),
    expectProps: { style: "cards", docs: [{ folder: "Permits" }] },
  },
  {
    ...write("File Mina's Greenhouse permit as a certificate. The permit is 4 pages long."),
    expectProps: { docs: [{ pages: 4 }] },
  },
  {
    ...write(
      "File Mina's Greenhouse permit as a certificate with the supplied synthetic attachment lib:greenhouse_permit. Give that attached file a Share button; don't send it yet.",
    ),
    expectProps: { docs: [{ file: "lib:greenhouse_permit", share: true }] },
  },
  read("Open Mina's greenhouse permit.", { address: "d1/r1", action: "press" }),
] satisfies c.Probe[];

type DocumentsProps = c.Props<typeof props, typeof meta>;
type DocumentRow = DocumentsProps["docs"][number];

// prettier-ignore
function DocumentShare({ row, density }: { row: DocumentRow; density: c.ThemeDensity }) {
  const { screen, component } = kit.usePartContext(), { controller, interactive } = kit.useKit();
  const { words } = kit.useWords(paperworkWordsFor);
  const loading = kit.useComponentState() === "loading";
  if (!loading && interactive && !controller?.actionsAt(`${screen}/${component}/${row.id}/share`).includes("press"))
    return null;
  return <kit.KitActionFooter {...{ density }} indent={1}>
    {loading ? <kit.KitSkeleton shape="control" kind="quiet" />
      : <kit.KitAction part="share" kind="quiet" icon="share"
        a11y={words.documents.shareFile(row.title)} contentParts={{}} />}
  </kit.KitActionFooter>;
}

// prettier-ignore
function DocumentFile({ row, density, surface, now, grouped, first }: {
  row: DocumentRow; density: c.ThemeDensity; surface?: "card" | "plain" | undefined; now: Date; grouped?: boolean; first?: boolean;
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
    <kit.KitRow item={row.id} part={null} label="" inset={grouped ? "none" : "md"} inline={first === true}
      {...{ density, surface }} trailing={loading ?
      <kit.KitSkeleton shape="control" kind="danger" /> :
      <kit.KitAction icon="trash" part="remove" kind="danger" a11y={words.documents.remove(row.title)} />
    }>
      <kit.KitRow part={loading ? null : "root"} inline surface="plain" label={loading ? "" : row.title}
        goto={loading ? undefined : row.goto} role={!loading && row.file ? "button" : "text"} density={density}
        trailing={canOpen && <kit.KitIcon name="chevron_right" tone="muted" decorative loading={loading} />}
        leading={loading ? dot : <kit.KitContent lead={<kit.KitIcon name="file_text" tone="muted" decorative />} children={null} />}>
        {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["body", row.title]]} />
          : <kit.KitText part="title" density={density}>{row.title}</kit.KitText>}
        {draw("owner", "kind")}{draw("issuer", "number")}
        {fields("issued", "expires", "file", "tags", "pages", ...(!grouped ? ["folder"] : [])).length > 0 && <kit.KitContent group="response" density={density}>
          {draw("expires")}{draw("warning")}{draw("issued")}{draw("file", "tags")}
          {!grouped && draw("folder")}{draw("pages")}
        </kit.KitContent>}
      </kit.KitRow>
      {row.file && row.share && <DocumentShare {...{ density, row }} />}
    </kit.KitRow>
  );
}

// prettier-ignore
function FolderRegister({ docs, density, now }: Pick<DocumentsProps, "docs"> & { density: c.ThemeDensity; now: Date }) {
  const { words } = kit.useWords(paperworkWordsFor), state = kit.useComponentState();
  const folders = documentFolders(docs);
  const rows = <kit.KitRowGroup density={density} spacing="groups" separators={false}>
    {folders.map(([folder, files]) => <kit.KitContent key={JSON.stringify(folder ?? null)} rhythm="flush" {...{ density }}>
      <kit.KitHeader density={density} title={{ text: folder ?? words.documents.unfiled, role: "meta", tone: "muted" }} />
      <kit.KitRowGroup {...{ density }}>{files.map((row, index) =>
        <DocumentFile key={row.id} grouped first={index === 0} {...{ row, density, now }} />)}</kit.KitRowGroup>
    </kit.KitContent>)}
  </kit.KitRowGroup>;
  return <kit.KitState {...{ density }} part={state === "error" ? "error" : "empty"} loading={rows}
    icon="file_text" message={state === "error" ? words.documents.unavailable : undefined}>{rows}</kit.KitState>;
}

// prettier-ignore
export function Documents({ docs, style, surface, density: requested }: DocumentsProps) {
  const density = kit.useVariant("density", meta.variants.density, requested);
  const state = kit.useComponentState(), { words } = kit.useWords(paperworkWordsFor);
  const now = new Date(), cards = style === "cards";
  return <kit.KitCard style={cards ? "cards" : "inset"} padded={style === "folders"} {...{ surface, density }}>
    {style === "folders" ? <FolderRegister {...{ docs, density, now }} />
      : state === "empty" ? <kit.KitEmpty part="empty" icon="file_text" decorativeIcon />
      : state === "error" ? <kit.KitEmpty part="error" icon="file_text" decorativeIcon title={words.documents.unavailable} />
      : <kit.KitGrid list arrange="rows" listRowGap={cards ? "cards" : undefined} density={density}>
        {docs.map((row) => <DocumentFile key={row.id} {...{ row, density, now }} surface={cards ? surface : undefined} />)}
      </kit.KitGrid>}
  </kit.KitCard>;
}
