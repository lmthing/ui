import { z } from "zod";
import {
  icon,
  placeholderLabel,
  screenId,
  text,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitAction } from "../kit";

export const meta = {
  id: "Button",
  group: "action",
  purpose: "One main thing the person does next.",
  pick: "One labelled action to press. Not two to four shortcuts (Actions) or a tappable summary of one thing (Card).",
  region: "bottom",
  weight: 1,
  tier: "phone",
  realPath: "A press runs an on-device action or opens the linked screen.",
  parts: ["root"],
  states: ["filled"],
  actions: { parts: { root: ["press"] } },
  aliases: ["button", "cta", "submit", "action"],
} as const satisfies Meta;

export const props = z.strictObject({
  label: text(24),
  kind: z.enum(["primary", "secondary", "quiet", "danger"]).default("primary"),
  icon: icon.optional(),
  goto: screenId.optional(),
});

export function fallback(_context: { cast: CastLike }): z.input<typeof props> {
  return { label: placeholderLabel, kind: "primary" };
}

export const examples = [
  { label: "Log watering", kind: "primary", icon: "drop" },
  { label: "Book a walk", kind: "primary", goto: "book_walk" },
  { label: "Remove plant", kind: "danger" },
  { label: "View schedule", kind: "secondary", icon: "clock", goto: "watering_schedule" },
  { label: "Back to walks", kind: "quiet", goto: "back" },
] satisfies z.input<typeof props>[];

export const probes = [
  { kind: "choose", need: "Let me log watering with one main tap", expect: "Button" },
  {
    kind: "choose",
    need: "Give me three shortcuts to log watering, add a plant and see the schedule",
    expect: "Actions",
  },
  { kind: "write", brief: "Let me book a dog walk and open the booking screen", expect: "Button" },
  {
    kind: "read",
    screen: 0,
    task: "Press the main button",
    expect: { address: "b1/root", action: "press" },
  },
] satisfies Probe[];

export function Button({ label, kind, icon, goto }: Props<typeof props, typeof meta>) {
  return (
    <KitAction
      label={label}
      icon={icon}
      kind={kind}
      goto={goto}
      part="root"
      full={kind === "primary" || kind === "danger"}
    />
  );
}
