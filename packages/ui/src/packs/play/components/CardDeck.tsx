import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { cardDeckCopy, type DeckCard } from "../copy";
import { playWordsFor } from "../lang";

// Core first: SwipeStack/default sorts cards by keep or skip, not random finite draws and reshuffles.
export const meta = {
  id: "CardDeck",
  status: "ready",
  group: "action",
  purpose: "Draw cards at random without replacement and reshuffle the discards when needed.",
  pick: "Randomly draw one to three cards without replacement from a finite deck. Not keep-or-skip sorting (SwipeStack), a spinner with repeats (Spinner), or host-read questions (Trivia).",
  writeHints: [
    "Write the authored deck and draw size. Never write shuffle order, current draws, or pile counts.",
    'For a brief deck summary (show how many cards remain and hide the discard count), write {"detail":"brief","density":null,"surface":null}. Null detail keeps both counts visible.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Device entropy drives the local draw and discard piles; outcomes persist on one phone.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["discard"] } },
  parts: ["root", "title", "remaining", "discard", "card", "card_1", "card_2", "card_3", "draw", "reshuffle"],
  states: ["empty", "filled", "loading", "success"],
  actions: { parts: { draw: ["press"], reshuffle: ["press"] } },
  confirmParts: ["reshuffle"],
  emptyActions: ["draw.press"],
  successActions: ["reshuffle.press"],
  draw: { kind: "deck", pool: "cards", count: "drawCount", press: "draw", reset: "reshuffle" },
  readInState: (_input, state) => state === "empty",
  read: (input, state, lang, _data, _currency, get): string[] => {
    const setup = input as z.output<typeof props>;
    const deck = cardDeckCopy(setup.cards, c.drawState(meta, setup, get ?? (() => undefined)), lang);
    const words = playWordsFor(lang).cardDeck;
    return [
      deck.remaining,
      ...(setup.detail === "brief" ? [] : [deck.discarded]),
      ...(state === "empty" ? [words.ready] : []),
      ...(deck.exhausted ? [words.exhausted] : []),
      ...deck.revealed.flatMap(({ title, tag, body }) => [
        title,
        ...(tag ? [tag] : []),
        ...(body ? [body] : []),
      ]),
      ...(deck.exhausted ? [] : [words.draw]),
      ...(deck.hasDiscards ? [words.reshuffle] : []),
    ];
  },
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  title: c.text(32),
  cards: z
    .array(
      z.strictObject({
        title: c.text(36),
        body: c.text(160).optional(),
        tag: c.text(16).optional(),
      }),
    )
    .min(6)
    .max(30),
  drawCount: z.int().min(1).max(3).default(1),
  style: z.enum(["stack", "fan"]).default("stack"),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const cards: z.input<typeof props>["cards"] = c.itemsOf(cast, 6).map((item, i) => {
    const body = c.detailOf(item, 160, thing);
    return { title: c.titleOf(item, 36, thing) ?? c.placeholderTitle(i, lang), ...(body ? { body } : {}) };
  });
  while (cards.length < 6) cards.push({ title: c.placeholderTitle(cards.length, lang) });
  return { title: c.clip(thing?.type.trim() ?? "", 32) || c.wordsFor(lang).placeholderLabel, cards };
}

const gardenDeck = {
  title: "Garden challenge deck",
  cards: [
    { title: "Check the fern", body: "Feel the soil before you water.", tag: "Care" },
    { title: "Look for roots" },
    { title: "Find a new leaf", body: "Look for a bright green tip near the top.", tag: "Growth" },
    ...["Turn a pot", "Name a seed", "Find a shaded spot"].map((title) => ({ title })),
  ],
};

export const examples = [
  gardenDeck,
  {
    title: "Walk break deck",
    drawCount: 3,
    style: "fan",
    cards: ["Name a route", "Take a water break", "Explore", "Rest", "Fetch", "Name a dog trick"].map(
      (title) => ({ title }),
    ),
  },
  { ...gardenDeck, detail: "brief" },
  { ...gardenDeck, density: "compact" },
  { ...gardenDeck, surface: "outlined" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("CardDeck");
export const probes = [
  choose(
    "Draw three prompt cards per tap from my shuffled deck and never repeat a card until I reshuffle the discards.",
  ),
  choose("Show these cards in order so I can swipe each one to keep it or skip it.", "SwipeStack"),
  {
    ...write(
      "Make a finite shuffled Walk break deck. Draw without replacement, two cards at a time: Name a route, Take a water break, Find a shady loop, Spot a bench, Pick a park, Name a dog trick.",
    ),
    expectProps: { drawCount: 2 },
  },
  {
    ...write(
      "Make a shuffled Garden challenge deck that draws without replacement. Use these cards: Find a leaf, Name a seed, Check the soil, Spot a fern, Turn a pot, Look for roots. Keep the deck summary brief: show how many cards remain, but hide the discard count.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Draw cards without putting them back", { address: "c1/draw", action: "press" }),
] satisfies c.Probe[];

type Setup = c.Props<typeof props, typeof meta>;
type DeckCopy = ReturnType<typeof cardDeckCopy>;
type Density = NonNullable<Setup["density"]>;

function CardFace({ card, density }: { card: DeckCard; density: Density }) {
  return (
    <kit.KitMetaLine
      title={{ text: card.title, role: "title", strong: true }}
      meta={[
        { text: card.tag, role: "caption" },
        { text: card.body, role: "body", tone: "text" },
      ]}
      density={density}
    />
  );
}

function DeckFaces({
  cards,
  style,
  density,
  ready,
}: {
  cards: readonly DeckCard[];
  style: Setup["style"];
  density: Density;
  ready: string;
}) {
  const loading = kit.useComponentState() === "loading";
  if (loading || !cards.length)
    return (
      <kit.KitCard style="plain" part="card" padded density={density} align="center">
        <kit.KitIcon name="file_text" scale="lg" decorative loading={loading} />
        <kit.KitLayoutText
          line={{ text: ready, role: "body", tone: "muted" }}
          align="center"
          density={density}
        />
      </kit.KitCard>
    );
  const fan = style === "fan" && cards.length > 1;
  const faces = cards.map((card, index) => <CardFace key={index} {...{ card, density }} />);
  if (fan)
    return (
      <kit.KitCard part="card" surface="outlined" padded density={density}>
        <kit.KitGrid columns={faces.length === 3 ? 3 : 2} density={density} list>
          {faces.map((face, index) => (
            <kit.KitCard key={index} part={`card_${index + 1}`} style="plain" density={density}>
              {face}
            </kit.KitCard>
          ))}
        </kit.KitGrid>
      </kit.KitCard>
    );
  return (
    <kit.KitCard part="card" surface="outlined" padded density={density}>
      <kit.KitRowGroup density={density} spacing="groups">
        {faces}
      </kit.KitRowGroup>
    </kit.KitCard>
  );
}

function Pile({
  label,
  value,
  part,
  density,
}: {
  label: string;
  value: string;
  part: string;
  density: Density;
}) {
  const loading = kit.useComponentState() === "loading";
  return (
    <kit.KitRow part={loading ? null : part} label={label} density={density} inline fitContent>
      <kit.KitGrid fitLast density={density}>
        <kit.KitLayoutText line={{ text: label, role: "caption", tone: "muted" }} density={density} />
        <kit.KitLayoutText
          line={{ text: value, role: "figure", compact: true, tabular: true }}
          align="end"
          density={density}
        />
      </kit.KitGrid>
    </kit.KitRow>
  );
}

function DeckContent({ setup, deck, density }: { setup: Setup; deck: DeckCopy; density: Density }) {
  const { lang, words } = kit.useWords(playWordsFor);
  const { thing } = kit.usePartContext();
  const labels = words.cardDeck;
  const loading = kit.useComponentState() === "loading";
  const drawn = deck.revealed.length > 0;
  return (
    <>
      <kit.KitHeader
        title={{ text: setup.title, part: "title", ...(drawn && { role: "caption", tone: "muted" }) }}
        density={density}
      />
      <kit.KitRowGroup density={density} separators={false}>
        <Pile label={labels.remaining("")} value={deck.remainingValue} part="remaining" density={density} />
        {setup.detail !== "brief" && (
          <Pile label={labels.discarded("")} value={deck.discardedValue} part="discard" density={density} />
        )}
      </kit.KitRowGroup>
      <DeckFaces
        cards={loading ? [] : deck.revealed}
        style={setup.style}
        density={density}
        ready={thing ? c.emptyLine(thing, lang) : labels.ready}
      />
      <kit.KitActionFooter density={density}>
        {!deck.exhausted && (
          <kit.KitAction
            part={loading ? null : "draw"}
            action="press"
            label={labels.draw}
            kind={drawn ? "secondary" : "primary"}
          />
        )}
        {deck.hasDiscards && (
          <kit.KitAction
            part={loading ? null : "reshuffle"}
            action="press"
            label={labels.reshuffle}
            kind="danger"
          />
        )}
      </kit.KitActionFooter>
    </>
  );
}

export function CardDeck(setup: Setup) {
  const { screen, component } = kit.usePartContext();
  const state = kit.useComponentState();
  const { lang, words } = kit.useWords(playWordsFor);
  const density = kit.useVariant("density", meta.variants.density, setup.density);
  const stored = kit.useControlValue<unknown>(`${screen}/${component}/${c.drawKey}`, undefined);
  const deck = cardDeckCopy(
    setup.cards,
    c.drawState(meta, setup, () => stored),
    lang,
  );
  const content = <DeckContent {...{ setup, deck, density }} />;
  return (
    <kit.KitCard part="root" padded density={density} surface={setup.surface}>
      {state === "loading" ? (
        <kit.KitState density={density} loading={content} />
      ) : deck.exhausted && state === "success" ? (
        <kit.KitState density={density} retain message={words.cardDeck.exhausted}>
          {content}
        </kit.KitState>
      ) : (
        content
      )}
    </kit.KitCard>
  );
}
