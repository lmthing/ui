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
import {
  KitBlock,
  KitCard,
  KitIcon,
  KitPhoto,
  KitSkeleton,
  KitText,
  useComponentState,
  useVariant,
  useWords,
} from "../kit";
import { prompt } from "../entry/prompt-Profile.generated";

export const meta = {
  id: "Profile",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "top",
  weight: 2,
  tier: "phone",
  realPath: "The identity and photo of one thing in the on-device database.",
  variants: {
    align: ["start", "center"],
    density: ["comfortable", "compact"],
    detail: ["full", "brief"],
    media: ["thumb", "none"],
  },
  variantParts: { "detail.brief": { hides: ["meta"] }, "media.none": { hides: ["photo"] } },
  parts: ["root", "photo", "name", "meta"],
  states: ["filled", "loading"],
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    name: text(32),
    meta: text(48).optional(),
    photo: photo.optional(),
  })
  .overwrite((value) => ({
    ...value,
    ...(value.detail === "brief" ? { meta: undefined } : {}),
    ...(value.media === "none" ? { photo: undefined } : {}),
  }));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = wordsFor(lang);

  const item = itemsOf(cast, 1, cast.items[0]?.type)[0];
  const thing = thingOf(cast, item?.type);
  return {
    name: (item && titleOf(item, 32, thing)) || placeholderTitle(0, lang),
    meta: (item && detailOf(item, 48, thing)) || placeholderDetail,
  };
}

const monstera = { name: "Monstera", meta: "Living room", photo: "lib:plants" };
const clover = { name: "Clover", meta: "Beagle · 4 years", photo: "lib:dogs" };
export const examples = [
  monstera,
  { align: "center", ...clover },
  clover,
  { ...monstera, density: "compact" },
  { ...monstera, detail: "brief" },
  { ...monstera, media: "none" },
] satisfies z.input<typeof props>[];

const { choose, write } = probesFor("Profile");
export const probes = [
  choose("At the top of my dog's page, show her picture, name and breed so I know whose page this is"),
  choose("Put the name of my plants screen at the top with a shortcut to add a plant", "Header"),
  write(
    "Introduce Clover at the top of her page with her picture above her name and Beagle · 4 years underneath",
  ),
  {
    ...write(
      'Show Clover’s name with her lib:dogs portrait in the usual layout. Save "Beagle" as her supporting detail, but do not display that line.',
    ),
    variant: { axis: "detail", value: "brief" },
  },
] satisfies Probe[];

type ProfileProps = Props<typeof props, typeof meta>;

function ProfileLoading({
  align,
  meta: supporting,
  photo,
  media,
  density,
}: ProfileProps & { density: NonNullable<ProfileProps["density"]> }) {
  const centered = align === "center";
  const { lang, words } = useWords();
  const heading = placeholderTitle(0, lang);
  const secondary = supporting ? words.placeholderDetail : undefined;
  return (
    <KitCard style="plain" padded={centered} part="root" density={density}>
      {centered ? (
        <KitSkeleton
          shape="media"
          aspect={photo ? "avatar" : "none"}
          inset="none"
          density={density}
          content={[
            ["title", heading, "center"],
            ["body", secondary, "center"],
          ]}
        />
      ) : (
        <KitSkeleton
          shape="rows"
          inset="md"
          density={density}
          lead={media === "none" ? "none" : photo ? "box" : "dot"}
          items={[
            {
              photo,
              lines: [
                { role: "heading", text: heading },
                ...(secondary ? [{ role: "body" as const, text: secondary }] : []),
              ],
            },
          ]}
        />
      )}
    </KitCard>
  );
}

export function Profile(input: ProfileProps) {
  const { align, name, meta: supporting, photo, media } = input;
  const density = useVariant("density", meta.variants.density, input.density);
  const state = useComponentState();
  if (state === "loading") return <ProfileLoading {...input} density={density} />;
  const centered = align === "center";
  const lead =
    media === "none" ? undefined : photo ? (
      <KitPhoto photo={photo} shape={centered ? "avatar" : "round"} part="photo" label={name} />
    ) : (
      <KitIcon tone="muted" part="photo" />
    );
  const lines = (
    <>
      <KitText role={centered ? "title" : "heading"} part="name" {...{ align, density }}>
        {name}
      </KitText>
      {supporting && (
        <KitText role="body" tone="muted" part="meta" {...{ align, density }}>
          {supporting}
        </KitText>
      )}
    </>
  );
  if (centered) {
    return (
      <KitCard style="plain" padded part="root" {...{ align, density }}>
        {lead}
        {lines}
      </KitCard>
    );
  }
  return (
    <KitBlock
      label={name}
      lineRole="heading"
      leadingAlign={photo && input.detail !== "brief" ? "row" : "line"}
      leading={lead}
      density={density}
    >
      {lines}
    </KitBlock>
  );
}
