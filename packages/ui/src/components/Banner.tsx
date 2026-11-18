import { z } from "zod";
import {
  detailOf,
  icon,
  placeholderDetail,
  screenId,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitBlock, KitIcon, KitText } from "../kit";

export const meta = {
  id: "Banner",
  group: "content",
  purpose: "Something important to notice now, with an optional link to act.",
  pick: "An immediate warning or status update that stands out at the top. Not a supporting sentence (Note), the screen's main statement (Hero) or a panel with more detail (Sheet).",
  region: "top",
  weight: 2,
  tier: "phone",
  realPath: "A current status message and optional navigation link in the on-device app.",
  parts: ["root", "icon", "text"],
  states: ["filled"],
  actions: { parts: { root: ["press"] }, when: { root: { linked: true } } },
  aliases: ["notice", "notification", "alert", "announcement"],
} as const satisfies Meta;

export const props = z
  .strictObject({
    text: text(80),
    icon: icon.optional(),
    tone: z.enum(["neutral", "good", "warn", "bad"]).default("warn"),
    goto: screenId.optional(),
  })
  // actions.when compares values; derive link presence without adding a model-written prop.
  .overwrite((value) => ({ ...value, linked: value.goto !== undefined }));

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const item = cast.items[0];
  const thing = item ? thingOf(cast, item.type) : undefined;
  const line = item ? (detailOf(item, 80, thing) ?? titleOf(item, 80, thing)) : undefined;
  return { text: line ?? placeholderDetail, tone: "neutral" };
}

export const examples = [
  { text: "All plants watered", tone: "good" },
  {
    text: "Today's 4pm walk is cancelled",
    icon: "alert",
    tone: "warn",
    goto: "walk_details",
  },
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "Make an urgent warning stand out now that today's dog walk has been cancelled",
    expect: "Banner",
  },
  {
    kind: "choose",
    need: "Add a little supporting line explaining that ferns prefer indirect light",
    expect: "Note",
  },
  {
    kind: "write",
    brief: "Warn me that today's 4pm dog walk is cancelled and let me open walk_details",
    expect: "Banner",
  },
  {
    kind: "read",
    screen: 1,
    task: "Open the banner",
    expect: { address: "b1", action: "press" },
  },
] satisfies Probe[];

export function Banner({ text, icon, tone, goto }: Props<typeof props, typeof meta>) {
  const names = { neutral: "info", good: "circle_check", warn: "alert", bad: "close" } as const;
  const name = icon ?? names[tone];
  return (
    <KitBlock
      label={text}
      tone={tone}
      goto={goto}
      leading={<KitIcon name={name} tone={tone === "neutral" ? "accent" : tone} part="icon" />}
      trailing={goto ? <KitIcon name="chevron_right" decorative /> : undefined}
    >
      <KitText role="body" part="text">
        {text}
      </KitText>
    </KitBlock>
  );
}
