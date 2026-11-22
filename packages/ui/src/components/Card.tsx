import * as catalog from "../catalog";
import type { FallbackInput, Meta, Probe, Props } from "../catalog";
import { z } from "zod";
import * as kit from "../kit";
import { prompt } from "../entry/prompt-Card.generated";

export const meta = {
  id: "Card",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A preview of one record and optional navigation link in the on-device app.",
  variants: {
    emphasis: ["normal", "quiet", "hero"],
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
  parts: ["root", "icon", "photo", "badge", "title", "body", "meta", "reward", "duration"],
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
    reward: catalog.text(12).optional(),
    duration: catalog.text(12).optional(),
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
    title: "Park walk itinerary",
    body: "Clover and Pip · 09:00",
    meta: "South gate",
    icon: "dog",
  },
  { title: "Monstera", body: "Living room · due Friday", photo: "lib:plants" },
  {
    title: "Basil",
    body: "Kitchen · freshly watered",
    icon: "leaf",
    goto: "basil",
  },
  {
    title: "Evening walk",
    body: "Pip · 18:30 · Hyde Park",
    badge: "Due today",
    icon: "dog",
    reward: "20 points",
    duration: "15 min",
  },
  { title: "Fern care", body: "Water on Friday", media: "icon", icon: "leaf" },
  { title: "Walk confirmed", body: "Clover · Sunday", tone: "good" },
  { title: "Booking pending", body: "Pip · awaiting confirmation", tone: "warn" },
  { title: "Walk cancelled", body: "Clover · Friday morning", tone: "bad" },
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
  {
    ...write("Preview the evening walk and show 20 points as a separate reward pill."),
    expectProps: { reward: "20 points" },
  },
  {
    ...write("Preview the evening walk and show a separate duration pill of exactly 15 min."),
    expectProps: { duration: "15 min" },
  },
  read("Open the fern card", { address: "c1", action: "press" }),
] satisfies Probe[];

type CardProps = Props<typeof props, typeof meta>;
function CardText({ title, emphasis, body, meta, goto, reward, duration }: CardProps) {
  const density = kit.useKit().density;
  const heading = (
    <kit.KitText role="heading" part="title" {...{ density, emphasis }}>
      {title}
    </kit.KitText>
  );
  const header = goto ? (
    <kit.KitGrid fitLast density={density}>
      {heading}
      <kit.KitIcon name="chevron_right" decorative />
    </kit.KitGrid>
  ) : (
    heading
  );
  const prize = reward && <kit.KitTrail kind="badge" value={reward} part="reward" density={density} />;
  const time = duration && (
    <kit.KitTrail kind="badge" value={duration} part="duration" tone="muted" density={density} />
  );
  return (
    <>
      {header}
      {body && (
        <kit.KitText role="body" tone="muted" part="body" density={density}>
          {body}
        </kit.KitText>
      )}
      {meta && (
        <kit.KitText role="caption" tone="muted" part="meta" density={density}>
          {meta}
        </kit.KitText>
      )}
      {(prize || time) && (
        <kit.KitContent group="response" density={density} lead={prize || time} leadingAlign="row">
          {prize && time && (
            <kit.KitContent lead={time} leadingAlign="row" density={density}>
              {null}
            </kit.KitContent>
          )}
        </kit.KitContent>
      )}
    </>
  );
}

export function Card(input: CardProps) {
  const { media, title, icon, photo, tone, emphasis, goto, badge } = input;
  const density = kit.useKit().density;
  const loading = kit.useComponentState() === "loading";
  const { resolvePhoto } = kit.useKit();
  const cover = media === "cover";
  const coverPhoto = cover && photo && resolvePhoto?.(photo) ? photo : undefined;
  const finish = { density, emphasis };
  const frame = { tone, density, clip: cover, padded: !loading, goto: loading ? undefined : goto };
  const thumbnail = !cover && photo;
  const lead = icon ? (
    <kit.KitIcon name={icon} part="icon" scale={media === "icon" ? "lg" : "md"} />
  ) : (
    thumbnail && <kit.KitPhoto photo={thumbnail} part="photo" />
  );
  return (
    <kit.KitCard {...frame} part="root" label={title}>
      {loading ? (
        <kit.KitSkeleton
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
          {coverPhoto && <kit.KitPhoto photo={coverPhoto} shape="wide" part="photo" />}
          {badge ? (
            <kit.KitRow
              part={null}
              inline
              label={title}
              lineRole="heading"
              leading={lead}
              leadingAlign={thumbnail ? "row" : "line"}
              {...finish}
              trailing={
                <kit.KitTrail kind="badge" value={badge} part="badge" tone="muted" density={density} />
              }
            >
              <kit.KitContent {...finish}>
                <CardText {...input} />
              </kit.KitContent>
            </kit.KitRow>
          ) : (
            <kit.KitContent {...{ lead }} leadingAlign={thumbnail ? "row" : "line"} {...finish}>
              <CardText {...input} />
            </kit.KitContent>
          )}
        </>
      )}
    </kit.KitCard>
  );
}
