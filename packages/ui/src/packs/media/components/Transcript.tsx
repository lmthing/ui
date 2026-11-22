import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { activeTranscriptIndex, transcriptLineIdentity, transcriptReading } from "../copy";
import { mediaWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Transcript.generated";

// Core first: Article/article can show static text but cannot follow a playhead, seek per line, or clip timed lines.
const player = { component: "Player", part: "scrubber" } as const;

export const meta = {
  id: "Transcript",
  status: "draft",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath:
    "Timed captions come from the recording or its media host; the device stores saved lines for Highlights.",
  drives: {
    commands: [{ scope: "item", part: "root", to: player, action: "seek", payload: { from: "at" } }],
    observe: { from: player, at: "playhead" },
  },
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["at"] } },
  parts: ["root", "title", "follow", "lines", "empty"],
  items: { key: "lines", parts: ["root", "at", "speaker", "text", "save"] },
  states: ["filled", "empty", "loading"],
  actions: { parts: { follow: ["toggle"] }, items: { root: ["press"], save: ["press"] } },
  hostCommands: {
    identity: ({ row }) => row && transcriptLineIdentity(row),
    items: {
      "save.press": {
        kind: "command",
        name: "highlights.saveLine",
        input: ({ row }) =>
          typeof row?.at === "number" && typeof row.text === "string"
            ? {
                at: row.at,
                text: row.text,
                ...(typeof row.speaker === "string" ? { speaker: row.speaker } : {}),
              }
            : undefined,
      },
    },
  },
  live: { toggles: { follow: { prop: "follow", initial: true } } },
  read: (value, state, lang) =>
    state === "filled" ? transcriptReading(value as Parameters<typeof transcriptReading>[0], lang) : [],
} as const satisfies c.Meta;

const maxLines = 40;
const maxText = 160;
const line = z.strictObject({
  at: z.int().min(0).max(36000),
  speaker: c.text(20).optional(),
  text: c.text(maxText),
});

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    lines: z.array(line).min(2).max(maxLines),
    current: z
      .int()
      .min(0)
      .max(maxLines - 1)
      .optional(),
    follow: z.boolean().default(true),
    style: z.enum(["lyrics", "spoken"]).default("lyrics"),
  })
  .refine(({ lines }) => lines.every(({ at }, i) => !i || at > lines[i - 1]!.at), { path: ["lines"] })
  .refine(({ lines, current }) => current === undefined || current < lines.length, { path: ["current"] });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3);
  return {
    lines: Array.from({ length: Math.max(2, items.length) }, (_, i) => {
      const item = items[i];
      return { at: i * 4, text: (item && c.titleOf(item, maxText, thing)) || c.placeholderTitle(i, lang) };
    }),
  };
}

