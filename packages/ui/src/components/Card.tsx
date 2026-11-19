import {
  wordsFor,
  probesFor,
  detailOf,
  icon,
  photo,
  placeholderTitle,
  screenId,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { z } from "zod";
import {
  KitCard,
  KitContent,
  KitGrid,
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
  parts: ["root", "icon", "photo", "badge", "title", "body", "meta"],
  states: ["filled", "loading"],
  actions: { parts: { root: ["press"] }, when: { root: { linked: true } } },
} as const satisfies Meta;

export const props = z
  .strictObject({
    style: z.enum(["plain", "tinted", "outlined", "media"]).default("plain"),
    title: text(40),
    body: text(120).optional(),
    meta: text(24).optional(),
    badge: text(12).optional(),
    icon: icon.optional(),
    photo: photo.optional(),
    tone: z.enum(["neutral", "good", "warn", "bad"]).default("neutral"),
    goto: screenId.optional(),
  })
  .refine((value) => !(value.icon && value.photo), { path: ["photo"] })
  // Derive link presence for actions.when without accepting a model-written flag.
  .overwrite((value) => ({ ...value, linked: value.goto !== undefined }));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = wordsFor(lang);

  const item = cast.items[0];
  const thing = item ? thingOf(cast, item.type) : undefined;
  return {
    style: "plain",
    title: (item && titleOf(item, 40, thing)) || placeholderTitle(0, lang),
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
  { style: "plain", title: "Monstera", body: "Living room · due Friday", photo: "lib:plants" },
  {
    style: "outlined",
    title: "Basil",
    body: "Kitchen · freshly watered",
    icon: "leaf",
    goto: "basil",
  },
  { style: "plain", title: "Evening walk", body: "Pip · 18:30 · Hyde Park", badge: "Due today", icon: "dog" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Card");
export const probes = [
  choose("Show one tappable preview of my fern with a short care detail, so I can open it"),
  choose("Show several plants and let me tap each one to open it", "List"),
  write("One fern with a photo, Bathroom as its short detail, Water today underneath, opening fern"),
  write("One card for the evening walk with Pip at 18:30, with a small Due today label in the corner"),
  read("Open the fern card", { address: "c1", action: "press" }),
] satisfies Probe[];

function CardText({ title, body, meta: detail, badge }: Props<typeof props, typeof meta>) {
  const heading = (
    <KitText role="heading" part="title">
      {title}
    </KitText>
  );
  return (
    <>
      {badge ? (
        <KitGrid fitLast>
          {heading}
          <KitText role="label" tone="muted" part="badge">
            {badge}
          </KitText>
        </KitGrid>
      ) : (
        heading
      )}
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
    </>
  );
}

export function Card(input: Props<typeof props, typeof meta>) {
  const { style, title, icon, photo, tone, goto } = input;
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
        <KitSkeleton
          rows={1}
          shape={hasPhoto ? "media" : "figure"}
          lead={media ? "none" : icon ? "dot" : photo ? "box" : "none"}
          inset="card"
          aspect="wide"
          lines={[
            { text: title, role: "heading" },
            ...(input.body ? [{ text: input.body, role: "body" as const }] : []),
            ...(input.meta ? [{ text: input.meta, role: "caption" as const }] : []),
          ]}
        />
      ) : (
        <>
          {hasPhoto && photo && <KitPhoto photo={photo} shape="wide" part="photo" />}
          <KitContent lead={lead} lineRole="heading" leadingAlign={photo && !media ? "row" : "line"}>
            <CardText {...input} />
          </KitContent>
        </>
      )}
    </KitCard>
  );
}
