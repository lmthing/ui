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
  variantProps,
} from "../catalog";
import {
  KitCard,
  KitEmpty,
  KitPhoto,
  KitSkeleton,
  KitText,
  useComponentState,
  useKit,
  useWords,
} from "../kit";
import { prompt } from "../entry/prompt-Photo.generated";

export const meta = {
  id: "Photo",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A photo reference on one thing in the on-device database.",
  variants: { aspect: ["wide", "square", "tall"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["caption"] } },
  parts: ["root", "photo", "caption"],
  states: ["filled", "loading", "error"],
  viewVisible: ({ photo }, resolvePhoto) => typeof photo === "string" && Boolean(resolvePhoto?.(photo)),
} as const satisfies Meta;

export const props = z
  .strictObject({ ...variantProps(meta.variants), photo, caption: text(80).optional() })
  .overwrite((value) => (value.detail === "brief" ? { ...value, caption: undefined } : value));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const item = cast.items[0];
  const reference = photo.safeParse(item?.photo ?? (thing && `lib:${thing.type}`));
  return {
    photo: reference.success
      ? reference.data
      : `lib:${placeholderTitle(0, lang).toLowerCase().replace(/ /g, "_")}`,
    caption: (item && titleOf(item, 80, thingOf(cast, item.type))) || placeholderTitle(0, lang),
  };
}

const fern = { photo: "lib:fern", caption: "Fern catching the morning light" };
const clover = { photo: "lib:dogs", caption: "Clover after her morning park walk" };
export const examples = [
  fern,
  clover,
  { ...fern, aspect: "square" },
  { ...fern, aspect: "tall" },
  { ...fern },
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

export function Photo({ aspect, photo, caption }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  const { resolvePhoto } = useKit();
  const { words } = useWords();
  if (state === "loading") {
    return (
      <KitCard style="plain" part="root">
        <KitSkeleton shape="media" lead="none" aspect={aspect} inset="md" content={[["caption", caption]]} />
      </KitCard>
    );
  }
  if (state !== "error" && !meta.viewVisible({ photo }, resolvePhoto)) return null;
  const error = (
    <KitEmpty
      layout="inline"
      title={words.photoUnavailable}
      icon="alert"
      tone="bad"
      announce="status"
      part={null}
    />
  );
  const line = caption && (
    <KitText role="caption" tone="muted" part="caption">
      {caption}
    </KitText>
  );
  return (
    <KitCard style="plain" part="root" padded inset="md">
      {state === "error" ? (
        error
      ) : (
        <KitPhoto photo={photo} aspect={aspect} part="photo" error={error} caption={line} />
      )}
    </KitCard>
  );
}
