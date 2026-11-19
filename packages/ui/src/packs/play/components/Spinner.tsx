import { z } from "zod";
import {
  itemsOf,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: Choice/default cannot draw an equal-probability random option or exhaust a draw pool.
export const meta = {
  id: "Spinner",
  status: "draft",
  group: "action",
  purpose: "Draw one named option at random, with or without repeats.",
  pick: "Pick one labelled option randomly. Not deliberate choices (Choice, Chips), numbered dice (Dice), balanced teams (TeamPicker), or votes (Poll).",
  writeHints: [
    "Write 2–6 distinct option labels. Never write selected index, used options, remaining count or stored draws.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  confirmParts: ["reset"],
  realPath: "Equal-probability draws are stored on the device; without repeats each option is used once.",
  items: { key: "options", parts: ["root", "label"] },
  parts: ["root", "result", "spin", "reset"],
  states: ["empty", "filled", "loading", "success"],
  actions: { parts: { spin: ["press"], reset: ["press"] }, when: { reset: { repeat: false } } },
} as const satisfies Meta;
export const props = z
  .strictObject({
    options: z
      .array(z.strictObject({ label: text(24) }))
      .min(2)
      .max(6),
    repeat: z.boolean().default(true),
    style: z.enum(["wheel", "strip"]).default("wheel"),
  })
  .refine(
    ({ options }) => new Set(options.map((option) => option.label.toLowerCase())).size === options.length,
    {
      path: ["options"],
      message: "Option labels must be distinct",
    },
  );
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const labels = itemsOf(cast, 6).map((item, index) => titleOf(item, 24, thing) ?? placeholderTitle(index));
  const options = [...new Map(labels.map((label) => [label.toLowerCase(), { label }])).values()];
  for (let index = 0; options.length < 2; index++) {
    const label = placeholderTitle(index);
    if (!options.some((option) => option.label.toLowerCase() === label.toLowerCase()))
      options.push({ label });
  }
  return { options };
}
export const examples = [
  // Ledge's plant-themed random challenge.
  { options: [{ label: "Leaves" }, { label: "Flowers" }, { label: "Seeds" }], style: "wheel" },
  // Trot's game-night challenges are drawn once each.
  { options: [{ label: "Mime" }, { label: "Sketch" }, { label: "Riddle" }], repeat: false, style: "strip" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Spinner");
export const probes = [
  choose("Spin to draw one named challenge randomly; remove it from the pool until reset"),
  choose("Let me deliberately choose a plan from three explained options, without randomness", "Choice"),
  write("A sliding strip draws Mime, Sketch or Riddle at random, without repeats"),
  read("Spin for a random option", { address: "s1/spin", action: "press" }),
  read("Restore all options to the draw pool", { address: "s1/reset", action: "press" }, 1),
] satisfies Probe[];
