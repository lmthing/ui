import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { highlightQuote } from "../copy";
import { mediaWordsFor } from "../lang";

// Core first: List/default cannot show long quoted passages with source moments and separate notes.
export const meta = {
  id: "Highlights",
  status: "ready",
  group: "content",
  purpose: "Revisit saved passages and clips at their original source.",
  pick: "Saved quotes or clip moments with a source, optional time and optional personal note, opening where they came from. Not original journal entries (Entries), whole saved titles (Library), or short tappable rows (List).",
  writeHints: [
    "Put the excerpt in text without surrounding quotation marks, the source title in from, and a clip time in at. Set goto to the screen for that source moment.",
    'Write the exact note in note. Use "detail":null for normal excerpts with visible notes. Only when the person explicitly asks to hide notes, write "detail":"brief" unless another axis was requested.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The saved excerpts live on the device.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["note"] } },
  parts: ["root", "empty"],
  items: { key: "items", parts: ["root", "text", "from", "at", "note"] },
  states: ["filled", "empty"],
  actions: { items: { root: ["press"] } },
  read: (input, state, lang): string[] =>
    state === "filled"
      ? (input as z.output<typeof props>).items.map(({ text }) => highlightQuote(text, lang))
      : [],
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    items: z
      .array(
        z.strictObject({
          text: c.text(240),
          from: c.text(36),
          at: c.text(12).optional(),
          note: c.text(120).optional(),
          goto: c.screenId,
        }),
      )
      .min(1)
      .max(6),
  })
  .overwrite((value) =>
    value.detail === "brief"
      ? { ...value, items: value.items.map((item) => ({ ...item, note: undefined })) }
      : value,
  );

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3);
  return {
    items: (items.length ? items : [undefined]).map((item, i) => ({
      text: (item && c.detailOf(item, 240, thing)) || c.wordsFor(lang).placeholderDetail,
      from: (item && c.titleOf(item, 36, thing)) || c.placeholderTitle(i, lang),
      goto: "details",
    })),
  };
}

export const examples = [
  {
    items: [
      {
        text: "Check the soil before watering.",
        from: "Life on the Fern Shelf",
        at: "04:32",
        note: "Try the finger test.",
        goto: "fern_watering",
      },
    ],
  },
  {
    items: [
      {
        text: "Give them a little extra time at the gate and let them decide where to sniff first.",
        from: "The Slow Walk",
        goto: "sniff_break",
      },
      {
        text: "A chat, not a contest.",
        from: "Before the first walk",
        at: "02:14",
        goto: "before_the_walk",
      },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Highlights");
export const probes = [
  choose(
    "Gather the exact passages and clip moments I saved, with the source and my notes, so I can reopen any quote at its original spot",
  ),
  choose(
    "Show three bookmarked websites in simple tappable rows, each with a name and one short description, no quotes or clip times",
    "List",
  ),
  write(
    'Show my saved passage "Water only after checking how the soil feels" from Life on the Fern Shelf at 04:32. Show my note "Try the finger test on the kitchen fern" below the passage. Open fern_watering.',
  ),
  {
    ...write(
      'Save the quote "A loose lead is a conversation, not a contest" from Before the first walk at 02:14, opening before_the_walk. Keep my note "Give them time to sniff" but hide it from view. That is the only display change; do not pick a card treatment or spacing for me.',
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the source of the passage about checking the soil before watering", {
    address: "h1/r1",
    action: "press",
  }),
] satisfies c.Probe[];

type HighlightsProps = c.Props<typeof props, typeof meta>;
type HighlightItem = HighlightsProps["items"][number];

function HighlightSource({ item, density }: { item: HighlightItem; density: c.ThemeDensity }) {
  const source = (
    <kit.KitText part="from" role="label" tone="accent" {...{ density }}>
      {item.from}
    </kit.KitText>
  );
  const attribution = item.at ? (
    <kit.KitGrid fitLast {...{ density }}>
      {source}
      <kit.KitText part="at" role="label" tone="muted" tabular {...{ density }}>
        {item.at}
      </kit.KitText>
    </kit.KitGrid>
  ) : (
    source
  );
  return (
    <kit.KitGrid fitLast {...{ density }}>
      {attribution}
      <kit.KitIcon name="chevron_right" tone="accent" scale="sm" decorative />
    </kit.KitGrid>
  );
}

function HighlightRow({
  item,
  density,
  surface,
}: {
  item: HighlightItem;
  density: c.ThemeDensity;
  surface: c.SurfaceFinish;
}) {
  const { lang } = kit.useWords(mediaWordsFor);
  return (
    <kit.KitRow item={item.id} part="root" label={item.from} goto={item.goto} {...{ density, surface }}>
      <kit.KitContent lineRole="body" {...{ density }}>
        <kit.KitText part="text" role="body" {...{ density }}>
          {highlightQuote(item.text, lang)}
        </kit.KitText>
        {item.note && (
          <kit.KitText part="note" role="label" tone="muted" {...{ density }}>
            {item.note}
          </kit.KitText>
        )}
        <kit.KitContent group="response" {...{ density }}>
          <HighlightSource {...{ item, density }} />
        </kit.KitContent>
      </kit.KitContent>
    </kit.KitRow>
  );
}

export function Highlights(input: HighlightsProps) {
  const { items } = input;
  const surface = "card";
  const state = kit.useComponentState();
  const density = kit.useKit().density;
  if (state === "empty")
    return (
      <kit.KitCard part="root" {...{ density, surface }}>
        <kit.KitEmpty part="empty" icon="bookmark" decorativeIcon />
      </kit.KitCard>
    );
  return (
    <kit.KitCard part="root" style="cards" {...{ density }}>
      <kit.KitGrid list arrange="rows" listRowGap="cards" {...{ density }}>
        {items.map((item) => (
          <HighlightRow key={item.id} {...{ item, density, surface }} />
        ))}
      </kit.KitGrid>
    </kit.KitCard>
  );
}
