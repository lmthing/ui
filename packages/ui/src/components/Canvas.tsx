import { z } from "zod";
import {
  probesFor,
  placeholderTitle,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitCard, KitEmpty } from "../kit";

export const meta = {
  id: "Canvas",
  group: "escape",
  purpose: "An idea no existing component can express, such as a game or a drawing tool.",
  pick: "Only choose Canvas for an idea no other component can express, such as an interactive game or a drawing tool. Not a message about missing content (Empty), or an existing image to display (Photo).",
  region: "body",
  weight: 3,
  tier: "phone",
  realPath: "A custom on-device interaction not represented by the catalog, recorded by the host as a miss.",
  parts: ["root", "caption"],
  states: ["filled"],
} as const satisfies Meta;

export const props = z.strictObject({ caption: text(80) });

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const item = cast.items[0];
  const title = item ? titleOf(item, 80, thingOf(cast, item.type)) : undefined;
  return { caption: title ?? placeholderTitle(0, lang) };
}

export const examples = [
  { caption: "A drawing pad to sketch where each plant goes" },
  { caption: "A game: guess the dog breed" },
] satisfies z.input<typeof props>[];

const { choose, write } = probesFor("Canvas");
export const probes = [
  choose("Let me draw with my finger to sketch where each plant goes"),
  choose("My plant collection has no plants yet; show a calm message explaining that", "Empty"),
  write("A game where I guess the dog breed and earn points for correct answers"),
] satisfies Probe[];

export function Canvas({ caption }: Props<typeof props, typeof meta>) {
  return (
    <KitCard look="outlined" part="root" padded>
      <KitEmpty title={caption} part="caption" icon="palette" fill decorativeIcon />
    </KitCard>
  );
}
