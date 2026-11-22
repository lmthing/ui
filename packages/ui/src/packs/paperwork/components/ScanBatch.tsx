import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
// prettier-ignore
import { scanBatchGates, scanBatchReading, scanBatchRequest, scanCount, scanDraft, scanLimit, scanPage, scanPageLabel } from "../copy";
import { paperworkWordsFor } from "../lang";
import { seedRows } from "../seeds";

// Core first: Camera/scan captures a page but cannot stage, reorder, retake and assemble a batch.
export const meta = {
  id: "ScanBatch",
  status: "ready",
  group: "input",
  purpose: "Arrange scanned pages and save them as one local PDF.",
  pick: "Stage multiple scanned pages, reorder or replace pages and assemble one local PDF. Not a single capture (Camera), browsing photos (Gallery), or opening a saved document (Documents).",
  writeHints: [
    "Use only supplied opaque local:<id> or synthetic lib:<id> page references in scan order. Use an empty pages array to start scanning. Do not write page numbers or counts.",
    'Use style "review" for a single larger preview above the thumbnails. Use detail "brief" only when asked to hide page labels but keep the page numbers. Leave other axes null unless requested.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "ok",
  realPath: "The device scanner captures pages with permission and saves an ordered PDF locally.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["label"] } },
  parts: ["root", "title", "count", "add", "save", "status", "large_photo", "reviewing"],
  items: { key: "pages", parts: ["root", "photo", "page", "label", "preview", "retake", "remove"] },
  partTiers: { root: "phone", preview: "phone", remove: "phone", save: "phone" },
  partTiersBy: { add: { prop: "linked", tiers: { true: "phone" } } },
  actions: {
    parts: { add: ["scan", "press"], save: ["press"] },
    items: { root: ["move"], preview: ["press"], retake: ["scan"], remove: ["press"] },
    when: {
      "add.scan": { canAdd: true, linked: false },
      "add.press": { canAdd: true, linked: true },
      save: { canSave: true },
      "root.move": { canMove: true, managing: true },
      preview: { style: "review" },
      retake: { managing: true },
      remove: { managing: true },
    },
  },
  emptyActions: ["add.scan", "add.press"],
  confirmParts: ["remove"],
  states: ["empty", "filled", "loading", "success", "error"],
  readSuccess: true,
  read: scanBatchReading,
  localState: scanDraft,
  live: { derive: scanBatchGates },
  hostCommands: {
    identity: ({ row }) => (row ? String(row.file) : "scan_batch"),
    parts: {
      "add.scan": { kind: "command", name: "scanBatchAdd", input: ({ props }) => scanBatchRequest(props) },
      "save.press": { kind: "command", name: "scanBatchSave", input: ({ props }) => scanBatchRequest(props) },
    },
    items: {
      "retake.scan": {
        kind: "command",
        name: "scanBatchRetake",
        input: ({ row, props }) =>
          row && { ...scanBatchRequest(props), slot: String(row.id), file: String(row.file) },
      },
    },
  },
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  title: c.text(32).optional(),
  pages: z.array(scanPage).min(0).max(scanLimit),
  captureGoto: c.screenId.optional(),
  style: z.enum(["tray", "review"]).default("tray"),
});

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return { title: seedRows(input, 32, 16)[0]!.title, pages: [] };
}

