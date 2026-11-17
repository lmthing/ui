import { z } from "zod";
import {
  icon,
  placeholderDetail,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitCard, KitEmpty } from "../kit";

export const meta = {
  id: "Success",
  group: "action",
  purpose: "Proof that the action you just took worked.",
  pick: "A standalone moment after an action worked, with a result title and optional detail. Not an ongoing status or urgent warning at the top (Banner), or a screen with no content yet (Empty).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The result of an action that saved or changed an item in the on-device database.",
  parts: ["root", "icon", "title", "sub"],
  states: ["filled"],
  aliases: ["confirmation", "completed", "receipt"],
} as const satisfies Meta;

export const props = z.strictObject({
  title: text(40),
  sub: text(100).optional(),
  icon: icon.default("circle_check"),
});

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const item = cast.items[0];
  const sub = item ? titleOf(item, 100, thingOf(cast, item.type)) : undefined;
  return { title: "Saved", sub: sub ?? placeholderDetail };
}

export const examples = [
  { title: "Fern watered", icon: "leaf" },
  { title: "Walk booked", sub: "Clover, tomorrow at 09:00" },
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "After I book a dog walk, show a dedicated screen saying it worked and when the walk is",
    expect: "Success",
  },
  {
    kind: "choose",
    need: "Make an urgent warning stand out at the top because today's dog walk has been cancelled",
    expect: "Banner",
  },
  {
    kind: "write",
    brief:
      "I just booked a walk for Clover tomorrow at 09:00. Show that the booking worked, with a check symbol and the dog and time underneath.",
    expect: "Success",
  },
] satisfies Probe[];

export function Success({ title, sub, icon }: Props<typeof props, typeof meta>) {
  return (
    <KitCard style="plain" part="root">
      <KitEmpty title={title} {...(sub ? { sub } : {})} icon={icon} fill tone="good" />
    </KitCard>
  );
}