export const examples = [
  {
    lines: [
      { at: 0, text: "Little fern by the window" },
      { at: 4, text: "Unroll into the morning light" },
      { at: 8, text: "Leave a little room to grow" },
    ],
    current: 1,
  },
  {
    style: "spoken",
    follow: false,
    current: 0,
    lines: [
      { at: 0, speaker: "Maya", text: "Give Clover time to sniff at the gate." },
      { at: 5, speaker: "Jo", text: "Wait for her to look back." },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Transcript");
export const probes = [
  choose(
    "Show the exact words next to my podcast audio, highlighting them line by line and jumping when I tap",
  ),
  choose(
    "Publish the entire essay for me to read, with headings and paragraphs but no audio or timing",
    "Article",
  ),
  {
    ...write(
      'Show lyrics timed to the recording: at 0 seconds "Little fern by the window"; at 4 seconds "Unroll into the morning light".',
    ),
    expectProps: { lines: examples[0]!.lines.slice(0, 2) },
  },
  {
    ...write(
      'Below the player, show timed lyrics: at 0 seconds "Little fern by the window", at 4 seconds "Unroll into the morning light". Hide the visible timestamps but keep the words synced and tappable. Do not change any other display setting.',
    ),
    variant: { axis: "detail", value: "brief" },
  },
  {
    ...read("Jump the recording to the line about growing", { address: "t1/r3", action: "press" }),
    siblings: [{ id: "p1", c: "Player", title: "Little fern", media: "lib:little_fern", seconds: 30 }],
  },
] satisfies c.Probe[];

type TranscriptProps = c.Props<typeof props, typeof meta>;
type Layout = Pick<TranscriptProps, "style" | "detail"> & { density: c.ThemeDensity; showsHours: boolean };
type Line = TranscriptProps["lines"][number];
const hourInSeconds = 3600;

function SaveLine({ line, status }: { line: Line; status: c.HostOperation["status"] | undefined }) {
  const { controller } = kit.useKit();
  const {
    words: { transcript: words },
  } = kit.useWords(mediaWordsFor);
  const label =
    status === "accepted"
      ? words.saved
      : status === "rejected"
        ? words.retrySave
        : status === "pending"
          ? words.saving
          : words.save;
  return (
    <kit.KitAction
      part="save"
      kind="quiet"
      action="press"
      contentParts={{}}
      disabled={!controller}
      icon={status === "accepted" ? "check" : "bookmark"}
      a11y={label(line.text)}
    />
  );
}

// prettier-ignore
function TranscriptRow({
  line,
  active,
  density,
  style,
  detail,
  showsHours,
  status,
}: Layout & {
  line: Line;
  active: boolean;
  status: c.HostOperation["status"] | undefined;
}) {
  const { screen, component } = kit.usePartContext();
  const { controller } = kit.useKit();
  const {
    lang,
    words: { transcript: words },
  } = kit.useWords(mediaWordsFor);
  const loading = kit.useComponentState() === "loading";
  const spoken = style === "spoken",
    align = spoken ? "start" : "center";
  const time = c.clockLine(line.at, lang);
  const seek = controller?.canPress(`${screen}/${component}/${line.id}/root`) === true;
  const label = words.line(time, line.speaker, line.text, active);
  const clock = detail !== "full" ? undefined : showsHours && !loading ? (
    <kit.KitTime part="at" value={time} />
  ) : (
    <kit.KitLayoutText density={density} align="end"
      line={{ text: time, part: "at", role: "meta", tone: "muted", tabular: true }} />
  );
  const speaker = line.speaker
    ? { text: line.speaker, part: "speaker", role: "meta" as const, tone: "muted" as const }
    : undefined;
  const save = loading ? <kit.KitAction icon="bookmark" part={null} kind="quiet" /> : <SaveLine {...{ line, status }} />;
  return (
    <kit.KitRow item={line.id} part={null} role="text" {...{ label, density }} inset="none" inline>
      <kit.KitGrid fitLast density={density}>
        <kit.KitRow part={loading ? null : "root"} role={seek && !loading ? "button" : "text"}
          label={label} density={spoken ? density : "comfortable"} selected={active && !loading}
          inset={spoken ? "md" : "none"}
          leading={spoken ? clock : undefined} leadingWidth={spoken && clock && !showsHours ? "avatar" : undefined}>
          <kit.KitContent {...{ density, align }} lineRole="body" rhythm="flush">
            {speaker && <kit.KitLayoutText {...{ density, align }} line={speaker} />}
            <kit.KitLayoutText {...{ density, align }} line={{
              text: line.text, part: "text", strong: active && spoken,
              ...(active && !spoken ? { tone: "accent" as const } : {}),
            }} />
          </kit.KitContent>
        </kit.KitRow>
        {spoken || !clock ? save : <kit.KitContent lead={clock} leadingAlign="row" density={density}>{save}</kit.KitContent>}
      </kit.KitGrid>
    </kit.KitRow>
  );
}

// prettier-ignore
export function Transcript(input: TranscriptProps) {
  const { screen, component, state } = kit.usePartContext();
  const {
    words: { transcript: words },
  } = kit.useWords(mediaWordsFor);
  const { style, detail, surface, lines } = input;
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const live = kit.useLiveControls(meta, input);
  const operations = kit.useHostOperations();
  const active = activeTranscriptIndex({
    lines,
    current: input.current,
    playhead: typeof live.playhead === "number" ? live.playhead : undefined,
  });
  const item = lines[active]?.id;
  const follow = live.follow === true;
  const loading = state === "loading";
  const showsHours = lines.some(({ at }) => at >= hourInSeconds);
  const content = (
    <>
      <kit.KitGrid fitLast density={density}>
        <kit.KitHeader density={density} title={{ text: words.label, part: "title" }} />
        <kit.KitRow inset="none" inline label={words.follow} density={density}
          trailing={<kit.KitTrail kind="toggle" part="follow" label={words.follow} on={follow} />}>
          <kit.KitLayoutText density={density} line={{ text: words.follow, role: "meta", tone: "muted" }} />
        </kit.KitRow>
      </kit.KitGrid>
      <kit.KitScroll part="lines" label={words.label} bounded={!loading} follow={{
        enabled: follow && !loading,
        address: item ? c.formatAddress({ screen, component, item, part: "root" }) : undefined,
      }}>
        <kit.KitRowGroup density={density} separators={false}>
          {(loading ? lines.slice(0, 3) : lines).map((line, index) => (
            <TranscriptRow key={line.id} {...{ line, density, style, detail, showsHours }} active={index === active}
              status={operations.find(({ row }) => row === line.id)?.status} />
          ))}
        </kit.KitRowGroup>
      </kit.KitScroll>
    </>
  );
  return (
    <kit.KitCard part="root" padded {...{ density, surface }}>
      <kit.KitState part="empty" density={density} message={words.empty} icon="file_text" loading={content}>
        {content}
      </kit.KitState>
    </kit.KitCard>
  );
}
