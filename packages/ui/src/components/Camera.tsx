import { useWords, KitCard, KitShutter, KitViewfinder } from "../kit";
import {
  wordsFor,
  probesFor,
  clip,
  text,
  thingOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { z } from "zod";

export const meta = {
  id: "Camera",
  group: "beyond",
  purpose: "Aim at something and take a new picture or scan its code.",
  pick: "Take a new picture or scan a code while aiming at the subject. Not showing an existing picture (Photo), or adding a picture to a labelled form value (Field).",
  region: "body",
  weight: 3,
  tier: "ok",
  realPath: "With permission, the device camera takes a photo or scans a code.",
  variants: { surface: ["plain", "card"] },
  writeHints: ['Use surface "card" only when asked for one card around the viewfinder and shutter together.'],
  parts: ["root", "viewfinder", "hint", "shutter"],
  states: ["filled"],
  actions: { parts: { shutter: ["press"] } },
  read: (input, state, lang?: string): string[] => {
    const { photoLabels } = wordsFor(lang);

    const { kind } = input as z.output<typeof props>;
    return state === "filled" ? [kind === "scan" ? photoLabels.scan : photoLabels.take] : [];
  },
} as const satisfies Meta;

export const props = z.strictObject({
  ...variantProps(meta.variants),
  kind: z.enum(["photo", "scan"]).default("photo"),
  hint: text(48),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = wordsFor(lang);

  const type = thingOf(cast)?.type.replace(/[_-]+/g, " ").trim();
  return { kind: "photo", hint: type ? clip(type, 48) : placeholderDetail };
}

export const examples = [
  { kind: "photo", hint: "Point at your plant's leaves" },
  { kind: "scan", hint: "Scan the dog's tag" },
  { kind: "photo", hint: "Point at your plant's leaves", surface: "card" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Camera");
export const probes = [
  choose("Let me aim at my fern's leaves and take a new shot"),
  choose("Show an existing shot of my fern with a short caption underneath", "Photo"),
  write("Let me aim at my plant's leaves and take a new shot, with a short instruction"),
  {
    ...write("Let me take a photo of my fern. Put the viewfinder and shutter together inside one card."),
    variant: { axis: "surface", value: "card" },
  },
  read("Take the photo", { address: "c1/shutter", action: "press" }),
] satisfies Probe[];

export function Camera({ kind, hint, surface }: Props<typeof props, typeof meta>) {
  const { photoLabels } = useWords().words;
  return (
    <KitCard style="plain" part="root" surface={surface} padded={surface === "card"}>
      <KitViewfinder kind={kind} hint={hint} part="viewfinder" hintPart="hint" />
      <KitShutter label={kind === "scan" ? photoLabels.scan : photoLabels.take} part="shutter" />
    </KitCard>
  );
}
