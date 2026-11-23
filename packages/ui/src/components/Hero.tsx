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
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
  variantProps,
} from "../catalog";
import { z } from "zod";
import { KitCard, KitContent, KitPhoto, KitSkeleton, KitText, useComponentState, useKit } from "../kit";
import { prompt } from "../entry/prompt-Hero.generated";

export const meta = {
  id: "Hero",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  tier: "phone",
  realPath: "A headline derived from content or a query in the on-device database.",
  variants: {
    emphasis: ["normal", "quiet"],
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
  { title: "Check the ferns first", sub: "Water only if the topsoil is dry", photo: "lib:plants" },
  {
    media: "cover",
    title: "Morning walk",
    sub: "Clover and Pip are ready for their morning park walk",
    photo: "lib:dogs",
  },
  { title: "Morning walk", sub: "Clover and Pip are ready for their morning park walk" },
  { style: "number", title: "2", sub: "plants need water", tone: "warn" },
  { title: "Watered", sub: "Next check on Friday" },
  { title: "Watered", tone: "good", sub: "Next check on Friday" },
  { title: "Watered", sub: "Next check on Friday" },
  { title: "Cancelled", tone: "bad" },
  { title: "Check the ferns first", sub: "Water only if the topsoil is dry", emphasis: "quiet" },
  { title: "Check the ferns first", sub: "Water only if the topsoil is dry", detail: "brief" },
  { title: "Check the ferns first", sub: "Water only if the topsoil is dry" },
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
  const { style, title, sub, photo, media, tone, emphasis } = input;
  const align = "start";
  const density = useKit().density;
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
  const copy = (
    <>
      <KitText
        role={number ? "number" : "title"}
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
    </>
  );
  return (
    <KitCard style="cards" density={density} align={align} part="root">
      {hasPhoto && photo ? (
        <>
          <KitPhoto photo={photo} shape="wide" part="photo" error={null} />
          <KitContent {...{ density, align }}>{copy}</KitContent>
        </>
      ) : (
        copy
      )}
    </KitCard>
  );
}
