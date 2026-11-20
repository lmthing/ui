import {
  wordsFor,
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
import { z } from "zod";
import { KitCard, KitPhoto, KitSkeleton, KitText, useComponentState, useKit, useVariant } from "../kit";

export const meta = {
  id: "Hero",
  group: "content",
  purpose: "The screen's main statement or headline number, including what needs attention today.",
  pick: "The screen's main message, photo-led introduction or headline number, even when it says something needs attention. Not a separate urgent alert or status update (Banner), a supporting sentence (Note), several numbers (Stats) or one sum of money as the point (Amount).",
  writeHints: [
    'Use style "number" when the main title is a headline number. Use media "cover" only when asked for a wide photo above the headline, and include its photo reference.',
    'Use detail "brief" only when asked to hide the subtitle; keep supplied subtitle text in sub. Leave other axes null unless requested.',
  ],
  region: "body",
  weight: 3,
  tier: "phone",
  realPath: "A headline derived from content or a query in the on-device database.",
  variants: {
    density: ["comfortable", "compact"],
    emphasis: ["normal", "quiet"],
    align: ["start", "center"],
    detail: ["full", "brief"],
    media: ["none", "cover"],
    tone: ["neutral", "good", "warn", "bad"],
  },
  variantParts: {
    "detail.brief": { hides: ["sub"] },
    "media.cover": { adds: ["photo"] },
  },
  parts: ["root", "title", "sub", "photo"],
  states: ["filled", "loading"],
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    style: z.enum(["number"]).optional(),
    title: text(40),
    sub: text(80).optional(),
    photo: photo.optional(),
  })
  .overwrite((value) => ({
    ...value,
    ...(value.detail === "brief" ? { sub: undefined } : {}),
    ...(value.media === "none" ? { photo: undefined } : {}),
  }));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = wordsFor(lang);

  const item = itemsOf(cast, 1, cast.items[0]?.type)[0];
  const thing = thingOf(cast, item?.type);
  return {
    title: (item && titleOf(item, 40, thing)) || placeholderTitle(0, lang),
    sub: (item && detailOf(item, 80, thing)) || placeholderDetail,
  };
}

export const examples = [
  { title: "Plant care", sub: "Check the ferns before watering", photo: "lib:plants" },
  {
    media: "cover",
    title: "Morning walk",
    sub: "Clover and Pip are ready for their morning park walk",
    photo: "lib:dogs",
  },
  { title: "Morning walk", sub: "Clover and Pip are ready for their morning park walk" },
  { style: "number", title: "2", sub: "plants need water", tone: "warn" },
  { title: "Watered", tone: "good", align: "center", sub: "Next check on Friday" },
  { title: "Watered", tone: "good", sub: "Next check on Friday" },
  { title: "Cancelled", tone: "bad" },
  { title: "Plant care", sub: "Check the ferns before watering", emphasis: "quiet" },
  { title: "Plant care", sub: "Check the ferns before watering", detail: "brief" },
  { title: "Plant care", sub: "Check the ferns before watering", density: "compact" },
] satisfies z.input<typeof props>[];

const { choose, write } = probesFor("Hero");
export const probes = [
  choose("Make the main message of my plant screen that two plants need water today"),
  choose("Add a small supporting sentence below my plants reminding me not to overwater", "Note"),
  write("Make the main number two, with plants need water underneath and a warning tone"),
  {
    ...write(
      "Put a wide photo of lib:dogs above the main headline, Morning walk. Keep the subtitle, Clover and Pip at 09:00.",
    ),
    variant: { axis: "media", value: "cover" },
  },
] satisfies Probe[];

export function Hero(input: Props<typeof props, typeof meta>) {
  const { style, title, sub, photo, media, tone, emphasis, align } = input;
  const density = useVariant("density", meta.variants.density, input.density);
  const state = useComponentState();
  const { resolvePhoto } = useKit();
  const hasPhoto = media === "cover" && photo && resolvePhoto?.(photo);
  const number = style === "number";
  if (state === "loading") {
    return (
      <KitCard style="cards" density={density} part="root">
        <KitSkeleton
          rows={1}
          lead="none"
          shape={hasPhoto ? "media" : "headline"}
          {...{ density, emphasis }}
          inset="none"
        />
      </KitCard>
    );
  }
  return (
    <KitCard style="cards" density={density} align={align} part="root">
      {hasPhoto && photo && <KitPhoto photo={photo} shape="wide" part="photo" />}
      <KitText
        role={number ? "number" : media === "cover" ? "title" : "display"}
        tone={tone === "neutral" ? (number ? "accent" : "text") : tone}
        {...{ density, emphasis, align }}
        part="title"
      >
        {title}
      </KitText>
      {sub && (
        <KitText role={number ? "label" : "body"} tone="muted" part="sub" {...{ density, align }}>
          {sub}
        </KitText>
      )}
    </KitCard>
  );
}
