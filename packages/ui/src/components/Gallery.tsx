import { z } from "zod";
import {
  photo,
  placeholderTitle,
  screenId,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import {
  KitCard,
  KitContent,
  KitEmpty,
  KitGrid,
  KitPhoto,
  KitRow,
  KitSkeleton,
  KitStrip,
  KitText,
  useComponentState,
} from "../kit";

export const meta = {
  id: "Gallery",
  group: "content",
  purpose: "Browse several pictures together, optionally opening one.",
  pick: "Several pictures to browse together, in a grid or sideways strip. Not one picture on its own (Photo) or text-led rows of separate things (List).",
  region: "body",
  weight: 3,
  tier: "phone",
  realPath: "Photo references on records in the on-device database, with optional navigation links.",
  items: { key: "photos", parts: ["root", "photo", "caption"] },
  parts: ["root"],
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] }, when: { root: { linked: true } } },
  aliases: ["album", "photogrid", "filmstrip"],
} as const satisfies Meta;

export const props = z.strictObject({
  style: z.enum(["grid", "strip"]).default("grid"),
  photos: z
    .array(
      z
        .strictObject({
          photo,
          caption: text(24).optional(),
          goto: screenId.optional(),
        })
        // Link presence is derived, never supplied by the model.
        .overwrite((value) => ({ ...value, linked: value.goto !== undefined })),
    )
    .min(2)
    .max(6),
});

function neutralPhoto(index: number) {
  const caption = placeholderTitle(index);
  return { photo: `lib:${caption.toLowerCase().replace(/ /g, "_")}`, caption };
}

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const photos = cast.items.slice(0, 6).map((item, index) => {
    const reference = photo.safeParse(`lib:${item.type}`);
    return {
      photo: reference.success ? reference.data : neutralPhoto(index).photo,
      caption: titleOf(item, 24, thingOf(cast, item.type)) || placeholderTitle(index),
    };
  });
  while (photos.length < 2) photos.push(neutralPhoto(photos.length));
  return { style: "grid", photos };
}

export const examples = [
  {
    style: "grid",
    photos: [
      { photo: "lib:plants", caption: "Fern", goto: "fern" },
      { photo: "lib:plants", caption: "Monstera", goto: "monstera" },
      { photo: "lib:plants", caption: "Basil" },
      { photo: "lib:plants", caption: "Aloe" },
    ],
  },
  {
    style: "strip",
    photos: [
      { photo: "lib:dogs", caption: "Park walk", goto: "morning_walk" },
      { photo: "lib:dogs", caption: "River walk" },
      { photo: "lib:dogs" },
    ],
  },
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "Show four shots of my plants together with their names underneath",
    expect: "Gallery",
  },
  {
    kind: "choose",
    need: "Show just one shot of my fern with a short description underneath",
    expect: "Photo",
  },
  {
    kind: "write",
    brief: "Show four plant shots together, captioned Fern, Monstera, Basil and Aloe, opening fern from Fern",
    expect: "Gallery",
  },
  {
    kind: "read",
    screen: 0,
    task: "Open the Fern picture",
    expect: { address: "g1/r1", action: "press" },
  },
] satisfies Probe[];

type Entry = Props<typeof props, typeof meta>["photos"][number];

function GalleryItem({ entry, index }: { entry: Entry; index: number }) {
  return (
    <KitRow item={entry.id} label={entry.caption ?? placeholderTitle(index)} goto={entry.goto} inset="none">
      <KitContent lineRole="body">
        <KitPhoto
          photo={entry.photo}
          shape="square"
          part="photo"
          {...(entry.caption ? { label: entry.caption } : {})}
        />
        {entry.caption && (
          <KitText role="caption" tone="muted" part="caption">
            {entry.caption}
          </KitText>
        )}
      </KitContent>
    </KitRow>
  );
}

export function Gallery({ style, photos }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  if (state === "loading") {
    return (
      <KitCard style="plain" part="root">
        <KitSkeleton shape="media" lead="none" />
      </KitCard>
    );
  }
  if (state === "empty") {
    return (
      <KitCard style="plain" part="root">
        <KitEmpty part="caption" />
      </KitCard>
    );
  }
  const cells = photos.map((entry, index) => <GalleryItem key={entry.id} entry={entry} index={index} />);
  return (
    <KitCard style="plain" part="root" padded>
      {style === "strip" ? (
        <KitStrip>{cells}</KitStrip>
      ) : (
        <KitGrid columns={photos.length === 3 || photos.length === 6 ? 3 : 2}>{cells}</KitGrid>
      )}
    </KitCard>
  );
}
