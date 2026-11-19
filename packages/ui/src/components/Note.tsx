import {
  wordsFor,
  probesFor,
  detailOf,
  icon,
  text,
  thingOf,
  titleOf,
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
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "A short text field on one thing in the on-device database.",
  parts: ["root", "text", "icon"],
  states: ["filled"],
} as const satisfies Meta;

export const props = z.strictObject({
  style: z.enum(["body", "quote", "hint"]).default("body"),
  text: text(120),
  tone: z.enum(["neutral", "good", "warn", "bad"]).default("neutral"),
  icon: icon.optional(),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = wordsFor(lang);

  const item = cast.items[0];
  const thing = item ? thingOf(cast, item.type) : undefined;
  const line = item ? (detailOf(item, 120, thing) ?? titleOf(item, 120, thing)) : undefined;
  return { style: "body", text: line ?? placeholderDetail };
}

export const examples = [
  {
    style: "hint",
    text: "Keep your fern in indirect light.",
    tone: "neutral",
    icon: "sun",
  },
  {
    style: "body",
    text: "Keep Clover on a short lead.",
    tone: "warn",
  },
  {
    style: "quote",
    text: "Clover loves a slow walk.",
  },
] satisfies z.input<typeof props>[];

const { choose, write } = probesFor("Note");
export const probes = [
  choose("Add a little supporting line explaining that ferns prefer indirect light"),
  choose("Make an urgent warning stand out now that today's dog walk has been cancelled", "Banner"),
  write("Add a small reminder to keep Clover on a short lead near the road"),
] satisfies Probe[];

export function Note({ style, text, tone, icon }: Props<typeof props, typeof meta>) {
  const role = style === "quote" ? "heading" : style === "hint" ? "label" : "body";
  const textTone = tone === "neutral" ? (style === "hint" ? "muted" : "text") : tone;
  const name = icon ?? (style === "quote" ? "quote" : style === "hint" ? "lightbulb" : undefined);
  return (
    <KitBlock
      label={text}
      leading={name && <KitIcon name={name} tone={tone === "neutral" ? "muted" : tone} part="icon" />}
    >
      <KitText role={role} tone={textTone} part="text">
        {text}
      </KitText>
    </KitBlock>
  );
}
