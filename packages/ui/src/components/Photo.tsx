import { z } from "zod";
import {
  probesFor,
  photo,
  placeholderTitle,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitCard, KitPhoto, KitSkeleton, KitText, useComponentState } from "../kit";

export const meta = {
  id: "Photo",
  group: "content",
  purpose: "Show one picture, with an optional caption.",
  pick: "One picture on its own, optionally captioned. Not several pictures (Gallery) or a photo-led main message with a headline (Hero).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A photo reference on one thing in the on-device database.",
  parts: ["root", "photo", "caption"],
  states: ["filled", "loading"],
} as const satisfies Meta;

export const props = z.strictObject({
  style: z.enum(["square", "wide", "tall"]).default("wide"),
  photo,
  caption: text(80).optional(),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const item = cast.items[0];
  const reference = photo.safeParse(thing && `lib:${thing.type}`);
  return {
    style: "wide",
    photo: reference.success
      ? reference.data
      : `lib:${placeholderTitle(0, lang).toLowerCase().replace(/ /g, "_")}`,
    caption: (item && titleOf(item, 80, thingOf(cast, item.type))) || placeholderTitle(0, lang),
  };
}

export const examples = [
  { style: "wide", photo: "lib:plants", caption: "Fern catching the morning light" },
  { style: "square", photo: "lib:dogs", caption: "Clover after her morning park walk" },
  { style: "tall", photo: "lib:plants" },
] satisfies z.input<typeof props>[];

const { choose, write } = probesFor("Photo");
export const probes = [
  choose("Show just one shot of my fern, with a short description underneath"),
  choose("Show six shots of my dogs together so I can browse them", "Gallery"),
  write("Show one shot of my fern in a landscape crop, with Fern in morning light underneath"),
] satisfies Probe[];

export function Photo({ style, photo, caption }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  if (state === "loading") {
    return (
      <KitCard style="plain" part="root">
        <KitSkeleton shape="media" lead="none" />
      </KitCard>
    );
  }
  return (
    <KitCard style="plain" part="root" padded>
      <KitPhoto photo={photo} shape={style} part="photo" />
      {caption && (
        <KitText role="caption" tone="muted" part="caption">
          {caption}
        </KitText>
      )}
    </KitCard>
  );
}
