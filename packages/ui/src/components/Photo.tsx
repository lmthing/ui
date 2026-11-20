import { z } from "zod";
import {
  probesFor,
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
import { KitCard, KitContent, KitPhoto, KitSkeleton, KitText, useComponentState } from "../kit";

export const meta = {
  id: "Photo",
  group: "content",
  purpose: "Show one picture, with an optional caption.",
  pick: "One picture on its own, optionally captioned. Not several pictures (Gallery) or a photo-led main message with a headline (Hero).",
  writeHints: [
    'For one picture without an expressly requested crop or edge treatment, write aspect:null and bleed:null, not the default "wide" and "inset". Use aspect "square", "wide" or "tall" only for an explicit crop and bleed "edge" only for a requested edge-to-edge image.',
    'When asked to keep a supplied caption but not show it, set only detail "brief" and fill caption. If there is no caption to keep, leave both null.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A photo reference on one thing in the on-device database.",
  variants: { aspect: ["wide", "square", "tall"], bleed: ["inset", "edge"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["caption"] } },
  parts: ["root", "photo", "caption"],
  states: ["filled", "loading"],
} as const satisfies Meta;

export const props = z
  .strictObject({ ...variantProps(meta.variants), photo, caption: text(80).optional() })
  .overwrite((value) => (value.detail === "brief" ? { ...value, caption: undefined } : value));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const item = cast.items[0];
  const reference = photo.safeParse(thing && `lib:${thing.type}`);
  return {
    photo: reference.success
      ? reference.data
      : `lib:${placeholderTitle(0, lang).toLowerCase().replace(/ /g, "_")}`,
    caption: (item && titleOf(item, 80, thingOf(cast, item.type))) || placeholderTitle(0, lang),
  };
}

const fern = { photo: "lib:plants", caption: "Fern catching the morning light" };
const clover = { photo: "lib:dogs", caption: "Clover after her morning park walk" };
export const examples = [
  fern,
  clover,
  { ...fern, aspect: "square" },
  { ...fern, aspect: "tall" },
  { ...fern, bleed: "edge" },
  { ...fern, detail: "brief" },
  { photo: "lib:plants" },
] satisfies z.input<typeof props>[];

const { choose, write } = probesFor("Photo");
export const probes = [
  choose("Show just one shot of my fern, with a short description underneath"),
  choose("Show six shots of my dogs together so I can browse them", "Gallery"),
  write("Show one shot of my fern in a landscape crop, with Fern in morning light underneath"),
  {
    ...write(
      'Show just one picture of the fern. Save the caption "Fern in morning light" but hide it from the screen.',
    ),
    variant: { axis: "detail", value: "brief" },
  },
] satisfies Probe[];

export function Photo({ aspect, bleed, photo, caption }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  const edge = bleed === "edge";
  if (state === "loading") {
    return (
      <KitCard style="plain" part="root" bleed={bleed}>
        <KitSkeleton
          shape="media"
          lead="none"
          aspect={aspect}
          inset={edge ? "none" : "md"}
          content={edge ? [] : [["caption", caption]]}
        />
        {edge && caption && (
          <KitSkeleton shape="media" lead="none" aspect="none" content={[["caption", caption]]} />
        )}
      </KitCard>
    );
  }
  const line = caption && (
    <KitText role="caption" tone="muted" part="caption">
      {caption}
    </KitText>
  );
  return (
    <KitCard style="plain" part="root" padded bleed={bleed} inset={edge ? "none" : "md"}>
      <KitPhoto photo={photo} aspect={aspect} part="photo" />
      {line && (edge ? <KitContent inset="md">{line}</KitContent> : line)}
    </KitCard>
  );
}
