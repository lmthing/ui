import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { cardsLeft, learningAudio, promptPlayback, readFlashcard } from "../copy";
import { learningWordsFor } from "../lang";
import { PromptAudio } from "../prompt-audio";

// Core first: SwipeStack/default cannot reveal a back face and rate recall for spaced review.
// prettier-ignore
export const meta = {
  id: "Flashcard", status: "ready", group: "input",
  purpose: "Recall an answer, reveal it and rate how well you remembered it.",
  pick: "Recall from a prompt, flip to reveal its answer, then rate recall to schedule the next review. Not checked answers (Quiz) or swiping to keep or skip things (SwipeStack).",
  writeHints: [
    "Write only seed cards. Do not write cards left, flipped state or review dates.",
    'Use style "binary" for just Know and Still learning; otherwise omit style for the four ratings (srs). Put an explicitly supplied audio clip reference in audio on that card only.',
    'A request for a full-width photo sets only media: "cover"; set surface, align and density to null unless each is requested. Use null for any other unrequested axis and do not copy hints from examples.',
  ],
  region: "body", weight: 2, tier: "phone",
  realPath: "Cards and their review dates are stored on the device.",
  variants: { surface: ["card", "outlined"], align: ["center", "start"], density: ["comfortable", "compact"], media: ["thumb", "cover"] },
  parts: ["root", "card", "front", "back", "hint", "photo", "left", "again", "hard", "good", "easy", "message", "audio", "audio_status"],
  states: ["filled", "empty", "success", "loading"],
  emptyActions: [],
  media: { playback: promptPlayback },
  live: { derive: ({ cards }) => ({ hasAudio: (cards as { audio?: string }[]).some(({ audio }) => Boolean(audio)) }) },
  session: {
    kind: "rounds", items: "cards", hidden: ["back"], front: ["front", "hint", "photo"], reveal: "card",
    ratings: ["again", "hard", "good", "easy"],
  },
  actions: {
    parts: { card: ["flip"], again: ["press"], hard: ["press"], good: ["press"], easy: ["press"], audio: ["play", "pause"] },
    when: { again: { flipped: true }, hard: { flipped: true, style: "srs" }, good: { flipped: true },
      easy: { flipped: true, style: "srs" }, audio: { flipped: false, hasAudio: true } },
  },
  read: readFlashcard,
} as const satisfies c.Meta;

// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  style: z.enum(["srs", "binary"]).default("srs"),
  cards: z.array(z.strictObject({
    front: c.text(80), back: c.text(160), hint: c.text(60).optional(), photo: c.photo.optional(), audio: learningAudio.optional(),
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

// prettier-ignore
export const examples = [
  {
    cards: [
      { front: "Light for ferns?", back: "Bright, indirect light", hint: "Think of a shaded forest floor", photo: "lib:plants" },
      { front: "What do roots take up?", back: "Water and minerals from the soil" },
    ],
  },
  {
    style: "binary",
    cards: [
      { front: "Dog walk kit?", back: "Water, a bowl and waste bags", audio: "lib:walk_kit" },
      { front: "When the lead goes tight, what comes next?", back: "Pause, then continue when the lead relaxes" },
    ],
  },
  {
    style: "srs",
    cards: [
      { front: "When should I water?", back: "When the topsoil feels dry" },
      { front: "What protects the roots?", back: "Good drainage" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Flashcard");
// prettier-ignore
export const probes = [
  choose("Show me a prompt, let me turn it over to see the answer, then rate my recall so I see it again at the right interval."),
  choose("Let me swipe left or right to keep or skip each candidate shown one at a time. Nothing to reveal.", "SwipeStack"),
  write("Make recall cards for 水 → mizu, water (hint: something you drink) and 山 → yama, mountain."),
  {
    ...write("Make two recall cards: What light suits ferns? → Bright indirect light; What do roots absorb? → Water and minerals. Put a full-width plant photo on the front of each card, not a thumbnail."),
    variant: { axis: "media", value: "cover" },
  },
  {
    ...write("Make two recall cards, fern light → indirect and dry soil → water. After reveal give only Know and Still learning, not four ratings."),
    expectProps: { style: "binary" },
  },
  {
    ...write("Create exactly two recall cards, 水 → water and 山 → mountain. Put the supplied recording lib:mizu on the first card as playable audio, not a photo."),
    expectProps: { cards: [{ audio: "lib:mizu" }, {}] },
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
type ActiveCard = { card: Face; finish: Finish; flipped: boolean; loading: boolean; remaining: number; binary: boolean };
// prettier-ignore
function ReviewCard({ card, finish, flipped, loading, remaining, binary }: ActiveCard) {
  const { KitContent, KitFlip, KitText, KitAction, KitGrid, KitSkeleton, KitActionFooter } = kit;
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
    {!flipped && card.audio && <KitContent {...{ align, density }}><PromptAudio density={density} /></KitContent>}
    {flipped && !loading && (binary ? <KitContent {...{ align, density }}><KitActionFooter density={density}>
      <KitAction part="again" contentParts={{}} kind="danger" label={words.stillLearning} />
      <KitAction part="good" contentParts={{}} label={words.know} />
    </KitActionFooter></KitContent> : <KitGrid density={density}>
      {meta.session.ratings.map((part) => <KitAction key={part} part={part} kind="secondary" full label={words[part]} />)}
    </KitGrid>)}
  </>;
}

// prettier-ignore
export function Flashcard(input: FlashcardProps) {
  const { KitCard, KitEmpty, KitState } = kit;
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
  const review = !inactive && <ReviewCard {...{ card, finish, flipped, loading }} remaining={recall.remaining} binary={input.style === "binary"} />;
  return <KitCard part="root" surface={!inactive && frame === "card" ? "plain" : frame} padded density={finish.density}>
    {complete ? <KitEmpty part="message" decorativeIcon icon="check" tone="good" title={words.complete} /> :
      state === "empty" ? <KitState part="message" density={finish.density} icon="sparkles" message={words.empty} /> :
      <KitState density={finish.density} loading={review}>{review}</KitState>}
  </KitCard>;
}
