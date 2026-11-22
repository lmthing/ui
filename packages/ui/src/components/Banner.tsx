import {
  wordsFor,
  probesFor,
  detailOf,
  icon,
  screenId,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
  variantProps,
} from "../catalog";
import { z } from "zod";
import { KitBlock, KitIcon, KitText } from "../kit";

export const meta = {
  id: "Banner",
  group: "content",
  purpose: "Something important to notice now, with an optional link to act.",
  pick: "A separate warning or status strip above the main content, such as a closure or cancellation. Not the screen's main headline even when it counts what needs attention (Hero), a supporting sentence (Note) or a panel with more detail (Sheet).",
  writeHints: [
    'The default banner is already a warning. A request to warn someone does not set tone; leave it null unless the brief requests a different status treatment. To hide the icon, set only media to "none"; otherwise use null for media and put a custom icon in icon.',
  ],
  region: "top",
  weight: 2,
  tier: "phone",
  realPath: "A current status message and optional navigation link in the on-device app.",
  variants: {
    media: ["icon", "none"],
    tone: ["warn", "neutral", "good", "bad"],
  },
  variantParts: { "media.none": { hides: ["icon"] } },
  parts: ["root", "icon", "text"],
  states: ["filled"],
  actions: { parts: { root: ["press"] }, when: { root: { linked: true } } },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    text: text(80),
    icon: icon.optional(),
    goto: screenId.optional(),
  })
  // actions.when compares values; derive link presence without adding a model-written prop.
  .overwrite((value) => ({
    ...value,
    ...(value.media === "none" ? { icon: undefined } : {}),
    linked: value.goto !== undefined,
  }));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = wordsFor(lang);

  const item = cast.items[0];
  const thing = item ? thingOf(cast, item.type) : undefined;
  const line = item ? (detailOf(item, 80, thing) ?? titleOf(item, 80, thing)) : undefined;
  return { text: line ?? placeholderDetail, tone: "neutral" };
}

export const examples = [
  { text: "All plants watered", tone: "good" },
  {
    text: "4pm walk cancelled",
    icon: "alert",
    goto: "walk_details",
  },
  { text: "Booking closes at noon" },
  { text: "Booking closes at noon" },
  { text: "Walk status updated", tone: "neutral" },
  { text: "Walk status updated" },
  { text: "Payment failed", tone: "bad" },
  { text: "Payment failed" },
  { text: "Walks may start late", media: "none" },
  { text: "Walks may start late" },
  { text: "All plants watered" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Banner");
export const probes = [
  choose("Make an urgent warning stand out now that today's dog walk has been cancelled"),
  choose("Add a little supporting line explaining that ferns prefer indirect light", "Note"),
  write("Warn me that today's 4pm dog walk is cancelled and let me open walk_details"),
  {
    ...write("Warn me that the park gate is closed. Show the warning text without any icon."),
    variant: { axis: "media", value: "none" },
  },
  read("Open the banner", { address: "b1", action: "press" }, 1),
] satisfies Probe[];

export function Banner({ text, icon, tone, goto, media }: Props<typeof props, typeof meta>) {
  const surface = "tinted";
  const names = { neutral: "info", good: "circle_check", warn: "alert", bad: "close" } as const;
  const name = icon ?? names[tone];
  return (
    <KitBlock
      label={text}
      tone={tone}
      goto={goto}
      surface={surface}
      leading={
        media === "icon" && <KitIcon name={name} tone={tone === "neutral" ? "accent" : tone} part="icon" />
      }
      trailing={goto ? <KitIcon name="chevron_right" decorative /> : undefined}
    >
      <KitText role="body" part="text">
        {text}
      </KitText>
    </KitBlock>
  );
}
