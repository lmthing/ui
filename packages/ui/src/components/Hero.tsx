import { z } from "zod";
import {
  probesFor,
  detailOf,
  itemsOf,
  photo,
  placeholderDetail,
  placeholderTitle,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitCard, KitPhoto, KitSkeleton, KitText, useComponentState, useKit } from "../kit";

export const meta = {
  id: "Hero",
  group: "content",
  purpose: "The screen's main statement or headline number, including what needs attention today.",
  pick: "The screen's main message, photo-led introduction or headline number, even when it says something needs attention. Not a separate urgent alert or status update (Banner), a supporting sentence (Note), several numbers (Stats) or one sum of money as the point (Amount).",
  region: "body",
  weight: 3,
  tier: "phone",
  realPath: "A headline derived from content or a query in the on-device database.",
  parts: ["root", "title", "sub", "photo"],
  states: ["filled", "loading"],
} as const satisfies Meta;

export const props = z.strictObject({
  style: z.enum(["statement", "photo", "number"]).default("statement"),
  title: text(40),
  sub: text(80).optional(),
  photo: photo.optional(),
  tone: z.enum(["neutral", "good", "warn", "bad"]).default("neutral"),
});

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const item = itemsOf(cast, 1, cast.items[0]?.type)[0];
  const thing = thingOf(cast, item?.type);
  return {
    style: "statement",
    title: (item && titleOf(item, 40, thing)) || placeholderTitle(0),
    sub: (item && detailOf(item, 80, thing)) || placeholderDetail,
  };
}

export const examples = [
  { style: "number", title: "2", sub: "plants need water", tone: "warn" },
  {
    style: "photo",
    title: "Fresh air, happy dogs",
    sub: "Clover and Pip are ready for their morning park walk",
    photo: "lib:dogs",
  },
  {
    style: "statement",
    title: "Riverside walk",
    sub: "Clover's next walk starts at 09:00",
  },
] satisfies z.input<typeof props>[];

const { choose, write } = probesFor("Hero");
export const probes = [
  choose("Make the main message of my plant screen that two plants need water today"),
  choose("Add a small supporting sentence below my plants reminding me not to overwater", "Note"),
  write("Make the main number two, with plants need water underneath and a warning tone"),
] satisfies Probe[];

export function Hero({ style, title, sub, photo, tone }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  const { resolvePhoto } = useKit();
  if (state === "loading") {
    return (
      <KitCard style="cards" part="root">
        <KitSkeleton
          rows={1}
          lead="none"
          shape={style === "photo" && photo && resolvePhoto?.(photo) ? "media" : "headline"}
          inset="none"
        />
      </KitCard>
    );
  }
  const hasPhoto = style === "photo" && Boolean(photo && resolvePhoto?.(photo));
  return (
    <KitCard style="cards" part="root">
      {hasPhoto && photo && <KitPhoto photo={photo} shape="wide" part="photo" />}
      <KitText
        role={style === "number" ? "number" : style === "photo" ? "title" : "display"}
        tone={style === "number" ? (tone === "neutral" ? "accent" : tone) : "text"}
        part="title"
      >
        {title}
      </KitText>
      {sub && (
        <KitText role={style === "number" ? "label" : "body"} tone="muted" part="sub">
          {sub}
        </KitText>
      )}
    </KitCard>
  );
}
