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
  status: "ready",
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
    title: "Clover and Pip are ready",
    sub: "Meet at the park gate at 9:00",
    photo: "lib:dogs",
  },
  { title: "Clover and Pip are ready", sub: "Meet at the park gate at 9:00" },
  { style: "number", title: "2", sub: "plants need water", tone: "warn" },
  { title: "Fern watered", tone: "good", sub: "Check its soil again Friday" },
  { title: "Pip’s river walk is cancelled", tone: "bad", sub: "Choose a new walk time in Schedule." },
  { title: "Check the ferns first", sub: "Water only if the topsoil is dry", emphasis: "quiet" },
  { title: "Fern care is up to date", sub: "Last watered Monday", detail: "brief" },
  {
    title: "The midnight meteor watch",
    sub: "Dark-sky terrace · Gates open at 11:30 pm",
    media: "cover",
    photo: "lib:night_sky",
  },
] satisfies z.input<typeof props>[];

const { choose, write } = probesFor("Hero");
export const probes = [
  choose("Make the main message of my plant screen that two plants need water today"),
  choose("Add a small supporting sentence below my plants reminding me not to overwater", "Note"),
  write("Make the main number two, with plants need water underneath and a warning tone"),
  {
    ...write(
      "Make Morning walk the lead statement, with the subtitle Clover and Pip at 09:00 and a wide supporting photo of lib:dogs.",
    ),
    variant: { axis: "media", value: "cover" },
    expectProps: { title: "Morning walk", sub: "Clover and Pip at 09:00", photo: "lib:dogs" },
  },
] satisfies Probe[];

export function Hero(input: Props<typeof props, typeof meta>) {
  const { style, title, sub, photo, media, tone, emphasis } = input;
  const { density, resolvePhoto } = useKit();
  const state = useComponentState();
  const hasPhoto = media === "cover" && photo && resolvePhoto?.(photo);
  const number = style === "number";
  const titleRole = number ? "number" : "title";
  const subRole = number ? "label" : "body";
  if (state === "loading") {
    return (
      <KitCard style="cards" density={density} part="root">
        <KitSkeleton
          shape="figure"
          density={density}
          inset="none"
          lines={[
            { text: title, role: titleRole, emphasis },
            ...(sub ? [{ text: sub, role: subRole } as const] : []),
          ]}
        />
        {hasPhoto && <KitPhoto shape="panorama" part={null} loading />}
      </KitCard>
    );
  }
  return (
    <KitCard style="cards" density={density} part="root">
      <KitContent density={density}>
        <KitText
          role={titleRole}
          tone={tone === "neutral" ? (number ? "accent" : "text") : tone}
          {...{ density, emphasis }}
          part="title"
          breakLongWords
        >
          {title}
        </KitText>
        {sub && (
          <KitText role={subRole} tone="muted" part="sub" density={density} breakLongWords>
            {sub}
          </KitText>
        )}
      </KitContent>
      {hasPhoto && <KitPhoto photo={photo} shape="panorama" part="photo" decorative />}
    </KitCard>
  );
}
