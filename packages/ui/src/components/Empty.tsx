import { z } from "zod";
import {
  clip,
  emptyLine,
  icon,
  placeholderDetail,
  text,
  thingOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitCard, KitEmpty } from "../kit";

export const meta = {
  id: "Empty",
  group: "content",
  purpose: "A calm message on a screen that has no content yet.",
  pick: "Only when there is no content or no results yet, explaining their absence. Not the screen's main statement about what exists or needs attention (Hero), a separate warning or status notice (Banner), or a supporting sentence (Note).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The absence of results from a query over one thing in the on-device database.",
  parts: ["root", "icon", "title", "sub"],
  states: ["filled"],
  aliases: ["blank", "absence", "unstarted"],
} as const satisfies Meta;

export const props = z.strictObject({
  title: text(40),
  sub: text(100).optional(),
  icon: icon.optional(),
});

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  return {
    title: clip(emptyLine(thingOf(cast)?.type), 40),
    sub: placeholderDetail,
  };
}

export const examples = [
  { title: "No plants yet", icon: "leaf" },
  { title: "No walks today", sub: "Booked walks will appear here." },
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "My plant collection has nothing in it yet; show a calm message saying there are no plants",
    expect: "Empty",
  },
  {
    kind: "choose",
    need: "Make the main message on my plant screen say that two plants need water today",
    expect: "Hero",
  },
  {
    kind: "write",
    brief:
      "My plant collection has no plants yet. Say so with a leaf symbol and explain that added plants will appear here.",
    expect: "Empty",
  },
] satisfies Probe[];

export function Empty({ title, sub, icon }: Props<typeof props, typeof meta>) {
  return (
    <KitCard style="plain" part="root">
      <KitEmpty title={title} {...(sub ? { sub } : {})} {...(icon ? { icon } : {})} fill />
    </KitCard>
  );
}
