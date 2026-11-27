import { z } from "zod";
import {
  probesFor,
  detailOf,
  itemsOf,
  photo,
  placeholderTitle,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
  variantProps,
  wordsFor,
} from "../catalog";
import {
  KitCard,
  KitContent,
  KitEmpty,
  KitPhoto,
  KitSwipeStack,
  KitText,
  useComponentState,
  useKit,
  useWords,
} from "../kit";
import { prompt } from "../entry/prompt-SwipeStack.generated";

export const meta = {
  id: "SwipeStack",
  status: "ready",
  signature: "card_swipe",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  tier: "phone",
  realPath: "An ordered set of on-device records with a keep or skip decision stored for each.",
  variants: {
    detail: ["full", "brief"],
    media: ["cover", "none"],
  },
  variantParts: { "detail.brief": { hides: ["meta"] }, "media.none": { hides: ["photo"] } },
  items: { key: "cards", parts: ["root", "photo", "title", "meta"], visible: "first" },
  parts: ["root"],
  states: ["filled", "empty"],
  readInState: (_input, state) => state === "empty",
  read: (_input, state, lang) => (state === "empty" ? [wordsFor(lang).swipeStackEmpty] : []),
  actions: { items: { root: ["swipe"] }, when: { root: { $first: true } } },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    cards: z
      .array(
        z.strictObject({
          title: text(32),
          photo: photo.optional(),
          meta: text(24).optional(),
        }),
      )
      .min(2)
      .max(6),
  })
  .overwrite((value) =>
    value.detail === "brief" || value.media === "none"
      ? {
          ...value,
          cards: value.cards.map((card) => ({
            ...card,
            ...(value.detail === "brief" ? { meta: undefined } : {}),
            ...(value.media === "none" ? { photo: undefined } : {}),
          })),
        }
      : value,
  );

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const cards = itemsOf(cast, 6).flatMap((item) => {
    const title = titleOf(item, 32, thing);
    const detail = detailOf(item, 24, thing);
    return title ? [{ title, ...(detail ? { meta: detail } : {}) }] : [];
  });
  while (cards.length < 2) cards.push({ title: placeholderTitle(cards.length, lang) });
  return { cards };
}

const dogChoices = [
  { title: "Clover", photo: "lib:dogs", meta: "Ready for a group walk" },
  { title: "Pip", photo: "lib:dogs", meta: "Gentle park companion" },
  { title: "Milo", meta: "Loves the riverside" },
] as const;
export const examples = [
  {
    cards: [
      { title: "Fern", photo: "lib:plants", meta: "Soft indirect light" },
      { title: "Monstera", photo: "lib:plants", meta: "Room to grow" },
      { title: "Basil" },
    ],
  },
  { cards: [...dogChoices] },
  { cards: [{ title: "Aloe" }, { title: "Pothos" }] },
  { detail: "brief", cards: [...dogChoices] },
  { media: "none", cards: [...dogChoices] },
  { cards: [...dogChoices] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("SwipeStack");
export const probes = [
  choose("Help me pick plants to adopt, showing one at a time so I can swipe to keep or skip"),
  choose(
    "I want a grid of four plant photos, with a name below each image. The pictures are the main thing, not a list of plant records.",
    "Gallery",
  ),
  write(
    "Pick dogs for a group walk, one at a time: Clover with a dog photo and Ready for a group walk, Pip with Gentle park companion, and Milo",
  ),
  {
    ...write(
      "Let me swipe to keep or skip Clover and Pip, one at a time. Show their names and descriptions but hide the photos on the cards.",
    ),
    variant: { axis: "media", value: "none", itemTitles: ["Clover", "Pip"] },
  },
  read("Skip this one", { address: "s1/r1", action: "swipe" }),
] satisfies Probe[];

type StackProps = Props<typeof props, typeof meta>;

function SwipeCard({ card, compact }: { card: StackProps["cards"][number]; compact: boolean }) {
  const photo = card.photo && <KitPhoto photo={card.photo} shape="wide" part="photo" label={card.title} />;
  const title = (
    <KitText role="heading" part={null} density="comfortable">
      {card.title}
    </KitText>
  );
  const detail = card.meta && (
    <KitText role="caption" tone="muted" part="meta">
      {card.meta}
    </KitText>
  );
  if (compact)
    return (
      <KitCard style="plain" part="title" density="compact" padded>
        <KitContent density="compact" inset={photo ? "md" : "none"}>
          {photo}
          {title}
          {detail}
        </KitContent>
      </KitCard>
    );
  return (
    <KitCard style="plain" part="title" density="comfortable" padded>
      {photo}
      <KitContent density="comfortable">
        {title}
        {detail}
      </KitContent>
    </KitCard>
  );
}

export function SwipeStack({ cards }: StackProps) {
  const state = useComponentState();
  const density = useKit().density;
  const { swipeStackEmpty } = useWords().words;
  if (state === "empty") {
    return (
      <KitCard style="inset" part="root">
        <KitEmpty part="title" title={swipeStackEmpty} announce="status" />
      </KitCard>
    );
  }
  return (
    <KitCard style="plain" part="root">
      <KitSwipeStack
        cards={cards.map((card) => ({
          id: card.id,
          label: card.title,
          children: <SwipeCard card={card} compact={density === "compact"} />,
        }))}
      />
    </KitCard>
  );
}
