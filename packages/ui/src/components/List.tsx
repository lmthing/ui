import { z } from "zod";
import {
  probesFor,
  sampleWalkRows,
  samplePlantRows,
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
import { KitCard, KitEmpty, KitGrid, KitListItem, KitSkeleton, KitStrip, useComponentState } from "../kit";

export const meta = {
  id: "List",
  group: "content",
  purpose: "Several things of the same kind, each one tappable.",
  pick: "Several things of one kind to scan and tap individually, even when asked to tap just one of them. Not one featured thing (Card), details of one thing (KeyValue), or jobs to tick off (Checklist).",
  writeHints: [
    'For questions that open in place, use style: "expand" and a body on every row. Do not add goto or meta saying tap for an answer.',
    'Photo values are references like "lib:plants" or "local:1". Never put the word photo or a space inside the value.',
    'Icons are optional; omit them when not needed. The water icon is "drop", never "droplet".',
    'A sideways photo rail uses style: "shelf" and photo on every row; a ranking uses style: "ranked" with each score in value.',
  ],
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
  .refine(
    ({ style, rows }) =>
      (style !== "shelf" || (rows.length >= 2 && rows.every((row) => row.photo))) &&
      (style !== "expand" || rows.every((row) => row.body)) &&
      rows.filter((row) => row.me).length <= 1,
    {
      path: ["rows"],
      message: "A shelf needs two or more photo rows, an expand needs bodies, one row is you",
    },
  )
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
    rows: sampleWalkRows,
  },
  {
    style: "plain",
    rows: samplePlantRows,
  },
  {
    style: "shelf",
    rows: [
      { title: "Fern", meta: "Bathroom", photo: "lib:plants", goto: "fern" },
      { title: "Basil", meta: "Kitchen", photo: "lib:plants" },
    ],
  },
  {
    style: "expand",
    rows: [
      { title: "How often do I water?", body: "Every week in summer, every two weeks in winter." },
      { title: "Can walks move?", body: "Yes, up to two hours before the start." },
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

const { choose, write, read } = probesFor("List");
export const probes = [
  choose("Show my plants and let me tap one"),
  choose("Show the room and water interval of one plant", "KeyValue"),
  write("Three plants with their rooms and water due today"),
  write("A sideways row of three plant photo cards to swipe through: Fern, Monstera and Basil"),
  write(
    "Two questions people ask, each opening to show its answer: how often to water, and whether walks can be moved",
  ),
  write("A leaderboard of the three highest scores, Anna 412, Ben 380 and me on 351, ranked in order"),
  read("Mark Fern as watered", { address: "l1/r1/trail", action: "toggle" }),
] satisfies Probe[];

const surfaceOf = (style: Props<typeof props, typeof meta>["style"]) =>
  style === "shelf" ? "plain" : style === "expand" || style === "ranked" ? "inset" : style;

export function List({ style, rows }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  const surface = surfaceOf(style);
  if (state === "loading" || state === "empty") {
    return (
      <KitCard style={surface}>
        {state === "loading" ? (
          <KitSkeleton rows={rows.length} lead={rows[0]?.photo ? "box" : "dot"} />
        ) : (
          <KitEmpty part="title" />
        )}
      </KitCard>
    );
  }
  const items = rows.map((row, index) => <KitListItem key={row.id} row={row} style={style} index={index} />);
  return (
    <KitCard style={surface} part="root" padded={style === "shelf"}>
      {style !== "shelf" ? (
        items
      ) : rows.length === 2 ? (
        <KitGrid columns={2}>{items}</KitGrid>
      ) : (
        <KitStrip>{items}</KitStrip>
      )}
    </KitCard>
  );
}
