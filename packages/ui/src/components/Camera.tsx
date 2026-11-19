import { useWords, KitCard, KitShutter, KitViewfinder } from "../kit";
import {
  wordsFor,
  probesFor,
  clip,
  text,
  thingOf,
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
  parts: ["root", "viewfinder", "hint", "shutter"],
  states: ["filled"],
  actions: { parts: { shutter: ["press"] } },
  read: (input, state, lang?: string) => {
    const { photoLabels } = wordsFor(lang);

    const { kind } = input as z.output<typeof props>;
    return state === "filled" ? [kind === "scan" ? photoLabels.scan : photoLabels.take] : [];
  },
} as const satisfies Meta;

export const props = z.strictObject({
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
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Camera");
export const probes = [
  choose("Let me aim at my fern's leaves and take a new shot"),
  choose("Show an existing shot of my fern with a short caption underneath", "Photo"),
  write("Let me aim at my plant's leaves and take a new shot, with a short instruction"),
  read("Take the photo", { address: "c1/shutter", action: "press" }),
] satisfies Probe[];

export function Camera({ kind, hint }: Props<typeof props, typeof meta>) {
  const { photoLabels } = useWords().words;
  return (
    <KitCard style="plain" part="root">
      <KitViewfinder kind={kind} hint={hint} part="viewfinder" hintPart="hint" />
      <KitShutter label={kind === "scan" ? photoLabels.scan : photoLabels.take} part="shutter" />
    </KitCard>
  );
}
