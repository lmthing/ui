import { z } from "zod";
import {
  probesFor,
  clip,
  placeholderTitle,
  screenId,
  text,
  thingOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
  variantProps,
} from "../catalog";
import { KitAction, KitBlock, KitText, useKit } from "../kit";
import { prompt } from "../entry/prompt-SectionTitle.generated";

export const meta = {
  id: "SectionTitle",
  group: "structure",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "A label above a group and an optional navigation link in the on-device app.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["link", "link_label"] } },
  parts: ["root", "text", "link", "link_label"],
  states: ["filled"],
  actions: { parts: { link: ["press"] } },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    text: text(32),
    link: z.strictObject({ label: text(16), goto: screenId.optional() }).optional(),
  })
  // The shared reader distinguishes an absent optional part by its explicit undefined value.
  .overwrite((value) => ({ ...value, link: value.detail === "brief" ? undefined : value.link }));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const type = thingOf(cast)?.type.replace(/_/g, " ").trim();
  return {
    text: type ? clip(type.charAt(0).toUpperCase() + type.slice(1), 32) : placeholderTitle(0, lang),
  };
}

export const examples = [
  { text: "Needs water", link: { label: "See all", goto: "plants" } },
  { text: "Today's walks" },
  { text: "Upcoming walks", link: { label: "See schedule", goto: "schedule" } },
  { text: "Upcoming walks", link: { label: "See schedule", goto: "schedule" }, detail: "brief" },
  { text: "Needs water", link: { label: "See all", goto: "plants" } },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("SectionTitle");
export const probes = [
  choose("Put a short label just above the group of plants that need water"),
  choose("Put the name of this screen at the top with a shortcut to add a plant", "Header"),
  write("Label the plants needing water Needs water, with a See all link to plants"),
  {
    ...write("Label the group Needs water. Save its See all link to plants, but hide that link for now."),
    variant: { axis: "detail", value: "brief" },
  },
  read("See all plants", { address: "s1/link", action: "press" }),
] satisfies Probe[];

export function SectionTitle(input: Props<typeof props, typeof meta>) {
  const { text, link } = input;
  const density = useKit().density;
  return (
    <KitBlock
      label={text}
      density={density}
      trailing={link && <KitAction kind="quiet" label={link.label} part="link" goto={link.goto} />}
    >
      <KitText role="label" tone="muted" part="text" density={density}>
        {text}
      </KitText>
    </KitBlock>
  );
}
