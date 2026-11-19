import { z } from "zod";
import * as c from "../catalog";
import * as kit from "../kit";
const trails = ["chevron", "none", "value", "badge", "toggle", "check"] as const;
const trailPart = { adds: ["trail"] } as const;
export const meta = {
  id: "List",
  group: "content",
  purpose: "Several things of the same kind, each one tappable.",
  pick: "Several things of one kind to scan and tap individually, even when asked to tap just one of them. Not one featured thing (Card), details of one thing (KeyValue), or jobs to tick off (Checklist).",
  writeHints: [
    'Use null for all unrequested List and row axes. Data such as status, urgency or recency does not request a mark or tone. If asked to highlight, use mark "highlight" on at most one in three rows (none in a one- or two-row list).',
    'Use style "expand" with a body on every FAQ row or "shelf" with a photo on every sideways rail row. Photos use references like "lib:plants" or "local:1". The water icon is "drop".',
    'Rankings use style null (never expand), lead "number", trail "value", and each score in value. Only the person’s row gets me.',
    'For grouped headings use group "sections" and a section label on every row; keep rows in section order.',
    'For See all: overflow "peek"; style and all other axes null unless requested. Output every row, including hidden ones. If asked for names only, write title and leave all other row fields null.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A query over one thing in the on-device database.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "plain", "outlined"],
    detail: ["full", "brief"],
    group: ["none", "sections"],
    overflow: ["all", "peek"],
    lead: ["icon", "none", "thumb", "number"],
    trail: trails,
  },
  parts: ["root", "more", "more_label", "count"],
  items: {
    key: "rows",
    parts: ["root", "title", "meta", "icon", "trail", "body", "rank"],
    variants: {
      trail: trails,
      tone: ["neutral", "good", "warn", "bad"],
      mark: ["none", "highlight", "muted", "new"],
    },
  },
  variantParts: {
    "detail.brief": { hides: ["meta"] },
    "overflow.peek": { adds: ["more", "more_label", "count"] },
    "lead.none": { hides: ["icon"] },
    "lead.thumb": { hides: ["icon"] },
    "lead.number": { hides: ["icon"], adds: ["rank"] },
    "trail.none": { hides: ["trail"] },
    "trail.chevron": trailPart,
    "trail.value": trailPart,
    "trail.badge": trailPart,
    "trail.toggle": trailPart,
    "trail.check": trailPart,
  },
  states: ["filled", "empty", "loading"],
  actions: {
    parts: { more: ["toggle"] },
    items: { root: ["press", "toggle"], trail: ["toggle"] },
    when: { trail: { trail: "toggle" }, "root.press": { root: "press" }, "root.toggle": { root: "toggle" } },
  },
} as const satisfies c.Meta;
const rowProps = z.strictObject({
  title: c.text(28),
  meta: c.text(36).optional(),
  icon: c.icon.optional(),
  photo: c.photo.optional(),
  ...c.itemVariantProps(meta.items.variants, { inheritTrail: true }),
  value: c.text(10).optional(),
  goto: c.screenId.optional(),
  body: c.text(200).optional(),
  me: z.boolean().optional(),
  section: c.text(24).optional(),
});
// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants), style: z.enum(["cards", "shelf", "expand"]).optional(),
  rows: z.array(rowProps).min(1).max(6),
}).refine(({ style, group, rows }) =>
  (style !== "shelf" || (rows.length >= 2 && rows.every((row) => row.photo))) &&
  (style !== "expand" || rows.every((row) => row.body)) &&
  (group !== "sections" || rows.every((row) => row.section)) &&
  rows.filter((row) => row.me).length <= 1,
  { path: ["rows"], message: "Shelf needs two photo rows, expand needs bodies, sections need labels; at most one me" },
).overwrite((value) => {
  const { rows, group, detail, lead, trail, overflow } = value;
  const style = rows.some((row) => row.body) ? "expand" : value.style;
  const quiet = style === "expand" || style === "shelf";
  return {
    ...value, style, more: overflow === "peek" && rows.length > c.peekLimit ? "peek" : undefined,
    rows: rows.map((row) => ({
      ...row, trail: row.trail ?? (quiet && trail === "chevron" ? "none" : trail),
      root: style === "expand" ? "toggle" : row.goto ? "press" : undefined,
      ...(detail === "brief" ? { meta: undefined } : {}),
      ...(group !== "sections" ? { section: undefined } : {}),
      ...(lead === "number" || lead === "none" ? { icon: undefined, photo: undefined } : lead === "icon" && row.icon && style !== "shelf" ? { photo: undefined } : {}),
    })),
  };
});
export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const rows = c.itemsOf(cast, 3).flatMap((item) => {
    const title = c.titleOf(item, 28, thing),
      meta = c.detailOf(item, 36, thing);
    return title ? [{ title, ...(meta ? { meta } : {}) }] : [];
  });
  return { rows: rows.length ? rows : [0, 1, 2].map((i) => ({ title: c.placeholderTitle(i, lang) })) };
}

