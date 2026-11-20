import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { cardsLeft } from "../copy";
import { learningWordsFor } from "../lang";

// Core first: SwipeStack/default cannot reveal a back face and rate recall for spaced review.
export const meta = {
  id: "Flashcard",
  status: "ready",
  group: "input",
  purpose: "Recall an answer, reveal it and rate how well you remembered it.",
  pick: "Recall from a prompt, flip to reveal its answer, then rate recall to schedule the next review. Not checked answers (Quiz) or swiping to keep or skip things (SwipeStack).",
  writeHints: [
    "Write only seed cards. Do not write cards left, flipped state or review dates.",
    'A request for a full-width photo sets only media: "cover"; set surface, align and density to null unless each is requested. Use null for any other unrequested axis and do not copy hints from examples.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Cards and their review dates are stored on the device.",
  variants: {
    surface: ["card", "outlined"],
    align: ["center", "start"],
    density: ["comfortable", "compact"],
    media: ["thumb", "cover"],
  },
  // prettier-ignore
  parts: ["root", "card", "front", "back", "hint", "photo", "left", "again", "hard", "good", "easy", "message"],
  states: ["filled", "empty", "success", "loading"],
  session: {
    kind: "rounds",
    items: "cards",
    hidden: ["back"],
    front: ["front", "hint", "photo"],
    reveal: "card",
    ratings: ["again", "hard", "good", "easy"],
  },
  actions: {
    parts: { card: ["flip"], again: ["press"], hard: ["press"], good: ["press"], easy: ["press"] },
    // prettier-ignore
    when: { again: { flipped: true }, hard: { flipped: true }, good: { flipped: true }, easy: { flipped: true } },
  },
  read: (input, state, lang): string[] => {
    const current = (input as { [c.sessionKey]?: c.SessionState })[c.sessionKey];
    if (state === "success") return [learningWordsFor(lang).flashcard.complete];
    if (current?.kind !== "rounds" || !current.recall) return [];
    return [cardsLeft(current.recall.remaining, lang)];
  },
} as const satisfies c.Meta;

// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  cards: z.array(z.strictObject({
    front: c.text(80), back: c.text(160), hint: c.text(60).optional(), photo: c.photo.optional(),
  })).min(2).max(6),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 6);
  return {
    cards: Array.from({ length: Math.max(2, items.length) }, (_, index) => {
      const item = items[index];
      return {
        front: (item && c.titleOf(item, 80, thing)) ?? c.placeholderTitle(index, lang),
        back: (item && c.detailOf(item, 160, thing)) ?? c.wordsFor(lang).placeholderDetail,
      };
    }),
  };
}

