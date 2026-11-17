import { z } from "zod";
import {
  detailOf,
  icon,
  photo,
  placeholderDetail,
  placeholderTitle,
  screenId,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import {
  KitCard,
  KitContent,
  KitIcon,
  KitPhoto,
  KitSkeleton,
  KitText,
  useComponentState,
  useKit,
} from "../kit";

export const meta = {
  id: "Card",
  group: "content",
  purpose: "One thing with a little detail, optionally tappable to open it.",
  pick: "A compact preview of one thing, with a title and short detail, optionally opening it. Not several separate things to scan (List) or the screen's main headline (Hero).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A preview of one record and optional navigation link in the on-device app.",
  parts: ["root", "icon", "photo", "title", "body", "meta"],
  states: ["filled", "loading"],
  actions: { parts: { root: ["press"] }, when: { root: { linked: true } } },
  aliases: ["tile", "summary", "panel"],
} as const satisfies Meta;

export const props = z
  .strictObject({
    style: z.enum(["plain", "tinted", "outlined", "media"]).default("plain"),
    title: text(40),
    body: text(120).optional(),
    meta: text(24).optional(),
    icon: icon.optional(),
    photo: photo.optional(),
    tone: z.enum(["neutral", "good", "warn", "bad"]).default("neutral"),
    goto: screenId.optional(),
  })
  .refine((value) => !(value.icon && value.photo), { path: ["photo"] })
  // Derive link presence for actions.when without accepting a model-written flag.
  .overwrite((value) => ({ ...value, linked: value.goto !== undefined }));

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const item = cast.items[0];
  const thing = item ? thingOf(cast, item.type) : undefined;
  return {
    style: "plain",
    title: (item && titleOf(item, 40, thing)) || placeholderTitle(0),
    body: (item && detailOf(item, 120, thing)) || placeholderDetail,
  };
}

export const examples = [
  {
    style: "media",
    title: "Fern",
    body: "Bathroom · soft indirect light",
    meta: "Water today",
    photo: "lib:plants",
    goto: "fern",
  },
  {
    style: "tinted",
    title: "Morning park walk",
    body: "Clover and Pip · 09:00",
    meta: "Booking confirmed",
    icon: "dog",
    tone: "good",
  },
  { style: "plain", title: "Monstera", body: "Living room · water Friday", photo: "lib:plants" },
  {
    style: "outlined",
    title: "Basil",
    body: "Kitchen · freshly watered",
    icon: "leaf",
    goto: "basil",
  },
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "Show one tappable preview of my fern with a short care detail, so I can open it",
    expect: "Card",
  },
  { kind: "choose", need: "Show several plants and let me tap each one to open it", expect: "List" },
  {
    kind: "write",
    brief: "One fern with a photo, Bathroom as its short detail, Water today underneath, opening fern",
    expect: "Card",
  },
  {
    kind: "read",
    screen: 0,
    task: "Open the fern card",
    expect: { address: "c1", action: "press" },
  },
] satisfies Probe[];

export function Card({
  style,
  title,
  body,
  meta: detail,
  icon,
  photo,
  tone,
  goto,
}: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  const { resolvePhoto } = useKit();
  const media = style === "media";
  const hasPhoto = media && Boolean(photo && resolvePhoto?.(photo));
  const lead = icon ? (
    <KitIcon name={icon} part="icon" />
  ) : photo && !media ? (
    <KitPhoto photo={photo} part="photo" />
  ) : undefined;
  return (
    <KitCard
      style="inset"
      look={style === "tinted" || style === "outlined" ? style : "surface"}
      tone={style === "tinted" ? tone : "neutral"}
      clip={media}
      padded={state !== "loading"}
      part="root"
      goto={state === "loading" ? undefined : goto}
      label={title}
    >
      {state === "loading" ? (
        <KitSkeleton rows={1} shape={media ? "media" : "rows"} lead={icon ? "dot" : photo ? "box" : "none"} />
      ) : (
        <>
          {hasPhoto && photo && <KitPhoto photo={photo} shape="wide" part="photo" />}
          <KitContent lead={lead} lineRole="heading">
            <KitText role="heading" part="title">
              {title}
            </KitText>
            {body && (
              <KitText role="body" tone="muted" part="body">
                {body}
              </KitText>
            )}
            {detail && (
              <KitText role="caption" tone="muted" part="meta">
                {detail}
              </KitText>
            )}
          </KitContent>
        </>
      )}
    </KitCard>
  );
}
