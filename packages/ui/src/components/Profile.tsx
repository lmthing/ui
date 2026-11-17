import { z } from "zod";
import {
  detailOf,
  itemsOf,
  photo,
  placeholderDetail,
  placeholderTitle,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitBlock, KitCard, KitIcon, KitPhoto, KitSkeleton, KitText, useComponentState } from "../kit";

export const meta = {
  id: "Profile",
  group: "content",
  purpose: "Identify the person, pet or plant whose screen this is.",
  pick: "An identity block with a name, short detail and optional portrait. Not a screen title or navigation (Header), or a summary to open another thing (Card).",
  region: "top",
  weight: 2,
  tier: "phone",
  realPath: "The identity and photo of one thing in the on-device database.",
  parts: ["root", "photo", "name", "meta"],
  states: ["filled", "loading"],
  aliases: ["identity", "portrait", "bio"],
} as const satisfies Meta;

export const props = z.strictObject({
  style: z.enum(["row", "centered"]).default("row"),
  name: text(32),
  meta: text(48).optional(),
  photo: photo.optional(),
});

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const item = itemsOf(cast, 1, cast.items[0]?.type)[0];
  const thing = thingOf(cast, item?.type);
  return {
    style: "row",
    name: (item && titleOf(item, 32, thing)) || placeholderTitle(0),
    meta: (item && detailOf(item, 48, thing)) || placeholderDetail,
  };
}

export const examples = [
  { style: "row", name: "Monstera", meta: "Living room", photo: "lib:plants" },
  { style: "centered", name: "Clover", meta: "Beagle · 4 years", photo: "lib:dogs" },
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "At the top of my dog's page, show her picture, name and breed so I know whose page this is",
    expect: "Profile",
  },
  {
    kind: "choose",
    need: "Put the name of my plants screen at the top with a shortcut to add a plant",
    expect: "Header",
  },
  {
    kind: "write",
    brief:
      "Introduce Clover at the top of her page with her picture above her name and Beagle · 4 years underneath",
    expect: "Profile",
  },
] satisfies Probe[];

export function Profile({ style, name, meta: detail, photo }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  if (state === "loading") {
    return (
      <KitCard style="plain" padded={style === "centered"} part="root">
        <KitSkeleton
          rows={1}
          lead={style === "row" ? "dot" : "none"}
          shape={style === "row" ? "rows" : "headline"}
        />
      </KitCard>
    );
  }
  if (style === "centered") {
    return (
      <KitCard style="plain" padded part="root">
        {photo && <KitPhoto photo={photo} shape="avatar" part="photo" label={name} />}
        <KitText role="title" align="center" part="name">
          {name}
        </KitText>
        {detail && (
          <KitText role="body" tone="muted" align="center" part="meta">
            {detail}
          </KitText>
        )}
      </KitCard>
    );
  }
  return (
    <KitBlock
      label={name}
      lineRole="heading"
      leading={
        photo ? (
          <KitPhoto photo={photo} shape="round" part="photo" label={name} />
        ) : (
          <KitIcon tone="muted" part="photo" />
        )
      }
    >
      <KitText role="heading" part="name">
        {name}
      </KitText>
      {detail && (
        <KitText role="body" tone="muted" part="meta">
          {detail}
        </KitText>
      )}
    </KitBlock>
  );
}
