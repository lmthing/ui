import { z } from "zod";
import {
  detailOf,
  itemsOf,
  photo,
  placeholderTitle,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitCard, KitContent, KitEmpty, KitPhoto, KitSwipeStack, KitText, useComponentState } from "../kit";

export const meta = {
  id: "SwipeStack",
  signature: "card_swipe",
  group: "content",
  purpose: "Choose between things one at a time, swiping the current one to keep or skip.",
  pick: "Decide which of several things to keep or skip, one at a time. Swipe only the top choice. Not browsing several captioned pictures together (Gallery) or opening a single featured preview (Card).",
  region: "body",
  weight: 3,
  tier: "phone",
  realPath: "An ordered set of on-device records with a keep or skip decision stored for each.",
  items: { key: "cards", parts: ["root", "photo", "title"], visible: "first" },
  parts: ["root"],
  states: ["filled", "empty"],
  actions: { items: { root: ["swipe"] }, when: { root: { $first: true } } },
  aliases: ["deck", "swipe", "choices"],
} as const satisfies Meta;

export const props = z.strictObject({
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
});

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const cards = itemsOf(cast, 6).flatMap((item) => {
    const title = titleOf(item, 32, thing);
    const detail = detailOf(item, 24, thing);
    return title ? [{ title, ...(detail ? { meta: detail } : {}) }] : [];
  });
  while (cards.length < 2) cards.push({ title: placeholderTitle(cards.length) });
  return { cards };
}

export const examples = [
  {
    cards: [
      { title: "Fern", photo: "lib:plants", meta: "Soft indirect light" },
      { title: "Monstera", photo: "lib:plants", meta: "Room to grow" },
      { title: "Basil" },
    ],
  },
  {
    cards: [
      { title: "Clover", photo: "lib:dogs", meta: "Ready for a group walk" },
      { title: "Pip", photo: "lib:dogs", meta: "Gentle park companion" },
      { title: "Milo", meta: "Loves the riverside" },
    ],
  },
  { cards: [{ title: "Aloe" }, { title: "Pothos" }] },
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "Help me pick plants to adopt, showing one at a time so I can swipe to keep or skip",
    expect: "SwipeStack",
  },
  {
    kind: "choose",
    need: "Show four plant pictures together with their names underneath so I can browse them",
    expect: "Gallery",
  },
  {
    kind: "write",
    brief:
      "Pick dogs for a group walk, one at a time: Clover with a dog photo and Ready for a group walk, Pip with Gentle park companion, and Milo",
    expect: "SwipeStack",
  },
  {
    kind: "read",
    screen: 0,
    task: "Skip this one",
    expect: { address: "s1/r1", action: "swipe" },
  },
] satisfies Probe[];

export function SwipeStack({ cards }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  if (state === "empty") {
    return (
      <KitCard style="inset" part="root">
        <KitEmpty part="title" />
      </KitCard>
    );
  }
  return (
    <KitCard style="plain" part="root">
      <KitSwipeStack
        cards={cards.map((card) => ({
          id: card.id,
          label: card.title,
          children: (
            <KitCard style="plain" part="title" padded>
              {card.photo && <KitPhoto photo={card.photo} shape="wide" part="photo" label={card.title} />}
              <KitContent>
                <KitText role="heading" part={null}>
                  {card.title}
                </KitText>
                {card.meta && (
                  <KitText role="caption" tone="muted" part={null}>
                    {card.meta}
                  </KitText>
                )}
              </KitContent>
            </KitCard>
          ),
        }))}
      />
    </KitCard>
  );
}