export const examples = [
  {
    title: "Allotment rules",
    pages: [
      { file: "lib:ledge_rules", label: "Access rules" },
      { file: "lib:ledge_map", label: "Plot map" },
    ],
  },
  {
    title: "Trot permit packet",
    style: "review",
    pages: [
      { file: "lib:trot_permit", label: "Permit" },
      { file: "lib:trot_cover", label: "Cover sheet" },
    ],
    captureGoto: "vault_capture",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("ScanBatch");
export const probes = [
  choose(
    "Let me reorder, retake or remove individual pages across several scans before I save them as one PDF on this phone.",
  ),
  choose(
    "Point my phone at one permit and scan it now. Just take one scan; no page tray or PDF assembly.",
    "Camera",
  ),
  write(
    "Make an Allotment rules scan batch from two supplied page images: Access rules lib:ledge_rules, then Plot map lib:ledge_map.",
  ),
  {
    ...write(
      "Stage Allotment rules: Access rules lib:ledge_rules, then Plot map lib:ledge_map. Show page numbers and thumbnails but hide both text labels. Leave layout, spacing and card finish alone.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read(
    "Start removing Access rules (Page 1). Tap its Remove control to open the confirmation, without confirming yet.",
    {
      address: "s1/r1/remove",
      action: "press",
    },
  ),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;
type Density = c.ThemeDensity;
type Tile = { page: View["pages"][number]; index: number; density: Density };

// prettier-ignore
function PageControls({ page, index, target, density }: Tile & { target: View["pages"][number] | undefined }) {
  const scope = kit.usePartContext(), { state } = scope;
  const { lang, words: { scanBatch: words } } = kit.useWords(paperworkWordsFor);
  const label = scanPageLabel(index, lang), part = state === "loading" ? null : "root";
  if (state === "error") return null;
  return <kit.PartScope {...scope} item={page.id}><kit.KitActionFooter {...{ density }}>
    {target && <kit.KitAction {...{ part }} action="move" value={target.id} kind="quiet" icon={index ? "arrow_left" : "chevron_right"}
      a11y={words.move(label, scanPageLabel(index ? index - 1 : 1, lang))} contentParts={{}} />}
    <kit.KitAction part={part && "retake"} action="scan" kind="quiet" icon="camera" a11y={words.retake(label)} contentParts={{}} />
    <kit.KitAction part={part && "remove"} kind="danger" icon="trash" a11y={words.remove(label)} contentParts={{}} />
  </kit.KitActionFooter></kit.PartScope>;
}

// prettier-ignore
function PageTile({ page, index, review, active, density }: Tile & { review: boolean; active: boolean }) {
  const scope = kit.usePartContext(), loading = kit.useComponentState() === "loading";
  const { lang, words: { scanBatch: words } } = kit.useWords(paperworkWordsFor);
  const label = scanPageLabel(index, lang);
  const a11y = page.label ? words.pageLabel(label, page.label) : label;
  const photo = <kit.KitContent {...{ density }}>
    <kit.KitPhoto part="photo" photo={page.file} shape="square" label={a11y} ring={active ? "accent" : "none"} {...{ loading }} />
    <kit.KitMetaLine {...{ density }} title={{ text: label, part: "page", role: "meta", strong: true, tabular: true }}
      meta={{ text: page.label, part: "label" }} />
  </kit.KitContent>;
  return <kit.PartScope {...scope} item={page.id}>
    {review ? <kit.KitRow part={loading ? null : "preview"} role={scope.state === "error" ? "text" : "button"} inline inset="none" label={a11y}>{photo}</kit.KitRow> : photo}
  </kit.PartScope>;
}

// prettier-ignore
function Pages({ input, active, density }: { input: View; active: string | undefined; density: Density }) {
  const { lang, words: { scanBatch: words } } = kit.useWords(paperworkWordsFor);
  const loading = kit.useComponentState() === "loading", review = input.style === "review";
  const { pages } = input;
  const selected = pages.find((row) => row.id === active) ?? pages[0];
  const tile = (page: View["pages"][number], index: number) => <PageTile key={page.id} {...{ page, index, review, density }} active={review && selected === page} />;
  const controls = (page: View["pages"][number], index: number) => <PageControls {...{ page, index, density }} target={pages[index ? index - 1 : 1]} />;
  const tiles = review ? pages.map(tile) : pages.map((page, index) =>
    <kit.KitContent key={page.id} {...{ density }}>{tile(page, index)}{controls(page, index)}</kit.KitContent>);
  if (!review || !selected) return <kit.KitGrid columns={2} {...{ density }}>{tiles}</kit.KitGrid>;
  const index = pages.indexOf(selected), reviewing = words.review(scanPageLabel(index, lang));
  return <kit.KitRowGroup spacing="groups" separators={false} {...{ density }}>
    <kit.KitContent rhythm="flush" {...{ density }}>
      <kit.KitFigure {...{ density }}
        media={<kit.KitPhoto part="large_photo" photo={selected.file} shape="wide" label={reviewing} {...{ loading }} />}
        caption={<kit.KitLayoutText {...{ density }} line={{ part: "reviewing", text: reviewing, role: "meta", tone: "muted" }} />} />
      {controls(selected, index)}
    </kit.KitContent>
    <kit.KitContent group="response" {...{ density }}>
      {pages.length <= 2 ? <kit.KitGrid columns={2} {...{ density }}>{tiles}</kit.KitGrid> : <kit.KitStrip {...{ density }}>{tiles}</kit.KitStrip>}
    </kit.KitContent>
  </kit.KitRowGroup>;
}

// prettier-ignore
export function ScanBatch(input: View) {
  const scope = kit.usePartContext(), { state } = scope;
  const { lang, words: { scanBatch: words } } = kit.useWords(paperworkWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const projected = kit.useLiveControls(meta, input) as View & { active?: string; canAdd: boolean };
  const live = detail === "brief" ? { ...projected, pages: projected.pages.map((page) => ({ ...page, label: undefined })) } : projected;
  const operations = kit.useHostOperations();
  const save = operations.find(({ name }) => name === "scanBatchSave"),
    capture = operations.find(({ name, status }) => name !== "scanBatchSave" && status === "pending") ??
      operations.find(({ name, status }) => name !== "scanBatchSave" && status === "rejected");
  const saving = save?.status === "pending", done = state === "success" || save?.status === "accepted";
  const failed = state === "error" || save?.status === "rejected" || capture?.status === "rejected";
  const empty = state === "empty" || (state === "filled" && !live.pages.length);
  const display = done ? "success" : saving ? "loading" : failed ? "error" : empty ? "empty" : state;
  const message = done ? words.saved : failed ? (save?.status === "rejected" || (state === "error" && live.pages.length) ? words.saveFailed : words.scanFailed) : words.empty;
  const tray = <kit.PartScope {...scope} state={saving ? "loading" : state}>
    <Pages input={live} active={projected.active} {...{ density }} />
  </kit.PartScope>;
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    <kit.KitHeader {...{ density }} title={{ part: "title", text: live.title ?? words.title }}
      meta={{ part: "count", text: scanCount(empty ? 0 : live.pages.length, lang), tabular: true }} />
    <kit.PartScope {...scope} state={display}>
      <kit.KitState {...{ density, message }} part="status" icon={failed ? "alert" : done ? "check" : "file_text"}
        retain={failed || (done && state !== "success")} loading={tray}>{tray}</kit.KitState>
    </kit.PartScope>
    {state !== "success" && state !== "error" && <kit.KitActionFooter {...{ density }}>
      {projected.canAdd && <kit.KitAction part="add" label={words.add} kind="secondary" action={live.captureGoto ? "press" : "scan"}
        goto={live.captureGoto} disabled={saving || capture?.status === "pending"} contentParts={{}} />}
      {!empty && live.pages.length > 0 && <kit.KitAction part="save" label={saving ? words.assembling : words.save}
        disabled={saving || capture?.status === "pending"} contentParts={{}} />}
    </kit.KitActionFooter>}
  </kit.KitCard>;
}
