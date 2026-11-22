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
import { prompt } from "../entry/prompt-Canvas.generated";

export const meta = {
  id: "Canvas",
  group: "escape",
  purpose: prompt.purpose,
  pick: prompt.pick,
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
  { caption: "Garden sketchpad" },
  { caption: "Guess the dog breed" },
  { caption: "Garden sketchpad" },
] satisfies z.input<typeof props>[];

const { choose, write } = probesFor("Canvas");
export const probes = [
  choose("Let me draw with my finger to sketch where each plant goes"),
  choose("My plant collection has no plants yet; show a calm message explaining that", "Empty"),
  write("A game where I guess the dog breed and earn points for correct answers"),
] satisfies Probe[];

export function Canvas({ caption }: Props<typeof props, typeof meta>) {
  const surface = "outlined";
  return (
    <KitCard surface={surface} part="root" padded>
      <KitEmpty title={caption} part="caption" icon="palette" fill={surface === "outlined"} decorativeIcon />
    </KitCard>
  );
}
