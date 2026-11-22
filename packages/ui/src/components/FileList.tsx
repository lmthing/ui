import { z } from "zod";
import * as c from "../catalog";
import * as kit from "../kit";
import { prompt } from "../entry/prompt-FileList.generated";

export const meta = {
  id: "FileList",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "ok",
  realPath:
    "The host document picker supplies opaque references, the viewer previews them, and a host adapter downloads them.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["metadata", "pages"] } },
  parts: ["root", "message"],
  items: {
    key: "files",
    parts: [
      "root",
      "format",
      "name",
      "size",
      "pages",
      "metadata",
      "status",
      "download",
      "download_icon",
      "remove",
      "remove_icon",
    ],
  },
  states: ["filled", "empty", "loading", "error"],
  actions: {
    items: { root: ["press"], download: ["press"], remove: ["press"] },
    when: { root: { status: "ready" }, download: { status: "ready" }, remove: { removable: true } },
    noGoto: { items: ["download", "remove"] },
  },
  partTiers: { download: "service" },
  confirmParts: ["remove"],
  read: (value, _state, lang): string[] => {
    const { files, detail } = value as z.output<typeof props>;
    const words = c.wordsFor(lang).fileList;
    return files.flatMap((file, index) => {
      const { format, size, pages, status } = fileCopy(file, detail === "full", lang);
      return [`r${index + 1}: ${[format, size, pages, status].filter(Boolean).join(words.separator)}`];
    });
  },
} as const satisfies c.Meta;

const file = z.strictObject({
  fileRef: c
    .text(32)
    .refine((ref) => !/[/\\]|^[a-z][a-z\d+.-]*:(?!\d+$)/i.test(ref))
    .meta({ kind: "secret", max: 32 }),
  name: c.text(48),
  ext: z.enum(["pdf", "doc", "sheet", "zip", "audio", "other"]),
  sizeBytes: z.number().nonnegative(),
  pages: z.number().int().min(1).optional(),
  status: z.enum(["ready", "downloading", "missing"]),
  goto: c.screenId.optional(),
});

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  files: z.array(file).min(1).max(6),
  removable: z.boolean().default(false),
  style: z.enum(["rows", "cards"]).default("rows"),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const unavailable = (name: string) =>
    ({ name, fileRef: c.placeholderValue, ext: "other", sizeBytes: 0, status: "missing" }) as const;
  const files = c.itemsOf(cast, 3).flatMap((item) => {
    const name = c.titleOf(item, 48, thing);
    return name ? [unavailable(name)] : [];
  });
  return { files: files.length ? files : [unavailable(c.placeholderTitle(0, lang))] };
}

