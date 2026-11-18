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
  KitContent,
  KitIcon,
  KitPhoto,
  KitRank,
  KitRow,
  KitSkeleton,
  KitStrip,
  KitText,
  KitTrail,
  useComponentState,
  KitEmpty,
} from "../kit";

export const meta = {
  id: "List",
  group: "content",
  purpose: "Several things of the same kind, each one tappable.",
  pick: "Several things of one kind to scan and tap individually, even when asked to tap just one of them. Not one featured thing (Card), details of one thing (KeyValue), or jobs to tick off (Checklist).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A query over one thing in the on-device database.",
  items: { key: "rows", parts: ["root", "title", "meta", "icon", "trail", "body", "rank"] },
  states: ["filled", "empty", "loading"],
  actions: {
    items: { root: ["press", "toggle"], trail: ["toggle"] },
    // Rows link in most styles and open in place in expand; `root` carries which.
    when: { trail: { trail: "toggle" }, "root.press": { root: "press" }, "root.toggle": { root: "toggle" } },
  },
  aliases: [
    "listview",
    "table",
    "rows",
    "items",
    "shelf",
    "rail",
    "accordion",
    "faq",
    "leaderboard",
    "ranking",
  ],
} as const satisfies Meta;

export const props = z
  .strictObject({
    style: z.enum(["plain", "inset", "cards", "shelf", "expand", "ranked"]).default("inset"),
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
          body: text(200).optional(),
          me: z.boolean().optional(),
        }),
      )
      .min(1)
      .max(6),
  })
  .refine(({ style, rows }) => style !== "shelf" || (rows.length >= 2 && rows.every((row) => row.photo)), {
    path: ["rows"],
    message: "A shelf takes at least two rows, each with a photo",
  })
  .refine(({ style, rows }) => style !== "expand" || rows.every((row) => row.body), {
    path: ["rows"],
    message: "An expanding row needs its body",
  })
  .refine(({ rows }) => rows.filter((row) => row.me).length <= 1, {
    path: ["rows"],
    message: "Only one row is you",
  })
  // The shared reader checks optional part presence; `root` says what a row does: press links, toggle opens.
  // A body means the rows open in place, and a `me` row means a ranking, whatever style was written.
  .overwrite((value) => {
    const style = value.rows.some((row) => row.body)
      ? ("expand" as const)
      : value.rows.some((row) => row.me)
        ? ("ranked" as const)
        : value.style;
    return {
      ...value,
      style,
      rows: value.rows.map((row) => ({
        ...row,
        root: style === "expand" ? "toggle" : row.goto ? "press" : undefined,
      })),
    };
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
  {
    style: "shelf",
    rows: [
      { title: "Fern", meta: "Bathroom", photo: "lib:plants", goto: "fern" },
      { title: "Monstera", meta: "Living room", photo: "lib:plants", goto: "monstera" },
      { title: "Basil", meta: "Kitchen", photo: "lib:plants" },
    ],
  },
  {
    style: "expand",
    rows: [
      { title: "How often do I water?", body: "Every week in summer, every two weeks in winter." },
      { title: "Can walks be moved?", body: "Yes, up to two hours before the start." },
    ],
  },
  {
    style: "ranked",
    rows: [
      { title: "Anna", value: "412", trail: "value" },
      { title: "Ben", value: "380", trail: "value" },
      { title: "You", value: "351", trail: "value", me: true },
    ],
  },
] satisfies z.input<typeof props>[];

export const probes = [
  { kind: "choose", need: "Show my plants and let me tap one", expect: "List" },
  { kind: "choose", need: "Show the room and water interval of one plant", expect: "KeyValue" },
  { kind: "write", brief: "Three plants with their rooms and water due today", expect: "List" },
  {
    kind: "write",
    brief: "A sideways row of three plant photo cards to swipe through: Fern, Monstera and Basil",
    expect: "List",
  },
  {
    kind: "write",
    brief:
      "Two questions people ask, each opening to show its answer: how often to water, and whether walks can be moved",
    expect: "List",
  },
  {
    kind: "write",
    brief: "A leaderboard of the three highest scores, Anna 412, Ben 380 and me on 351, ranked in order",
    expect: "List",
  },
  {
    kind: "read",
    screen: 0,
    task: "Mark Fern as watered",
    expect: { address: "l1/r1/trail", action: "toggle" },
  },
] satisfies Probe[];

type Row = Props<typeof props, typeof meta>["rows"][number];

function ShelfCard({ row }: { row: Row }) {
  return (
    <KitRow item={row.id} label={row.title} goto={row.goto} inset="none">
      <KitContent lineRole="body">
        {row.photo && <KitPhoto photo={row.photo} shape="wide" part="icon" label={row.title} />}
        <KitText role="body" part="title">
          {row.title}
        </KitText>
        {row.meta && (
          <KitText role="caption" tone="muted" part="meta">
            {row.meta}
          </KitText>
        )}
      </KitContent>
    </KitRow>
  );
}

const surfaceOf = (style: Props<typeof props, typeof meta>["style"]) =>
  style === "shelf" ? "plain" : style === "expand" || style === "ranked" ? "inset" : style;

export function List({ style, rows }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  const surface = surfaceOf(style);
  if (state === "loading") {
    return (
      <KitCard style={surface}>
        <KitSkeleton rows={rows.length} lead={rows[0]?.photo ? "box" : "dot"} />
      </KitCard>
    );
  }
  if (state === "empty") {
    return (
      <KitCard style={surface}>
        <KitEmpty part="title" />
      </KitCard>
    );
  }
  if (style === "shelf") {
    return (
      <KitCard style="plain" part="root" padded>
        <KitStrip>
          {rows.map((row) => (
            <ShelfCard key={row.id} row={row} />
          ))}
        </KitStrip>
      </KitCard>
    );
  }
  const ranked = style === "ranked";
  const expand = style === "expand";
  return (
    <KitCard style={surface} part="root">
      {rows.map((row, index) => (
        <KitRow
          leadingAlign={row.photo ? "row" : "line"}
          key={row.id}
          item={row.id}
          label={row.title}
          goto={expand ? undefined : row.goto}
          {...(expand ? { role: "button" as const, expanded: true } : {})}
          leading={
            ranked ? (
              <KitRank place={index + 1} />
            ) : row.photo ? (
              <KitPhoto photo={row.photo} part="icon" />
            ) : (
              <KitIcon name={row.icon} part="icon" />
            )
          }
          trailing={
            expand ? undefined : ranked ? (
              row.value ? (
                <KitTrail kind="value" value={row.value} part="trail" />
              ) : undefined
            ) : (
              <KitTrail kind={row.trail} value={row.value} part="trail" />
            )
          }
        >
          <KitText role="body" tone={row.me ? "accent" : "text"} part="title">
            {row.title}
          </KitText>
          {row.meta && (
            <KitText role="caption" tone="muted" part="meta">
              {row.meta}
            </KitText>
          )}
          {expand && row.body && (
            <KitText role="body" tone="muted" part="body">
              {row.body}
            </KitText>
          )}
        </KitRow>
      ))}
    </KitCard>
  );
}
