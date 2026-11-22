import { z } from "zod";
import {
  probesFor,
  clip,
  icon,
  placeholderTitle,
  screenId,
  text,
  thingOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitAction, KitBlock, KitText, useVariant } from "../kit";
import { prompt } from "../entry/prompt-Header.generated";

export const meta = {
  id: "Header",
  group: "structure",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "top",
  weight: 1,
  tier: "phone",
  realPath: "The screen's title and navigation links in the on-device app.",
  variants: {
    density: ["comfortable", "compact"],
    emphasis: ["normal", "quiet"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["sub"] } },
  parts: ["root", "title", "sub", "action", "back"],
  states: ["filled"],
  actions: { parts: { action: ["press"], back: ["press"] }, when: { back: { style: "back" } } },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    style: z.enum(["back"]).optional(),
    title: text(28),
    sub: text(40).optional(),
    action: z.strictObject({ icon, label: text(16), goto: screenId.optional() }).optional(),
  })
  // The shared reader distinguishes an absent optional part by its explicit undefined value.
  .overwrite((value) => ({
    ...value,
    action: value.action,
    ...(value.detail === "brief" ? { sub: undefined } : {}),
  }));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const type = thingOf(cast)?.type.replace(/_/g, " ").trim();
  return {
    title: type ? clip(type.charAt(0).toUpperCase() + type.slice(1), 28) : placeholderTitle(0, lang),
  };
}

export const examples = [
  {
    title: "My plants",
    sub: "Three need water today",
    action: { icon: "plus", label: "Add a plant", goto: "new_plant" },
  },
  {
    emphasis: "quiet",
    title: "Today's walks",
    sub: "Two bookings before lunch",
    action: { icon: "calendar", label: "View schedule", goto: "schedule" },
  },
  { style: "back", title: "Fern", sub: "Bathroom · watered today" },
  {
    title: "Today's walks",
    sub: "Two bookings before lunch",
    action: { icon: "calendar", label: "View schedule", goto: "schedule" },
  },
  {
    title: "My plants",
    sub: "Three need water today",
    detail: "brief",
    action: { icon: "plus", label: "Add a plant", goto: "new_plant" },
  },
  {
    title: "My plants",
    sub: "Three need water today",
    action: { icon: "plus", label: "Add a plant", goto: "new_plant" },
    density: "compact",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Header");
export const probes = [
  choose("Put the name of this screen at the top with a shortcut to add a plant"),
  choose("Put a short label just above the group of plants that need water", "SectionTitle"),
  write("Name this screen My plants, with a shortcut to add a plant"),
  {
    ...write(
      "At the top show My plants. Keep the subtitle Watering schedule in the data, but show just the title for now.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Add a plant", { address: "h1/action", action: "press" }),
] satisfies Probe[];

export function Header(input: Props<typeof props, typeof meta>) {
  const { style, title, sub, action, emphasis } = input;
  const density = useVariant("density", meta.variants.density, input.density);
  const role = style === "back" ? "heading" : "title";
  return (
    <KitBlock
      label={title}
      lineRole={role}
      {...{ density, emphasis }}
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
      <KitText role={role} part="title" {...{ density, emphasis }}>
        {title}
      </KitText>
      {sub && (
        <KitText role="caption" tone="muted" part="sub" density={density}>
          {sub}
        </KitText>
      )}
    </KitBlock>
  );
}
