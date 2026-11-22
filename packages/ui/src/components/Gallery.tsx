import {
  useWords,
  KitCard,
  KitContent,
  KitEmpty,
  KitGrid,
  KitIcon,
  KitPhoto,
  KitRow,
  KitSkeleton,
  KitStrip,
  KitText,
  useComponentState,
} from "../kit";
import { z } from "zod";
import {
  probesFor,
  photo,
  placeholderTitle,
  screenId,
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { prompt } from "../entry/prompt-Gallery.generated";

export const meta = {
  id: "Gallery",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  tier: "phone",
  realPath: "Photo references on records in the on-device database, with optional navigation links.",
  items: { key: "photos", parts: ["root", "photo", "caption"] },
  parts: ["root"],
  variants: { arrange: ["grid", "strip"], aspect: ["auto", "wide", "tall"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["caption"] } },
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] }, when: { root: { linked: true } } },
} as const satisfies Meta;

const frame = z.strictObject({
  ...variantProps(meta.variants),
  style: z.literal("carousel").optional(),
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

export const props = frame.overwrite((value) =>
  value.detail === "brief"
    ? { ...value, photos: value.photos.map((entry) => ({ ...entry, caption: undefined })) }
    : value,
);

function neutralPhoto(index: number, lang?: string) {
  const caption = placeholderTitle(index);
  return { photo: `lib:${caption.toLowerCase().replace(/ /g, "_")}`, caption: placeholderTitle(index, lang) };
}

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const photos = cast.items.slice(0, 6).map((item, index) => {
    const reference = photo.safeParse(`lib:${item.type}`);
    return {
      photo: reference.success ? reference.data : neutralPhoto(index, lang).photo,
      caption: titleOf(item, 24, thingOf(cast, item.type)) || placeholderTitle(index, lang),
    };
  });
  while (photos.length < 2) photos.push(neutralPhoto(photos.length, lang));
  return { photos };
}

const plantPhotos = [
  { photo: "lib:fern", caption: "Fern", goto: "fern" },
  { photo: "lib:monstera", caption: "Monstera", goto: "monstera" },
  { photo: "lib:basil", caption: "Basil" },
  { photo: "lib:aloe", caption: "Aloe" },
];

export const examples = [
  {
    photos: [
      { photo: "lib:plants", caption: "Fern", goto: "fern" },
      { photo: "lib:plants", caption: "Monstera", goto: "monstera" },
      { photo: "lib:plants", caption: "Basil" },
      { photo: "lib:plants", caption: "Aloe" },
    ],
  },
  {
    style: "carousel",
    photos: [
      { photo: "lib:park_walk", caption: "Park walk", goto: "morning_walk" },
      { photo: "lib:river_walk", caption: "River walk" },
      { photo: "lib:evening_walk" },
    ],
  },
  { photos: plantPhotos },
  { arrange: "strip", photos: plantPhotos },
  { aspect: "wide", photos: plantPhotos },
  { aspect: "tall", photos: plantPhotos },
  { detail: "brief", photos: plantPhotos },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Gallery");
export const probes = [
  choose("Show four shots of my plants together with their names underneath"),
  choose("Show just one shot of my fern with a short description underneath", "Photo"),
  write("Show four plant shots together, captioned Fern, Monstera, Basil and Aloe, opening fern from Fern"),
  write("Show three shots of the flat to swipe through one at a time: Front room, Kitchen and Garden"),
  {
    ...write(
      "Keep the default layout for Fern, Monstera and Basil photos. Only change the crops to tall portrait frames, not to a strip or carousel.",
    ),
    variant: { axis: "aspect", value: "tall" },
  },
  {
    ...write(
      "Show photos of Fern, Basil, and Aloe with those captions underneath in a sideways swipeable strip. Keep the usual crops and show several at once, not one picture per page.",
    ),
    variant: { axis: "arrange", value: "strip" },
  },
  read("Open the Fern picture", { address: "g1/r1", action: "press" }),
] satisfies Probe[];

type Entry = Props<typeof props, typeof meta>["photos"][number];

// prettier-ignore
function GalleryItem({ entry, index, shape }: { entry: Entry; index: number; shape: "wide" | "square" | "tall" }) {
  const { lang } = useWords();
  const cue = entry.goto && entry.caption && <KitIcon name="chevron_right" scale="sm" decorative />;
  const caption = entry.caption && <KitText role={shape === "tall" ? "body" : "caption"} tone={shape === "tall" ? "text" : "muted"} part="caption">{entry.caption}</KitText>;
  return <KitRow item={entry.id} label={entry.caption ?? placeholderTitle(index, lang)} goto={entry.goto} inset="none">
    <KitContent lineRole="body">
      <KitPhoto photo={entry.photo} shape={shape} part="photo" {...(entry.caption ? { label: entry.caption } : {})} />
      {cue ? <KitGrid fitLast>{caption}{cue}</KitGrid> : caption}
    </KitContent>
  </KitRow>;
}

export function Gallery({ style, arrange, aspect, photos }: Props<typeof props, typeof meta>) {
  const { lang } = useWords();
  const state = useComponentState();
  const shape = aspect === "tall" ? "tall" : style === "carousel" || aspect === "wide" ? "wide" : "square";
  if (state === "empty") {
    return (
      <KitCard style="plain" part="root">
        <KitEmpty part="caption" />
      </KitCard>
    );
  }
  const cells = photos.map((entry, index) =>
    state === "loading" ? (
      <KitRow key={entry.id} label={entry.caption ?? placeholderTitle(index, lang)} inset="none">
        <KitSkeleton
          shape="media"
          aspect={shape}
          inset="none"
          contentGap="xs"
          content={entry.caption ? [[shape === "tall" ? "body" : "caption", entry.caption]] : []}
        />
      </KitRow>
    ) : (
      <GalleryItem key={entry.id} entry={entry} index={index} shape={shape} />
    ),
  );
  return (
    <KitCard style="plain" part="root" padded inset="none">
      {style === "carousel" ? (
        <KitStrip pages>{cells}</KitStrip>
      ) : (
        <KitGrid arrange={arrange} columns={photos.length === 3 || photos.length === 6 ? 3 : 2}>
          {cells}
        </KitGrid>
      )}
    </KitCard>
  );
}
