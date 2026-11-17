import { z } from "zod";
import {
  detailOf,
  icon,
  itemsOf,
  photo,
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
  KitIcon,
  KitPhoto,
  KitRow,
  KitSkeleton,
  KitText,
  KitTrail,
  useComponentState,
  KitEmpty,
} from "../kit";

export const meta = {
  id: "List",
  group: "content",
  purpose: "Several things of the same kind, each one tappable.",
  pick: "Several separate things to scan or open. Not the details of one thing (KeyValue) or jobs to tick off (Checklist).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A query over one thing in the on-device database.",
  items: { key: "rows", parts: ["root", "title", "meta", "icon", "trail"] },
  states: ["filled", "empty", "loading"],
  actions: {
    items: { root: ["press"], trail: ["toggle"] },
    when: { trail: { trail: "toggle" } },
  },
  aliases: ["listview", "table", "rows", "items"],
} as const satisfies Meta;

export const props = z.strictObject({
  style: z.enum(["plain", "inset", "cards"]).default("inset"),
  rows: z
    .array(
      z.strictObject({
        title: text(28),
        meta: text(36).optional(),
        icon: icon.optional(),
        photo: photo.optional(),
        trail: z.enum(["none", "chevron", "check", "toggle", "value", "badge"]).default("chevron"),
        value: text(10).optional(),
        goto: screenId.optional(),
      }),
    )
    .min(1)
    .max(6)
    // The shared reader checks optional part presence; only linked rows expose a root action.
    .transform((rows) => rows.map((row) => ({ ...row, root: row.goto }))),
});

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const rows = itemsOf(cast, 3).flatMap((item) => {
    const title = titleOf(item, 28, thing);
    const detail = detailOf(item, 36, thing);
    return title ? [{ title, ...(detail ? { meta: detail } : {}) }] : [];
  });
  return {
    style: "inset",
    rows: rows.length ? rows : [0, 1, 2].map((index) => ({ title: placeholderTitle(index) })),
  };
}

export const examples = [
  {
    style: "inset",
    rows: [
      { title: "Fern", meta: "Bathroom · water today", icon: "leaf", trail: "toggle", goto: "fern" },
      { title: "Monstera", meta: "Living room · in two days", icon: "leaf", goto: "monstera" },
      { title: "Basil", meta: "Kitchen · freshly watered", icon: "drop", trail: "check", goto: "basil" },
    ],
  },
  {
    style: "cards",
    rows: [
      { title: "Morning park walk", meta: "09:00 · two dogs", icon: "dog", trail: "value", value: "£18" },
      {
        title: "River walk",
        meta: "14:30 · one dog",
        icon: "clock",
        trail: "badge",
        value: "Booked",
      },
    ],
  },
  {
    style: "plain",
    rows: [
      { title: "Aloe", meta: "Bedroom · water Friday", photo: "lib:plants", trail: "none" },
      {
        title: "Pothos",
        meta: "Hall · due Sunday",
        photo: "lib:plants",
        trail: "chevron",
        goto: "pothos",
      },
    ],
  },
] satisfies z.input<typeof props>[];

export const probes = [
  { kind: "choose", need: "Show my plants and let me tap one", expect: "List" },
  { kind: "choose", need: "Show the room and water interval of one plant", expect: "KeyValue" },
  { kind: "write", brief: "Three plants with their rooms and water due today", expect: "List" },
  {
    kind: "read",
    screen: 0,
    task: "Mark Fern as watered",
    expect: { address: "l1/r1/trail", action: "toggle" },
  },
] satisfies Probe[];

export function List({ style, rows }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  if (state === "loading") {
    return (
      <KitCard style={style}>
        <KitSkeleton rows={3} />
      </KitCard>
    );
  }
  if (state === "empty") {
    return (
      <KitCard style={style}>
        <KitEmpty part="title" />
      </KitCard>
    );
  }
  return (
    <KitCard style={style} part="root">
      {rows.map((row) => (
        <KitRow
          leadingAlign={row.photo ? "row" : "line"}
          key={row.id}
          item={row.id}
          label={row.title}
          goto={row.goto}
          leading={
            row.photo ? <KitPhoto photo={row.photo} part="icon" /> : <KitIcon name={row.icon} part="icon" />
          }
          trailing={<KitTrail kind={row.trail} value={row.value} part="trail" />}
        >
          <KitText role="body" part="title">
            {row.title}
          </KitText>
          {row.meta && (
            <KitText role="caption" tone="muted" part="meta">
              {row.meta}
            </KitText>
          )}
        </KitRow>
      ))}
    </KitCard>
  );
}
