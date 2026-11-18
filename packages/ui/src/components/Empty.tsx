import { z } from "zod";
import {
  clip,
  emptyLine,
  icon,
  messageLabels,
  placeholderDetail,
  text,
  thingOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitAction, KitCard, KitEmpty } from "../kit";

export const meta = {
  id: "Empty",
  group: "content",
  purpose: "A calm message on a screen that has no content yet.",
  pick: "Only when there is no content or no results yet, explaining their absence. Not the screen's main statement about what exists or needs attention (Hero), a separate warning or status notice (Banner), or a supporting sentence (Note).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The absence of results from a query over one thing in the on-device database.",
  parts: ["root", "icon", "title", "sub", "retry"],
  states: ["filled"],
  // Only a message about something that failed offers another try.
  actions: { parts: { retry: ["press"] }, when: { retry: { retryable: true } } },
  read: (input) => ((input as { kind: string }).kind === "none" ? [] : [messageLabels.retry]),
} as const satisfies Meta;

export const props = z
  .strictObject({
    title: text(40),
    sub: text(100).optional(),
    icon: icon.optional(),
    kind: z.enum(["none", "error", "offline"]).default("none"),
  })
  // Derived, never written: a failed or offline message offers a retry.
  .overwrite((value) => ({ ...value, retryable: value.kind !== "none" }));

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  return {
    title: clip(emptyLine(thingOf(cast)?.type), 40),
    sub: placeholderDetail,
  };
}

export const examples = [
  { title: "No plants yet", icon: "leaf" },
  { title: "No walks today", sub: "Booked walks will appear here." },
  { title: "Couldn't load your walks", sub: "Check your connection and try again.", kind: "error" },
  { title: "You're offline", kind: "offline" },
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "My plant collection has nothing in it yet; show a calm message saying there are no plants",
    expect: "Empty",
  },
  {
    kind: "choose",
    need: "Make 2 the single large main number on my plant screen, with plants need water today underneath",
    expect: "Hero",
  },
  {
    kind: "write",
    brief: "My walks could not be loaded. Show a calm message that says what went wrong.",
    expect: "Empty",
  },
  {
    kind: "write",
    brief:
      "My plant collection has no plants yet. Say so with a leaf symbol and explain that added plants will appear here.",
    expect: "Empty",
  },
] satisfies Probe[];

const kindIcon = { none: undefined, error: "alert", offline: "wifi" } as const;

export function Empty({ title, sub, icon, kind }: Props<typeof props, typeof meta>) {
  const shown = icon ?? kindIcon[kind];
  return (
    <KitCard style="plain" part="root">
      <KitEmpty title={title} {...(sub ? { sub } : {})} {...(shown ? { icon: shown } : {})} fill />
      {kind !== "none" && <KitAction label={messageLabels.retry} kind="secondary" part="retry" full />}
    </KitCard>
  );
}