// prettier-ignore
export const examples = [
  { trail: "toggle", rows: [
    { title: "Fern", meta: "Bathroom · water today", icon: "leaf", goto: "fern" },
    { title: "Monstera", meta: "Living room · in two days", icon: "leaf", trail: "chevron", goto: "monstera" },
    { title: "Basil", meta: "Kitchen · freshly watered", icon: "drop", trail: "check", goto: "basil" },
  ] },
  { trail: "badge", rows: [{ title: "Park walk", value: "£18", icon: "dog" }, { title: "River walk", value: "£16", icon: "dog", trail: "value" }] },
  { trail: "value", rows: [{ title: "Park walk", value: "£18", icon: "dog" }, { title: "River walk", value: "£16", icon: "dog", trail: "badge" }] },
  { style: "shelf", rows: [
    { title: "Fern", meta: "Bathroom", photo: "lib:fern", goto: "fern" },
    { title: "Basil", meta: "Kitchen", photo: "lib:basil" },
  ] },
  { style: "expand", rows: [
    { title: "How often do I water?", body: "Weekly, less in winter.", icon: "chevron_right" },
    { title: "Can walks move?", body: "Yes, up to 2 hours before.", icon: "chevron_right" },
  ] },
  { lead: "number", rows: [
    { title: "Anna", value: "412", trail: "value" }, { title: "Ben", value: "380", trail: "value" }, { title: "You", value: "351", trail: "value", me: true },
  ] },
  { group: "sections", rows: [
    { title: "Fern", section: "Indoors", meta: "Bathroom", icon: "leaf", trail: "none" },
    { title: "Basil", section: "Outdoors", meta: "Balcony", icon: "drop", goto: "basil" },
  ] },
  { overflow: "peek", rows: [
    { title: "Clover", meta: "Morning park walk", icon: "dog", mark: "highlight", goto: "clover" },
    { title: "Pip", meta: "River walk", icon: "dog", trail: "none" },
    { title: "Scout", meta: "Evening walk", icon: "dog", goto: "scout" },
  ] },
  { lead: "thumb", rows: [{ title: "Fern", meta: "Soft light", icon: "leaf", photo: "lib:fern" }, { title: "Basil", meta: "Full sun", icon: "leaf", photo: "lib:basil" }] },
  { style: "cards", rows: c.sampleWalkRows }, { surface: "plain", rows: c.samplePlantRows }, { rows: [{ title: "Walk reminder", icon: "clock", trail: "toggle" }] },
] satisfies z.input<typeof props>[];
const { choose, write, read } = c.probesFor("List");
export const probes = [
  choose("Show my plants and let me tap one"),
  choose("Show the room and water interval of one plant", "KeyValue"),
  write("Three plants with their rooms and water due today"),
  write("A sideways row of three plant photo cards to swipe through: Fern, Monstera and Basil"),
  write("Two questions: how often do I water, and can walks move? Tap each question to open its answer."),
  write("A leaderboard of the three highest scores, Anna 412, Ben 380 and me on 351, ranked in order"),
  {
    ...write(
      "List all four names in this order: Fern, Monstera, Basil, Aloe. Names only, no icons or links. Keep all four in the data, but preview two with See all below.",
    ),
    variant: { axis: "overflow", value: "peek", itemTitles: ["Fern", "Monstera", "Basil", "Aloe"] },
  },
  read("Mark Fern as watered", { address: "l1/r1/trail", action: "toggle" }),
] satisfies c.Probe[];
type ListProps = c.Props<typeof props, typeof meta>;
// prettier-ignore
function ListRows({ rows, style, surface, group, density, lead, trail }: ListProps) {
  const layout = style === "shelf" ? (rows.length <= 2 ? "grid" : "strip") : "rows";
  const children = rows.map((row, index) => {
    const finish = { density, tone: row.tone, mark: row.mark, surface: style === "cards" ? surface : undefined };
    const leading = lead === "icon" && (style === "shelf" || !row.icon) ? undefined : lead;
    return <kit.KitListItem key={row.id} {...{ row, index, trail }} {...finish} lead={leading} style={style ?? "inset"} />;
  });
  const groups: { id: string; heading: string; children: typeof children }[] = [];
  const draw = (items: typeof children) => <kit.KitGrid arrange={layout} {...{ density }}>{items}</kit.KitGrid>;
  if (group === "none") return draw(children);
  rows.forEach(({ id, section }, index) => {
    const current = groups.at(-1);
    if (current && current.heading === section) current.children.push(children[index]!);
    else if (section) groups.push({ id, heading: section, children: [children[index]!] });
  });
  return groups.map(({ id, heading, children }, index) => <kit.KitContent key={id} group="response">
    <kit.KitContent inset="md" group={index ? "response" : "content"}><kit.KitText role="label" tone="muted" part={null}>{heading}</kit.KitText></kit.KitContent>
    {draw(children)}
  </kit.KitContent>);
}
// prettier-ignore
export function List(input: ListProps) {
  const { style, surface } = input, density = kit.useVariant("density", meta.variants.density, input.density);
  const state = kit.useComponentState();
  const { screen, component } = kit.usePartContext();
  const open = kit.useControlValue(`${screen}/${component}/more`, false);
  const { words, lang } = kit.useWords(), label = open ? words.peekLess : words.peekMore;
  const more = input.overflow === "peek" && input.rows.length > c.peekLimit;
  const rows = more && !open ? input.rows.slice(0, c.peekLimit) : input.rows;
  const hidden = input.rows.length - rows.length;
  const frame = style === "cards" ? "cards" : style === "shelf" ? "plain" : "inset";
  const finish = { density, surface: style === "shelf" && surface === "card" ? "plain" : surface };
  return <kit.KitCard style={frame} {...finish}>
    {state === "loading" ? <kit.KitSkeleton rows={rows.length} items={rows} lead={rows[0]?.photo ? "box" : "dot"} {...{ density }} /> :
      state === "empty" ? <kit.KitEmpty part="title" /> : <>
        <ListRows {...input} rows={rows} />
        {more && <kit.KitRow part="more" role="button" expanded={open} {...{ label, density }}>
          {hidden > 0 && <kit.KitText part="count" role="caption" tone="muted">{words.peekCount(c.numberLine(hidden, lang))}</kit.KitText>}
          <kit.KitText part="more_label" role="label" tone="accent">{label}</kit.KitText>
        </kit.KitRow>}
      </>}
  </kit.KitCard>;
}
