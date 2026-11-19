import * as catalog from "../catalog";
import type { FallbackInput, Meta, Probe, Props } from "../catalog";
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
  useVariant,
} from "../kit";

export const meta = {
  id: "Card",
  group: "content",
  purpose: "One thing with a little detail, optionally tappable to open it.",
  pick: "A compact preview of one thing, with a title and short detail, optionally opening it. Not several separate things to scan (List) or the screen's main headline (Hero).",
  writeHints: [
    "A wide photo above the text changes media to cover only; leave other axes null unless explicitly requested.",
    "Leave detail null for short copy; use brief only when asked to hide the body and meta. Keep both in the data.",
    "Use surface tinted with a semantic tone when status should colour the card.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A preview of one record and optional navigation link in the on-device app.",
  variants: {
    density: ["comfortable", "compact"],
    emphasis: ["normal", "quiet", "hero"],
    surface: ["card", "plain", "tinted", "outlined"],
    media: ["thumb", "none", "icon", "cover"],
    detail: ["full", "brief"],
    tone: ["neutral", "good", "warn", "bad"],
  },
  variantParts: {
    "media.none": { hides: ["icon", "photo"] },
    "media.icon": { hides: ["photo"] },
    "media.cover": { hides: ["icon"] },
    "detail.brief": { hides: ["body", "meta"] },
  },
  parts: ["root", "icon", "photo", "badge", "title", "body", "meta"],
  states: ["filled", "loading"],
  actions: { parts: { root: ["press"] }, when: { root: { linked: true } } },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...catalog.variantProps(meta.variants),
    title: catalog.text(40),
    body: catalog.text(120).optional(),
    meta: catalog.text(24).optional(),
    badge: catalog.text(12).optional(),
    icon: catalog.icon.optional(),
    photo: catalog.photo.optional(),
    goto: catalog.screenId.optional(),
  })
  .refine((value) => !(value.icon && value.photo), { path: ["photo"] })
  // Keep parsed props in sync with the drawing and reader; wire input still stores hidden content.
  .overwrite((value) => ({
    ...value,
    ...(value.detail === "brief" ? { body: undefined, meta: undefined } : {}),
    ...(value.media === "none" || value.media === "cover" ? { icon: undefined } : {}),
    ...(value.media === "none" || value.media === "icon" ? { photo: undefined } : {}),
    linked: value.goto !== undefined,
  }));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = catalog.wordsFor(lang);
  const item = cast.items[0];
  const thing = item ? catalog.thingOf(cast, item.type) : undefined;
  return {
    title: (item && catalog.titleOf(item, 40, thing)) || catalog.placeholderTitle(0, lang),
    body: (item && catalog.detailOf(item, 120, thing)) || placeholderDetail,
  };
}

export const examples = [
  {
    media: "cover",
    title: "Fern",
    body: "Bathroom · soft indirect light",
    meta: "Water today",
    photo: "lib:plants",
    goto: "fern",
  },
  {
    surface: "tinted",
    title: "Morning park walk",
    body: "Clover and Pip · 09:00",
    meta: "Booking confirmed",
    icon: "dog",
    tone: "good",
  },
  { title: "Monstera", body: "Living room · due Friday", photo: "lib:plants" },
  {
    surface: "outlined",
    media: "icon",
    title: "Basil",
    body: "Kitchen · freshly watered",
    icon: "leaf",
    goto: "basil",
  },
  { title: "Evening walk", body: "Pip · 18:30 · Hyde Park", badge: "Due today", icon: "dog" },
  { title: "Booking pending", body: "Pip · awaiting confirmation", surface: "tinted", tone: "warn" },
  { title: "Walk cancelled", body: "Clover · Friday morning", surface: "tinted", tone: "bad" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = catalog.probesFor("Card");
export const probes = [
  choose("Show one tappable preview of my fern with a short care detail, so I can open it"),
  choose("Show several plants and let me tap each one to open it", "List"),
  {
    ...write(
      "Show Fern with lib:plants as a wide photo at the top. Below it show Bathroom and then Water today. Tap to open fern.",
    ),
    variant: { axis: "media", value: "cover" },
  },
  write("One card for the evening walk with Pip at 18:30, with a small Due today label in the corner"),
  read("Open the fern card", { address: "c1", action: "press" }),
] satisfies Probe[];

type CardProps = Props<typeof props, typeof meta>;

function CardText({ title, badge, density, emphasis, body, meta }: CardProps) {
  const heading = (
    <KitText role="heading" part="title" {...{ density, emphasis }}>
      {title}
    </KitText>
  );
  return (
    <>
      {badge ? (
        <KitGrid fitLast {...{ density }}>
          {heading}
          <KitText role="label" tone="muted" part="badge" {...{ density }}>
            {badge}
          </KitText>
        </KitGrid>
      ) : (
        heading
      )}
      {body && (
        <KitText role="body" tone="muted" part="body" {...{ density }}>
          {body}
        </KitText>
      )}
      {meta && (
        <KitText role="caption" tone="muted" part="meta" {...{ density }}>
          {meta}
        </KitText>
      )}
    </>
  );
}

export function Card(input: CardProps) {
  const { media, title, icon, photo, surface, tone, emphasis, goto } = input;
  const density = useVariant("density", meta.variants.density, input.density);
  const loading = useComponentState() === "loading";
  const cover = media === "cover";
  const { resolvePhoto } = useKit();
  const coverPhoto = cover && photo && resolvePhoto?.(photo) ? photo : undefined;
  const finish = { density, emphasis };
  const frame = { surface, tone, density, clip: cover, padded: !loading, goto: loading ? undefined : goto };
  const thumbnail = !cover && photo;
  const lead = icon ? (
    <KitIcon name={icon} part="icon" scale={media === "icon" ? "lg" : "md"} />
  ) : (
    thumbnail && <KitPhoto photo={thumbnail} part="photo" />
  );
  return (
    <KitCard {...frame} part="root" label={title}>
      {loading ? (
        <KitSkeleton
          shape={coverPhoto ? "media" : "figure"}
          lead={icon ? "dot" : thumbnail ? "box" : "none"}
          {...finish}
          inset="card"
          aspect="wide"
          content={[
            ["heading", title],
            ["body", input.body],
            ["caption", input.meta],
          ]}
        />
      ) : (
        <>
          {coverPhoto && <KitPhoto photo={coverPhoto} shape="wide" part="photo" />}
          <KitContent {...{ lead }} leadingAlign={thumbnail ? "row" : "line"} {...finish}>
            <CardText {...input} density={density} />
          </KitContent>
        </>
      )}
    </KitCard>
  );
}
