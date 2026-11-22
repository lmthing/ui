import { z } from "zod";
import * as c from "../catalog";
import * as kit from "../kit";
import { prompt } from "../entry/prompt-List.generated";
const trails = ["chevron", "none", "value", "badge", "toggle", "check"] as const;
const trailPart = { adds: ["trail"] } as const;
// prettier-ignore
export const meta = {
  id: "List", group: "content", status: "ready",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body", weight: 2, tier: "phone",
  realPath: "A query over one thing in the on-device database.",
  variants: {
    density: ["comfortable", "compact"], surface: ["card", "plain", "outlined"],
    detail: ["full", "brief"], aspect: ["wide", "square", "tall"], arrange: ["rows", "grid"],
    group: ["none", "sections"], overflow: ["all", "peek"],
    lead: ["icon", "none", "thumb", "number"], trail: trails,
  },
  parts: ["root", "more", "more_label", "count"],
  items: {
    key: "rows",
    parts: ["root", "title", "meta", "icon", "trail", "body", "rank", "badge", "unread", "pinned"],
    variants: { trail: trails, tone: ["neutral", "good", "warn", "bad"], mark: ["none", "highlight", "muted", "new"] },
  },
  variantParts: {
    "detail.brief": { hides: ["meta"] }, "overflow.peek": { adds: ["more", "more_label", "count"] },
    "lead.none": { hides: ["icon"] }, "lead.thumb": { hides: ["icon"] }, "lead.number": { hides: ["icon"], adds: ["rank"] },
    "trail.none": { hides: ["trail"] }, "trail.chevron": trailPart, "trail.value": trailPart,
    "trail.badge": trailPart, "trail.toggle": trailPart, "trail.check": trailPart,
  },
  states: ["filled", "empty", "loading"], read: (input, state, lang, _data, _currency, live): string[] => {
    const { rows, overflow } = input as { rows: Parameters<typeof c.listDetailLines>[0]; overflow?: string };
    return state === "filled" ? c.listDetailLines(overflow === "peek" && live?.("more") !== true ? rows.slice(0, c.peekLimit) : rows, lang) : [];
  },
  actions: { parts: { more: ["toggle"] }, items: { root: ["press", "toggle"], trail: ["toggle"] },
    when: { trail: { trail: "toggle" }, "root.press": { root: "press" }, "root.toggle": { root: "toggle" } } },
} as const satisfies c.Meta;
// prettier-ignore
const rowProps = z.strictObject({
  title: c.text(28), meta: c.text(36).optional(), icon: c.icon.optional(), photo: c.photo.optional(),
  ...c.itemVariantProps(meta.items.variants, { inheritTrail: true }),
  value: c.text(10).optional(), goto: c.screenId.optional(), body: c.text(200).optional(),
  me: z.boolean().optional(), section: c.text(24).optional(),
  progress: z.number().min(0).max(1).optional(), badge: c.text(12).optional(),
  unread: z.boolean().optional(), pinned: z.boolean().optional(),
});
// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants), style: z.enum(["cards", "shelf", "expand"]).optional(),
  rows: z.array(rowProps).min(1).max(6),
}).refine(({ style, group, rows }) =>
  (style !== "shelf" || (rows.length >= 2 && rows.every((row) => row.photo))) &&
  (style !== "expand" || rows.every((row) => row.body)) &&
  ((style === "shelf" && !rows.some((row) => row.body)) || rows.every((row) => row.progress === undefined && row.badge === undefined)) &&
  (group !== "sections" || rows.every((row) => row.section)) &&
  rows.filter((row) => row.me).length <= 1,
  { path: ["rows"], message: "Shelf needs two photo rows and alone allows progress/badges; expand needs bodies, sections need labels, at most one me" },
).overwrite((value) => {
  const { rows, group, detail, lead, trail, overflow } = value;
  const style = rows.some((row) => row.body) ? "expand" : value.style;
  const quiet = style === "expand" || style === "shelf";
  return {
    ...value, style, more: overflow === "peek" && rows.length > c.peekLimit ? "peek" : undefined,
    rows: rows.map((row) => ({
      ...(row.unread !== undefined || row.pinned !== undefined ? { on: row.me === true } : {}),
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
export const examples = [
  {
    trail: "toggle",
    rows: [
      { title: "Fern", meta: "Bathroom · water today", icon: "leaf", goto: "fern" },
      {
        title: "Monstera",
        meta: "Living room · in two days",
        icon: "leaf",
        trail: "chevron",
        goto: "monstera",
      },
      { title: "Basil", meta: "Kitchen · freshly watered", icon: "drop", trail: "check", goto: "basil" },
    ],
  },
  {
    trail: "badge",
    rows: [
      { title: "Park walk", value: "£18", icon: "dog" },
      { title: "River walk", value: "£16", icon: "dog", trail: "value" },
    ],
  },
  {
    trail: "value",
    rows: [
      { title: "Park walk", value: "£18", icon: "dog" },
      { title: "River walk", value: "£16", icon: "dog", trail: "badge" },
    ],
  },
  {
    style: "shelf",
    rows: [
      { title: "Fern", meta: "Bathroom", photo: "lib:fern", goto: "fern" },
      { title: "Basil", meta: "Kitchen", photo: "lib:basil" },
    ],
  },
  {
    style: "expand",
    rows: [
      { title: "How often do I water?", body: "Weekly, less in winter.", icon: "chevron_right" },
      { title: "Can walks move?", body: "Yes, up to 2 hours before.", icon: "chevron_right" },
    ],
  },
  {
    lead: "number",
    rows: [
      { title: "Anna", value: "412", trail: "value" },
      { title: "Ben", value: "380", trail: "value" },
      { title: "You", value: "351", trail: "value", me: true },
    ],
  },
  {
    group: "sections",
    rows: [
      { title: "Fern", section: "Indoors", meta: "Bathroom", icon: "leaf", trail: "none" },
      { title: "Basil", section: "Outdoors", meta: "Balcony", icon: "drop", goto: "basil" },
    ],
  },
  {
    overflow: "peek",
    rows: [
      { title: "Clover", meta: "Morning park walk", icon: "dog", mark: "highlight", goto: "clover" },
      { title: "Pip", meta: "River walk", icon: "dog", trail: "none" },
      { title: "Scout", meta: "Evening walk", icon: "dog", goto: "scout" },
    ],
  },
  {
    lead: "thumb",
    rows: [
      { title: "Fern", meta: "Soft light", icon: "leaf", photo: "lib:fern" },
      { title: "Basil", meta: "Full sun", icon: "leaf", photo: "lib:basil" },
    ],
  },
  {
    style: "shelf",
    aspect: "tall",
    rows: [
      { title: "Fern guide", photo: "lib:fern", progress: 0.5, badge: "In progress" },
      { title: "Basil guide", photo: "lib:basil", progress: 0, badge: "New" },
    ],
  },
  {
    style: "shelf",
    aspect: "square",
    rows: [
      { title: "Fern", photo: "lib:fern" },
      { title: "Basil", photo: "lib:basil" },
    ],
  },
  {
    arrange: "grid",
    rows: [
      { title: "Park walks", icon: "dog", pinned: true, goto: "walks" },
      { title: "Reminders", icon: "clock", unread: true, goto: "reminders" },
    ],
  },
  { style: "cards", rows: c.sampleWalkRows },
  { surface: "plain", rows: c.samplePlantRows },
  { rows: [{ title: "Walk reminder", icon: "clock", trail: "toggle" }] },
] satisfies z.input<typeof props>[];
const { choose, write, read } = c.probesFor("List");
export const probes = [
  choose("Show my plants and let me tap one"),
  choose("Show the room and water interval of one plant", "KeyValue"),
  write("Three plants with their rooms and water due today"),
  write("A sideways row of three plant photo cards to swipe through: Fern, Monstera and Basil"),
  {
    ...write(
      "Show Fern guide and Basil guide on a photo shelf. Give every cover a tall crop, taller than it is wide. Fern guide has 50% progress and the badge In progress. Do not change other settings.",
    ),
    variant: { axis: "aspect", value: "tall" },
  },
  {
    ...write(
      "Put Park walks and Reminders in a two-column grid of quick cards. Park walks is pinned. Reminders is unread.",
    ),
    variant: { axis: "arrange", value: "grid" },
  },
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
function CardDetails({ row, aspect, density, lead, index, grid }: CardDetailProps) {
  const {
    lang,
    words: { listLabels },
  } = kit.useWords();
  const mark = row.unread && row.mark === "none" ? "new" : row.mark;
  const sideTrail = grid && row.trail === "chevron";
  const { badge, unread, pinned, progress } = CardExtras(row, listLabels, lang);
  const leading =
    lead === "number" ? (
      <kit.KitRank place={index + 1} part="rank" density={density} />
    ) : (lead === "thumb" || (grid && lead === undefined)) && row.photo ? (
      <kit.KitPhoto photo={row.photo} part="icon" />
    ) : grid && lead === "icon" && row.icon ? (
      <kit.KitIcon name={row.icon} part="icon" />
    ) : undefined;
  return (
    <kit.KitRow
      item={row.id}
      label={row.title}
      goto={row.goto}
      density={density}
      mark={mark}
      surface={grid}
      leading={leading}
      trailing={sideTrail ? <kit.KitIcon name="chevron_right" part="trail" scale="sm" /> : undefined}
      leadingAlign={lead === "thumb" ? "row" : "line"}
      inset={grid ? "md" : "none"}
    >
      <kit.KitContent density={density} lineRole="body">
        {!grid && !lead && row.photo && (
          <kit.KitPhoto photo={row.photo} aspect={aspect} part="icon" label={row.title} />
        )}
        <kit.KitText role="body" part="title" density={density} tone={cardTitleTone(row, mark)}>
          {row.title}
        </kit.KitText>
        {row.meta && (
          <kit.KitText role="caption" tone="muted" part="meta">
            {row.meta}
          </kit.KitText>
        )}
        {!sideTrail && row.trail !== "none" && (
          <kit.KitTrail kind={row.trail ?? "none"} value={row.value} part="trail" density={density} />
        )}
        {badge}
        {unread}
        {pinned}
        {progress}
      </kit.KitContent>
    </kit.KitRow>
  );
}
type ListRow = ListProps["rows"][number];

function cardTitleTone(row: ListRow, mark: ListRow["mark"]) {
  if (row.me || mark === "new") return "accent";
  if (mark === "muted") return "muted";
  return row.tone === "neutral" ? "text" : row.tone;
}

type CardDetailProps = Pick<ListProps, "aspect" | "density"> & {
  row: ListRow;
  lead: ListProps["lead"] | undefined;
  index: number;
  grid?: ListProps["surface"];
};

function CardExtras(row: ListRow, listLabels: c.Words["listLabels"], lang?: string) {
  return {
    badge: row.badge && (
      <kit.KitContent leadingAlign="row" lead={<kit.KitTrail kind="badge" value={row.badge} part="badge" />}>
        <></>
      </kit.KitContent>
    ),
    unread: row.unread && (
      <kit.KitText role="caption" tone="accent" part="unread">
        {listLabels.unread}
      </kit.KitText>
    ),
    pinned: row.pinned && (
      <kit.KitText role="caption" tone="muted" part="pinned">
        {listLabels.pinned}
      </kit.KitText>
    ),
    progress: row.progress !== undefined && (
      <kit.KitMeter
        label={listLabels.progress}
        amount={c.percentLine(row.progress, 1, lang)}
        ratio={row.progress}
        slim
        addressed={false}
      />
    ),
  };
}

type ListRowLayout = Pick<ListProps, "style" | "surface" | "density" | "lead" | "trail" | "aspect"> & {
  pending: boolean | undefined;
  grid: boolean;
  unread: string;
  pinned: string;
};

function ListRow(row: ListRow, index: number, layout: ListRowLayout) {
  const { style, surface, density, lead, trail, aspect, pending, grid, unread, pinned } = layout;
  if (pending)
    return style === "shelf" ? (
      <kit.KitSkeleton
        key={row.id}
        shape="media"
        inset="none"
        aspect={lead === "icon" ? aspect : "none"}
        density={density}
        lines={[
          { text: row.title, role: "body" },
          ...(row.meta ? [{ text: row.meta, role: "caption" as const }] : []),
        ]}
      />
    ) : (
      <kit.KitSkeleton key={row.id} items={[row]} density={density} lead={row.photo ? "box" : "dot"} />
    );
  const finish = {
    density,
    tone: row.tone,
    mark: row.unread && row.mark === "none" ? ("new" as const) : row.mark,
    surface: style === "cards" ? surface : undefined,
  };
  const leading = lead === "icon" && (style === "shelf" || !row.icon) ? undefined : lead;
  const shelf =
    style === "shelf" && (aspect !== "wide" || row.progress !== undefined || row.badge !== undefined);
  if (shelf || grid)
    return (
      <CardDetails
        key={row.id}
        {...{ row, aspect, density, index }}
        lead={leading}
        {...(grid ? { grid: surface } : {})}
      />
    );
  const item = (
    <kit.KitListItem
      key={row.id}
      {...{ row, index, trail }}
      {...finish}
      lead={leading}
      style={style ?? "inset"}
    />
  );
  return row.unread || row.pinned ? (
    <kit.KitContent key={row.id}>
      {item}
      <kit.KitContent inset="md">
        <kit.KitRow item={row.id} part={null} label={row.title} inline>
          {row.unread && <kit.KitTrail kind="badge" part="unread" value={unread} />}
          {row.pinned && <kit.KitTrail kind="badge" part="pinned" value={pinned} tone="muted" />}
        </kit.KitRow>
      </kit.KitContent>
    </kit.KitContent>
  ) : (
    item
  );
}

function ListRows(input: ListProps & { pending?: boolean }) {
  const { rows, style, surface, group, density, lead, trail, aspect, arrange, pending } = input;
  const { unread, pinned } = kit.useWords().words.listLabels;
  const grid = arrange === "grid" && style !== "shelf" && style !== "expand";
  const layout = style === "shelf" ? (rows.length <= 2 ? "grid" : "strip") : grid ? "grid" : "rows";
  const listRowGap = group === "sections" ? "group" : style === "cards" ? "cards" : undefined;
  const children = rows.map((row, index) =>
    ListRow(row, index, { style, surface, density, lead, trail, aspect, pending, grid, unread, pinned }),
  );
  const groups: { id: string; heading: string; children: typeof children }[] = [];
  const draw = (items: typeof children) => (
    <kit.KitGrid list arrange={layout} {...{ density, listRowGap }}>
      {items}
    </kit.KitGrid>
  );
  if (group === "none" || pending) return draw(children);
  rows.forEach(({ id, section }, index) => {
    const current = groups.at(-1);
    if (current && current.heading === section) current.children.push(children[index]!);
    else if (section) groups.push({ id, heading: section, children: [children[index]!] });
  });
  return groups.map(({ id, heading, children }, index) => (
    <kit.KitContent key={id} group="response">
      <kit.KitContent inset="md" group={index ? "response" : "content"}>
        <kit.KitText role="label" tone="muted" part={null}>
          {heading}
        </kit.KitText>
      </kit.KitContent>
      {draw(children)}
    </kit.KitContent>
  ));
}
export function List(input: ListProps) {
  const { style, surface, arrange } = input;
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const state = kit.useComponentState();
  const { screen, component } = kit.usePartContext();
  const open = kit.useControlValue(`${screen}/${component}/more`, false);
  const { words, lang } = kit.useWords();
  const label = open ? words.peekLess : words.peekMore;
  const more = input.overflow === "peek" && input.rows.length > c.peekLimit;
  const rows = more && !open ? input.rows.slice(0, c.peekLimit) : input.rows;
  const frame =
    style === "shelf"
      ? "plain"
      : style === "cards" || (arrange === "grid" && style !== "expand")
        ? "cards"
        : "inset";
  const finish = { density, surface: style === "shelf" && surface === "card" ? "plain" : surface };
  const structured =
    arrange === "grid" ||
    (style === "shelf" &&
      (input.aspect !== "wide" || rows.some((row) => row.badge || row.progress !== undefined)));
  return (
    <kit.KitCard style={frame} {...finish}>
      {state === "loading" ? (
        structured ? (
          <ListRows {...input} rows={rows} density={density} pending />
        ) : (
          <kit.KitSkeleton
            rows={rows.length}
            items={rows}
            lead={rows[0]?.photo ? "box" : "dot"}
            {...{ density }}
          />
        )
      ) : state === "empty" ? (
        <kit.KitEmpty part="title" />
      ) : (
        <>
          <ListRows {...input} rows={rows} />
          {more && (
            <kit.KitRow part="more" role="button" expanded={open} {...{ label, density }}>
              {!open && (
                <kit.KitText part="count" role="caption" tone="muted">
                  {words.peekCount(c.numberLine(input.rows.length - rows.length, lang))}
                </kit.KitText>
              )}
              <kit.KitText part="more_label" role="label" tone="accent">
                {label}
              </kit.KitText>
            </kit.KitRow>
          )}
        </>
      )}
    </kit.KitCard>
  );
}