export const examples = [
  {
    cards: [
      {
        front: "Light for ferns?",
        back: "Bright, indirect light",
        hint: "Think of a shaded forest floor",
        photo: "lib:plants",
      },
      { front: "What do roots take up?", back: "Water and minerals from the soil" },
    ],
  },
  {
    cards: [
      { front: "Dog walk kit?", back: "Water, a bowl and waste bags" },
      {
        front: "When the lead goes tight, what comes next?",
        back: "Pause, then continue when the lead relaxes",
      },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Flashcard");
export const probes = [
  choose(
    "Show me a prompt, let me turn it over to see the answer, then rate my recall so I see it again at the right interval.",
  ),
  choose(
    "Let me swipe left or right to keep or skip each candidate shown one at a time. Nothing to reveal.",
    "SwipeStack",
  ),
  write("Make recall cards for 水 → mizu, water (hint: something you drink) and 山 → yama, mountain."),
  {
    ...write(
      "Make two recall cards: What light suits ferns? → Bright indirect light; What do roots absorb? → Water and minerals. Put a full-width plant photo on the front of each card, not a thumbnail.",
    ),
    variant: { axis: "media", value: "cover" },
  },
  read("Flip the current card to see its answer.", { address: "f1/card", action: "flip" }),
] satisfies c.Probe[];

type FlashcardProps = c.Props<typeof props, typeof meta>;
type Finish = Pick<FlashcardProps, "align" | "density" | "media">;
type Face = Partial<FlashcardProps["cards"][number]>;

// prettier-ignore
function CardFront({ card, align, density, media }: Finish & { card: Face }) {
  const { KitContent, KitGrid, KitPhoto, KitText } = kit;
  const photo = card.photo ? (
    <KitPhoto part="photo" photo={card.photo} shape={media === "cover" ? "wide" : align === "center" ? "avatar" : "thumb"} />
  ) : null;
  const prompt = <KitContent align={align} density={density}>
    <KitText part="front" role="title" {...{ align, density }}>{card.front}</KitText>
    {card.hint && <KitText part="hint" role="label" tone="muted" align={align}>{card.hint}</KitText>}
  </KitContent>;
  if (align === "center") return <>{photo}{prompt}</>;
  return <>{media === "cover" && photo}<KitGrid fitLast density={density}>{prompt}{media === "thumb" && photo}</KitGrid></>;
}

// prettier-ignore
function LoadingFront({ card, finish, reveal }: { card: Face; finish: Finish; reveal: string }) {
  const { KitContent, KitSkeleton } = kit;
  const { align, density, media } = finish;
  return <>
    {card.photo && (media === "cover" ?
      <KitSkeleton shape="media" aspect="wide" inset="none" content={[]} /> :
      <KitSkeleton shape="media" aspect="avatar" inset="none" content={[]} />)}
    <KitSkeleton shape="figure" inset="none" density={density} content={[["title", card.front, align], ["label", card.hint, align]]} />
    <KitContent group="response"><KitSkeleton shape="figure" inset="none" content={[["label", reveal, align]]} /></KitContent>
  </>;
}
// prettier-ignore
type ActiveCard = { card: Face; finish: Finish; flipped: boolean; loading: boolean; remaining: number };
// prettier-ignore
function ReviewCard({ card, finish, flipped, loading, remaining }: ActiveCard) {
  const { KitContent, KitFlip, KitText, KitAction, KitGrid, KitSkeleton } = kit;
  const { lang, words: { flashcard: words } } = kit.useWords(learningWordsFor);
  const { align, density } = finish, left = cardsLeft(remaining, lang);
  return <>
    <KitContent inset={align === "start" ? "md" : "none"}>
      {loading ? <KitSkeleton shape="figure" inset="none" content={[["number", left, align, "compact"]]} /> :
        <KitText part="left" role="number" numberScale="compact" tone="muted" align={align}>{left}</KitText>}
    </KitContent>
    <KitFlip
      part={flipped || loading ? "card" : null} target={{ part: flipped || loading ? null : "card" }}
      label={words.reveal} align={align} flipped={flipped && !loading}
      front={loading ? <LoadingFront {...{ card, finish }} reveal={words.reveal} /> : card.front && <CardFront card={card} {...finish} />}
      back={<KitText part="back" role="title" {...{ align, density }}>{card.back}</KitText>}
    />
    {flipped && !loading && <KitGrid density={density}>
      {meta.session.ratings.map((part) => <KitAction key={part} part={part} kind="secondary" full label={words[part]} />)}
    </KitGrid>}
  </>;
}

// prettier-ignore
export function Flashcard(input: FlashcardProps) {
  const { KitCard, KitEmpty } = kit;
  const { screen, component } = kit.usePartContext();
  const state = kit.useComponentState();
  const { words: { flashcard: words } } = kit.useWords(learningWordsFor);
  const { align, density, media, surface } = meta.variants;
  const finish = {
    align: kit.useVariant("align", align, input.align),
    density: kit.useVariant("density", density, input.density),
    media: kit.useVariant("media", media, input.media),
  };
  const frame = kit.useVariant("surface", surface, input.surface);
  const stored = kit.useControlValue<unknown>(`${screen}/${component}/${c.sessionKey}`, undefined);
  const current = c.sessionState(meta, input, () => stored);
  const recall = current?.kind === "rounds" ? current.recall : undefined;
  const card = current?.kind === "rounds" ? (current.item as Face) : undefined;
  const flipped = current?.kind === "rounds" && current.revealed;
  const complete = state === "success" || (current?.kind === "rounds" && current.complete);
  const loading = state === "loading";
  const inactive = complete || state === "empty" || !card || !recall;
  return <KitCard part="root" surface={!inactive && frame === "card" ? "plain" : frame} padded density={finish.density}>
    {inactive ?
      <KitEmpty part="message" decorativeIcon icon={complete ? "check" : "sparkles"}
        tone={complete ? "good" : "neutral"} {...(complete ? { title: words.complete } : {})} /> :
      <ReviewCard {...{ card, finish, flipped, loading }} remaining={recall.remaining} />}
  </KitCard>;
}
