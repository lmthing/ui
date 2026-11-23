import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import {
  scanBatchGates,
  scanBatchReading,
  scanBatchRequest,
  scanCount,
  scanDraft,
  scanFailure,
  scanLimit,
  scanPage,
  scanPageLabel,
} from "../copy";
import { paperworkWordsFor } from "../lang";
import { seedRows } from "../seeds";
import { prompt } from "../../../entry/prompt-ScanBatch.generated";

// Core first: Camera/scan captures a page but cannot stage, reorder, retake and assemble a batch.
export const meta = {
  id: "ScanBatch",
  status: "ready",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "ok",
  realPath: "The device scanner captures pages with permission and saves an ordered PDF locally.",
  variants: { detail: ["full", "brief"] },
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
  deviceData: ["scanPermissionFailures"],
  previewDeviceData: ({ input, state }) => ({
    scanPermissionFailures: state === "error" && input.style === "review" ? ["c1"] : [],
  }),
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

function PageControls({
  page,
  index,
  target,
  density,
}: Tile & { target: View["pages"][number] | undefined }) {
  const scope = kit.usePartContext(),
    { state } = scope;
  const {
    lang,
    words: { scanBatch: words },
  } = kit.useWords(paperworkWordsFor);
  const label = scanPageLabel(index, lang),
    part = state === "loading" ? null : "root";
  if (state === "error") return null;
  return (
    <kit.PartScope {...scope} item={page.id}>
      <kit.KitActionFooter {...{ density }}>
        {target && (
          <kit.KitAction
            {...{ part }}
            action="move"
            value={target.id}
            kind="quiet"
            icon={index ? "arrow_left" : "chevron_right"}
            a11y={words.move(label, scanPageLabel(index ? index - 1 : 1, lang))}
            contentParts={{}}
          />
        )}
        <kit.KitAction
          part={part && "retake"}
          action="scan"
          kind="quiet"
          icon="camera"
          a11y={words.retake(label)}
          contentParts={{}}
        />
        <kit.KitAction
          part={part && "remove"}
          kind="danger"
          icon="trash"
          a11y={words.remove(label)}
          contentParts={{}}
        />
      </kit.KitActionFooter>
    </kit.PartScope>
  );
}

function PageTile({
  page,
  index,
  review,
  active,
  move,
  density,
}: Tile & { review: boolean; active: boolean; move: boolean }) {
  const scope = kit.usePartContext(),
    loading = kit.useComponentState() === "loading";
  const {
    lang,
    words: { scanBatch: words },
  } = kit.useWords(paperworkWordsFor);
  const label = scanPageLabel(index, lang);
  const a11y = page.label ? words.pageLabel(label, page.label) : label;
  const photo = (
    <kit.KitContent {...{ density }}>
      <kit.KitPhoto
        part="photo"
        photo={page.file}
        shape="square"
        label={a11y}
        ring={active ? "accent" : "none"}
        {...{ loading }}
      />
      <kit.KitMetaLine
        {...{ density }}
        title={{ text: label, part: "page", role: "meta", strong: true, tabular: true }}
        meta={{ text: page.label, part: "label" }}
      />
    </kit.KitContent>
  );
  const content = review ? (
    <kit.KitRow
      part={loading ? null : "preview"}
      role={scope.state === "error" ? "text" : "button"}
      inline
      inset="none"
      label={a11y}
    >
      {photo}
    </kit.KitRow>
  ) : (
    photo
  );
  return (
    <kit.PartScope {...scope} item={page.id}>
      {move || loading ? (
        content
      ) : (
        <kit.KitRow part="root" role="text" inline fitContent inset="none" label={a11y}>
          {content}
        </kit.KitRow>
      )}
    </kit.PartScope>
  );
}

function ReviewedPage(
  photo: View["pages"][number]["file"],
  reviewing: string,
  density: Density,
  loading: boolean,
) {
  return (
    <kit.KitFigure
      {...{ density }}
      media={
        <kit.KitPhoto part="large_photo" photo={photo} shape="wide" label={reviewing} {...{ loading }} />
      }
      caption={
        <kit.KitLayoutText
          {...{ density }}
          line={{ part: "reviewing", text: reviewing, role: "meta", tone: "muted" }}
        />
      }
    />
  );
}

function Pages({ input, active, density }: { input: View; active: string | undefined; density: Density }) {
  const {
    lang,
    words: { scanBatch: words },
  } = kit.useWords(paperworkWordsFor);
  const loading = kit.useComponentState() === "loading";
  const review = input.style === "review";
  const { pages } = input;
  const selected = pages.find((row) => row.id === active) ?? pages[0];
  const tile = (page: View["pages"][number], index: number) => (
    <PageTile
      key={page.id}
      {...{ page, index, review, density }}
      active={review && selected === page}
      move={pages.length > 1 && (!review || selected === page)}
    />
  );
  const controls = (page: View["pages"][number], index: number) => (
    <PageControls {...{ page, index, density }} target={pages[index ? index - 1 : 1]} />
  );
  const tiles = review
    ? pages.map(tile)
    : pages.map((page, index) => (
        <kit.KitContent key={page.id} {...{ density }}>
          {tile(page, index)}
          {controls(page, index)}
        </kit.KitContent>
      ));
  if (!review || !selected)
    return (
      <kit.KitGrid columns={2} {...{ density }}>
        {tiles}
      </kit.KitGrid>
    );
  const index = pages.indexOf(selected),
    reviewing = words.review(scanPageLabel(index, lang));
  return (
    <kit.KitRowGroup spacing="groups" separators={false} {...{ density }}>
      <kit.KitContent rhythm="flush" {...{ density }}>
        {ReviewedPage(selected.file, reviewing, density, loading)}
        {controls(selected, index)}
      </kit.KitContent>
      <kit.KitContent group="response" {...{ density }}>
        {pages.length <= 2 ? (
          <kit.KitGrid columns={2} {...{ density }}>
            {tiles}
          </kit.KitGrid>
        ) : (
          <kit.KitStrip {...{ density }}>{tiles}</kit.KitStrip>
        )}
      </kit.KitContent>
    </kit.KitRowGroup>
  );
}

type ScanActionProps = {
  words: ReturnType<typeof paperworkWordsFor>["scanBatch"];
  density: Density;
  canAdd: boolean;
  saving: boolean;
  empty: boolean;
  pending: boolean;
};

function ScanActions(live: View, { words, density, canAdd, saving, empty, pending }: ScanActionProps) {
  return (
    <kit.KitActionFooter {...{ density }}>
      {canAdd && (
        <kit.KitAction
          part="add"
          label={words.add}
          kind="secondary"
          action={live.captureGoto ? "press" : "scan"}
          goto={live.captureGoto}
          disabled={saving || pending}
          contentParts={{}}
        />
      )}
      {!empty && live.pages.length > 0 && (
        <kit.KitAction
          part="save"
          label={saving ? words.assembling : words.save}
          disabled={saving || pending}
          contentParts={{}}
        />
      )}
    </kit.KitActionFooter>
  );
}

function scanStatus(
  state: c.StateName,
  count: number,
  operations: readonly c.HostOperation[],
  permissionFailure: ReturnType<typeof scanFailure>,
  words: ScanActionProps["words"],
) {
  const save = operations.find(({ name }) => name === "scanBatchSave");
  const capture =
    operations.find(({ name, status }) => name !== "scanBatchSave" && status === "pending") ??
    operations.find(({ name, status }) => name !== "scanBatchSave" && status === "rejected");
  const saving = save?.status === "pending";
  const done = state === "success" || save?.status === "accepted";
  const failed = state === "error" || save?.status === "rejected" || capture?.status === "rejected";
  const empty = state === "empty" || (state === "filled" && !count);
  const display: c.StateName = done
    ? "success"
    : saving
      ? "loading"
      : failed
        ? "error"
        : empty
          ? "empty"
          : state;
  const message = done
    ? words.saved
    : failed
      ? save?.status === "rejected" || (state === "error" && count && !permissionFailure)
        ? words.saveFailed
        : words.scanFailed
      : words.empty;
  return { display, message, done, saving, failed, empty, pending: capture?.status === "pending" };
}

export function ScanBatch(input: View) {
  const scope = kit.usePartContext();
  const { state } = scope;
  const {
    lang,
    words: { scanBatch: words },
  } = kit.useWords(paperworkWordsFor);
  const density = kit.useKit().density;
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const projected = kit.useLiveControls(meta, input) as View & { active?: string; canAdd: boolean };
  const live =
    detail === "brief"
      ? { ...projected, pages: projected.pages.map((page) => ({ ...page, label: undefined })) }
      : projected;
  const operations = kit.useHostOperations();
  const permissionFailure = scanFailure(kit.useDeviceData(), scope.component);
  const { display, message, done, saving, failed, empty, pending } = scanStatus(
    state,
    live.pages.length,
    operations,
    permissionFailure,
    words,
  );
  const tray = (
    <kit.PartScope {...scope} state={saving ? "loading" : state}>
      <Pages input={live} active={projected.active} {...{ density }} />
    </kit.PartScope>
  );
  return (
    <kit.KitCard part="root" padded density={density}>
      <kit.KitHeader
        {...{ density }}
        title={{ part: "title", text: live.title ?? words.title }}
        meta={{ part: "count", text: scanCount(empty ? 0 : live.pages.length, lang), tabular: true }}
      />
      <kit.PartScope {...scope} state={display}>
        <kit.KitState
          {...{ density, message }}
          part="status"
          icon={failed ? "alert" : done ? "check" : "file_text"}
          retain={failed || (done && state !== "success")}
          loading={tray}
        >
          {tray}
        </kit.KitState>
      </kit.PartScope>
      {state !== "success" &&
        state !== "error" &&
        ScanActions(live, {
          words,
          density,
          canAdd: projected.canAdd,
          saving,
          empty,
          pending,
        })}
    </kit.KitCard>
  );
}
