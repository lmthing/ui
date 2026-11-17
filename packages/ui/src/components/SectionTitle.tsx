import { z } from "zod";
import {
  clip,
  placeholderTitle,
  screenId,
  text,
  thingOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitAction, KitBlock, KitText } from "../kit";

export const meta = {
  id: "SectionTitle",
  group: "structure",
  purpose: "Label a group of content and offer one optional link to more.",
  pick: "A short label just above a group within a screen. Not the screen's title at the top (Header) or its main message (Hero).",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "A label above a group and an optional navigation link in the on-device app.",
  parts: ["root", "text", "link"],
  states: ["filled"],
  actions: { parts: { link: ["press"] } },
  aliases: ["sectionheading", "grouplabel", "groupheading", "sectionlabel"],
} as const satisfies Meta;

export const props = z
  .strictObject({
    text: text(32),
    link: z.strictObject({ label: text(16), goto: screenId.optional() }).optional(),
  })
  // The shared reader distinguishes an absent optional part by its explicit undefined value.
  .overwrite((value) => ({ ...value, link: value.link }));

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const type = thingOf(cast)?.type.replace(/_/g, " ").trim();
  return {
    text: type ? clip(type.charAt(0).toUpperCase() + type.slice(1), 32) : placeholderTitle(0),
  };
}

export const examples = [
  { text: "Needs water", link: { label: "See all", goto: "plants" } },
  { text: "Today's walks" },
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "Put a short label just above the group of plants that need water",
    expect: "SectionTitle",
  },
  {
    kind: "choose",
    need: "Put the name of this screen at the top with a shortcut to add a plant",
    expect: "Header",
  },
  {
    kind: "write",
    brief: "Label the plants needing water Needs water, with a See all link to plants",
    expect: "SectionTitle",
  },
  {
    kind: "read",
    screen: 0,
    task: "See all plants",
    expect: { address: "s1/link", action: "press" },
  },
] satisfies Probe[];

export function SectionTitle({ text, link }: Props<typeof props, typeof meta>) {
  return (
    <KitBlock
      label={text}
      trailing={link && <KitAction kind="quiet" label={link.label} part="link" goto={link.goto} />}
    >
      <KitText role="label" tone="muted" part="text">
        {text}
      </KitText>
    </KitBlock>
  );
}
