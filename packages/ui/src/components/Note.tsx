import {
  wordsFor,
  probesFor,
  detailOf,
  icon,
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
import { KitIcon, KitBlock, KitText } from "../kit";

export const meta = {
  id: "Note",
  group: "content",
  purpose: "One short sentence of supporting information.",
  pick: "Add a short supporting sentence. Not something to notice now (Banner), the screen's main statement (Hero) or text the person writes (Composer).",
  writeHints: [
    'An ordinary icon uses the icon field alone. To hide a supplied icon, keep the icon field and use media "none"; density, emphasis and tone remain null unless specifically requested.',
    'A supporting line is a normal Note, not a request for quiet emphasis. Use "quiet" only for a smaller, muted treatment, or "hero" for an explicitly prominent quotation with the quote icon.',
  ],
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "A short text field on one thing in the on-device database.",
  variants: {
    density: ["comfortable", "compact"],
    emphasis: ["normal", "quiet", "hero"],
    media: ["icon", "none"],
    tone: ["neutral", "good", "warn", "bad"],
  },
  variantParts: { "media.none": { hides: ["icon"] } },
  parts: ["root", "text", "icon"],
  states: ["filled"],
} as const satisfies Meta;

export const props = z
  .strictObject({ ...variantProps(meta.variants), text: text(120), icon: icon.optional() })
  .overwrite((value) => ({ ...value, ...(value.media === "none" ? { icon: undefined } : {}) }));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = wordsFor(lang);

  const item = cast.items[0];
  const thing = item ? thingOf(cast, item.type) : undefined;
  const line = item ? (detailOf(item, 120, thing) ?? titleOf(item, 120, thing)) : undefined;
  return { text: line ?? placeholderDetail };
}

export const examples = [
  {
    text: "Keep your fern in indirect light.",
    icon: "sun",
  },
  {
    text: "Keep Clover on a short lead.",
    tone: "warn",
  },
  {
    emphasis: "hero",
    icon: "quote",
    text: "Clover loves a slow walk.",
  },
  { text: "Keep your fern in indirect light.", icon: "sun", emphasis: "quiet" },
  { text: "Fern is thriving.", tone: "good", icon: "leaf" },
  { text: "Fern is thriving.", density: "compact", icon: "leaf" },
  { text: "Fern is thriving.", icon: "leaf" },
  { text: "Clover's booking was missed.", tone: "bad" },
  { text: "Pip likes shaded routes.", icon: "sun", media: "none" },
  { text: "Pip likes shaded routes.", icon: "sun" },
] satisfies z.input<typeof props>[];

const { choose, write } = probesFor("Note");
export const probes = [
  choose("Add a little supporting line explaining that ferns prefer indirect light"),
  choose("Make an urgent warning stand out now that today's dog walk has been cancelled", "Banner"),
  write("Add a small reminder to keep Clover on a short lead near the road"),
  {
    ...write(
      "Add a supporting line: Ferns prefer indirect light. Save the sun icon with it, but show the sentence without the icon.",
    ),
    variant: { axis: "media", value: "none" },
  },
] satisfies Probe[];

export function Note({ text, tone, icon, density, emphasis }: Props<typeof props, typeof meta>) {
  const textTone = tone === "neutral" ? (emphasis === "quiet" ? "muted" : "text") : tone;
  return (
    <KitBlock
      label={text}
      {...{ density, emphasis }}
      leading={icon && <KitIcon name={icon} tone={tone === "neutral" ? "muted" : tone} part="icon" />}
    >
      <KitText role="body" tone={textTone} part="text" {...{ density, emphasis }}>
        {text}
      </KitText>
    </KitBlock>
  );
}