export const examples = [
  {
    files: [
      {
        fileRef: "demo_care",
        name: "Fern care guide.pdf",
        ext: "pdf",
        sizeBytes: 240000,
        pages: 4,
        status: "ready",
      },
      { fileRef: "demo_light", name: "Light log.xlsx", ext: "sheet", sizeBytes: 18000, status: "ready" },
      {
        fileRef: "demo_mixes",
        name: "Potting recipes.zip",
        ext: "zip",
        sizeBytes: 4200000,
        status: "downloading",
      },
    ],
    removable: true,
  },
  {
    files: [
      {
        fileRef: "demo_route",
        name: "River route notes.pdf",
        ext: "pdf",
        sizeBytes: 1400000,
        pages: 2,
        status: "ready",
        goto: "river_route",
      },
      {
        fileRef: "demo_brief",
        name: "Walk briefing.m4a",
        ext: "audio",
        sizeBytes: 5200000,
        status: "missing",
      },
    ],
    style: "cards",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("FileList");
export const probes = [
  choose("Show the two PDFs attached to this form, their file sizes and a way to preview or download each."),
  choose("Show my four dog photos together so I can swipe through the pictures.", "Gallery"),
  write(
    "Show the attached Fern guide.pdf, file reference demo_fern, PDF, 240000 bytes, 4 pages, ready. Let me remove it.",
  ),
  {
    ...write(
      "Show Intake.pdf, supplied reference demo_intake, PDF, 120000 bytes, 3 pages, ready. Keep the page count in the data but hide it from the display.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the attached Fern care guide PDF for a preview.", { address: "c1/r1", action: "press" }),
] satisfies c.Probe[];

type FileListProps = c.Props<typeof props, typeof meta>;
type File = FileListProps["files"][number];

function fileCopy(row: z.output<typeof file>, showPages: boolean, lang?: string) {
  const words = c.wordsFor(lang).fileList;
  const size = c.fileSizeLine(row.sizeBytes, lang);
  const pages = showPages && row.pages !== undefined ? c.filePagesLine(row.pages, lang) : undefined;
  const status = words.status[row.status];
  return { size, pages, status, format: words.format[row.ext] };
}

type FileRowProps = {
  row: File;
  density: c.ThemeDensity;
  cards: boolean;
  removable: boolean;
  showPages: boolean;
};

function FileRow({ row, density, cards, removable, showPages }: FileRowProps) {
  const {
    lang,
    words: { fileList: words },
  } = kit.useWords();
  const loading = kit.useComponentState() === "loading";
  const { format, size, pages, status } = fileCopy(row, showPages, lang);
  const ready = row.status === "ready";
  const controls = FileControls(row.name, ready, removable, loading, words);
  const preview = (
    <kit.KitRow
      part={loading ? null : "root"}
      label={row.name}
      inline
      density={density}
      surface="plain"
      {...(!loading && ready && (row.goto ? { goto: row.goto } : { role: "button" as const }))}
      leading={<kit.KitTrail kind="badge" tone="muted" part="format" value={format} density={density} />}
    >
      {loading ? (
        <kit.KitSkeleton
          shape="figure"
          inset="none"
          density={density}
          content={[
            ["body", row.name],
            ["caption", size],
          ]}
        />
      ) : (
        <>
          <kit.KitText part="name" density={density} lines={2}>
            {row.name}
          </kit.KitText>
          <FileMetadata {...{ size, pages, status, density, cards }} missing={row.status === "missing"} />
        </>
      )}
    </kit.KitRow>
  );
  return (
    <kit.KitRow
      item={row.id}
      part={null}
      label={row.name}
      density={density}
      lineRole="heading"
      trailing={controls}
    >
      {preview}
    </kit.KitRow>
  );
}

function FileControls(
  name: string,
  ready: boolean,
  removable: boolean,
  loading: boolean,
  words: c.Words["fileList"],
) {
  return (
    (ready || removable) && (
      <>
        {ready &&
          (loading ? (
            <kit.KitSkeleton shape="control" kind="quiet" />
          ) : (
            <kit.KitAction part="download" icon="download" kind="quiet" a11y={words.download(name)} />
          ))}
        {removable &&
          (loading ? (
            <kit.KitSkeleton shape="control" kind="quiet" />
          ) : (
            <kit.KitAction part="remove" icon="close" kind="quiet" a11y={words.remove(name)} />
          ))}
      </>
    )
  );
}

function FileMetadata({
  size,
  pages,
  status,
  density,
  cards,
  missing,
}: {
  size: string;
  pages: string | undefined;
  status: string;
  density: c.ThemeDensity;
  cards: boolean;
  missing: boolean;
}) {
  const {
    words: { fileList: words },
  } = kit.useWords();
  const tone = missing ? "bad" : "muted";
  if (cards && pages)
    return (
      <kit.KitTrack part="metadata">
        <kit.KitTrail kind="value" tone="muted" part="size" value={size} density={density} />
        <kit.KitTrail kind="badge" tone="muted" part="pages" value={pages} density={density} />
        {status && <kit.KitTrail kind="value" tone={tone} part="status" value={status} density={density} />}
      </kit.KitTrack>
    );
  return (
    <kit.KitText part={null} role="caption" tone="muted" density={density}>
      <kit.KitText part="size" role="caption" tone="muted" density={density}>
        {size}
      </kit.KitText>
      {pages && (
        <>
          {words.separator}
          <kit.KitText part="pages" role="caption" tone="muted" density={density}>
            {pages}
          </kit.KitText>
        </>
      )}
      {status && (
        <>
          {words.separator}
          <kit.KitText part="status" role="caption" tone={tone} density={density}>
            {status}
          </kit.KitText>
        </>
      )}
    </kit.KitText>
  );
}

export function FileList(input: FileListProps) {
  const state = kit.useComponentState();
  const {
    words: { fileList: words },
  } = kit.useWords();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const cards = input.style === "cards";
  return (
    <kit.KitCard
      part="root"
      style={cards && (state === "filled" || state === "loading") ? "cards" : "inset"}
      density={density}
    >
      {state === "empty" || state === "error" ? (
        <kit.KitEmpty
          icon={state === "empty" ? "paperclip" : "alert"}
          part="message"
          {...(state === "error" && { title: words.error })}
          decorativeIcon
        />
      ) : (
        <kit.KitGrid arrange="rows" list listRowGap={cards ? "cards" : "group"} density={density}>
          {input.files.map((row) => (
            <FileRow
              key={row.id}
              row={row}
              density={density}
              cards={cards}
              removable={input.removable}
              showPages={input.detail === "full"}
            />
          ))}
        </kit.KitGrid>
      )}
    </kit.KitCard>
  );
}
