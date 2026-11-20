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
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import {
  KitCard,
  KitContent,
  KitEmpty,
  KitPhoto,
  KitSwipeStack,
  KitText,
  useComponentState,
  useVariant,
} from "../kit";

export const meta = {
  id: "SwipeStack",
  signature: "card_swipe",
  group: "content",
  purpose: "Choose between things one at a time, swiping the current one to keep or skip.",
  pick: "Decide which of several things to keep or skip, one at a time. Swipe only the top choice. Not browsing several captioned pictures together (Gallery) or opening a single featured preview (Card).",
  writeHints: [
    'A request to hide only photos sets media to "none" and leaves detail and density null. Descriptions remain visible. Set detail to "brief" only when asked to hide descriptions. When spacing is not requested, density must be null, never "comfortable".',
  ],
  region: "body",
  weight: 3,
  tier: "phone",
  realPath: "An ordered set of on-device records with a keep or skip decision stored for each.",
  variants: {
    density: ["comfortable", "compact"],
    detail: ["full", "brief"],
    media: ["cover", "none"],
  },
  variantParts: { "detail.brief": { hides: ["meta"] }, "media.none": { hides: ["photo"] } },
  items: { key: "cards", parts: ["root", "photo", "title", "meta"], visible: "first" },
  parts: ["root"],
  states: ["filled", "empty"],
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
  { density: "compact", cards: [...dogChoices] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("SwipeStack");
export const probes = [
  choose("Help me pick plants to adopt, showing one at a time so I can swipe to keep or skip"),
  choose("Show four plant pictures together with their names underneath so I can browse them", "Gallery"),
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

export function SwipeStack({ cards, density: requestedDensity }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  const density = useVariant("density", meta.variants.density, requestedDensity);
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
            <KitCard style="plain" part="title" density={density} padded>
              {card.photo && <KitPhoto photo={card.photo} shape="wide" part="photo" label={card.title} />}
              <KitContent density={density}>
                <KitText role="heading" part={null} density="comfortable">
                  {card.title}
                </KitText>
                {card.meta && (
                  <KitText role="caption" tone="muted" part="meta" density={density}>
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
