import { z } from "zod";
import {
  probesFor,
  clip,
  icon,
  placeholderTitle,
  screenId,
  text,
  thingOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitAction, KitBlock, KitText } from "../kit";

export const meta = {
  id: "Header",
  group: "structure",
  purpose: "Name the screen and offer one optional shortcut.",
  pick: "The title at the top of a screen. Not a label above a group (SectionTitle) or the screen's main message (Hero).",
  region: "top",
  weight: 1,
  tier: "phone",
  realPath: "The screen's title and navigation links in the on-device app.",
  parts: ["root", "title", "sub", "action", "back"],
  states: ["filled"],
  actions: { parts: { action: ["press"], back: ["press"] }, when: { back: { style: "back" } } },
} as const satisfies Meta;

export const props = z
  .strictObject({
    style: z.enum(["large", "inline", "back"]).default("large"),
    title: text(28),
    sub: text(40).optional(),
    action: z.strictObject({ icon, label: text(16), goto: screenId.optional() }).optional(),
  })
  // The shared reader distinguishes an absent optional part by its explicit undefined value.
  .overwrite((value) => ({ ...value, action: value.action }));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const type = thingOf(cast)?.type.replace(/_/g, " ").trim();
  return {
    style: "large",
    title: type ? clip(type.charAt(0).toUpperCase() + type.slice(1), 28) : placeholderTitle(0, lang),
  };
}

export const examples = [
  {
    style: "large",
    title: "My plants",
    sub: "Three need water today",
    action: { icon: "plus", label: "Add a plant", goto: "new_plant" },
  },
  {
    style: "inline",
    title: "Today's walks",
    sub: "Two bookings before lunch",
    action: { icon: "calendar", label: "View schedule", goto: "schedule" },
  },
  { style: "back", title: "Fern", sub: "Bathroom · watered today" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Header");
export const probes = [
  choose("Put the name of this screen at the top with a shortcut to add a plant"),
  choose("Put a short label just above the group of plants that need water", "SectionTitle"),
  write("Name this screen My plants, with a shortcut to add a plant"),
  read("Add a plant", { address: "h1/action", action: "press" }),
] satisfies Probe[];

export function Header({ style, title, sub, action }: Props<typeof props, typeof meta>) {
  return (
    <KitBlock
      label={title}
      lineRole={style === "large" ? "title" : "heading"}
      leading={
        style === "back" ? (
          <KitAction kind="quiet" icon="chevron_left" part="back" a11y={title} goto="back" />
        ) : undefined
      }
      trailing={
        action ? (
          <KitAction kind="quiet" icon={action.icon} part="action" a11y={action.label} goto={action.goto} />
        ) : undefined
      }
    >
      <KitText role={style === "large" ? "title" : "heading"} part="title">
        {title}
      </KitText>
      {sub && (
        <KitText role="caption" tone="muted" part="sub">
          {sub}
        </KitText>
      )}
    </KitBlock>
  );
}
