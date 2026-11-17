import { z } from "zod";
import { text, icon, photo, screenId, type CastLike, type Meta, type Props } from "../catalog";
import { KitCard, KitRow, KitIcon, KitPhoto, KitText, KitTrail, KitSkeleton, useComponentState } from "../kit";

export const meta = {
  id: "List", group: "content",
  purpose: "Several things of the same kind, each one tappable.",
  pick: "Scan or choose among things. Not facts about one thing (KeyValue) or things to tick off (Checklist).",
  region: "body", weight: 2, tier: "phone",
  realPath: "A query over one thing in the on-device database.",
  items: { key: "rows", parts: ["root", "title", "meta", "icon", "trail"] },
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"], trail: ["toggle"] } },
  aliases: ["listview", "table", "rows", "items"],
} as const satisfies Meta;

export const props = z.strictObject({
  style: z.enum(["plain", "inset", "cards"]).default("inset"),
  rows: z.array(z.strictObject({
    title: text(28), meta: text(36).optional(), icon: icon.optional(), photo: photo.optional(),
    trail: z.enum(["none", "chevron", "check", "toggle", "value", "badge"]).default("chevron"),
    value: text(10).optional(), goto: screenId.optional(),
  })).min(1).max(6),
});

function rowsFromCast(cast: CastLike) {
  const kind = cast.things[0]?.type ?? cast.items[0]?.type;
  const rows = cast.items.filter((item) => item.type === kind).flatMap((item) => {
    const title = item.name ?? item.title;
    if (typeof title !== "string" || !title.trim()) return [];
    const detail = typeof item.room === "string" ? item.room : undefined;
    return [{ title: title.trim().slice(0, 28),
      ...(detail?.trim() ? { meta: detail.trim().slice(0, 36) } : {}), trail: "chevron" as const }];
  }).slice(0, 3);
  return rows.length ? rows : [
    { title: "Fern", meta: "Bathroom", icon: "leaf" as const, trail: "chevron" as const },
    { title: "Monstera", meta: "Living room", icon: "leaf" as const, trail: "chevron" as const },
    { title: "Basil", meta: "Kitchen", icon: "leaf" as const, trail: "chevron" as const },
  ];
}
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  return { style: "inset", rows: rowsFromCast(cast) };
}
export const examples = [
  { style: "inset", rows: [
    { title: "Fern", meta: "Bathroom · water today", icon: "leaf", trail: "toggle", goto: "fern" },
    { title: "Monstera", meta: "Living room · in two days", icon: "leaf", trail: "chevron", goto: "monstera" },
    { title: "Basil", meta: "Kitchen · freshly watered", icon: "drop", trail: "check", goto: "basil" },
  ] },
  { style: "cards", rows: [
    { title: "Morning park walk", meta: "Trot · 09:00 · two dogs", icon: "dog", trail: "value", value: "£18", goto: "morning_walk" },
    { title: "Riverside afternoon", meta: "Trot · 14:30 · one dog", icon: "clock", trail: "badge", value: "Booked", goto: "river_walk" },
  ] },
] satisfies z.input<typeof props>[];

export const probes = [
  { kind: "choose", need: "Show my plants and let me tap one", expect: "List" },
  { kind: "choose", need: "Show the room and water interval of one plant", expect: "KeyValue" },
  { kind: "write", brief: "Three plants with their rooms and water due today", expect: "List" },
  { kind: "read", screen: 0, task: "Mark Fern as watered",
    expect: { address: "l1/r1/trail", action: "toggle" } },
] as const;

export function List({ style, rows }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  if (state === "empty") return <KitCard style={style}><KitText part="title">No things yet.</KitText></KitCard>;
  if (state === "loading") return <KitCard style={style}><KitSkeleton /></KitCard>;
  return <KitCard style={style} part="root">
    {rows.map((row) => <KitRow key={row.id} item={row.id} label={row.title} goto={row.goto}
      leading={row.photo ? <KitPhoto photo={row.photo} part="icon" /> : <KitIcon name={row.icon} part="icon" />}
      trailing={<KitTrail kind={row.trail} value={row.value} part="trail" />}>
      <KitText role="body" part="title">{row.title}</KitText>
      {row.meta && <KitText role="caption" tone="muted" part="meta">{row.meta}</KitText>}
    </KitRow>)}
  </KitCard>;
}
