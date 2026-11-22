import { expect, it } from "vitest";
import { z } from "zod";
import {
  components,
  itemVariantProps,
  migrateJSONL,
  migrateLine,
  migrateScreen,
  migrateVariantProps,
  variantProps,
} from "@lmthing/ui/catalog";

const list = {
  id: "list_one",
  c: "List",
  state: "filled",
  style: "ranked",
  rows: [
    { title: "One", value: "42", trail: "toggle", goto: "details" },
    { title: "Two", trail: "badge" },
  ],
} as const;
const card = { id: "card_one", c: "Card", style: "media", title: "One", photo: "lib:plants" } as const;
const options = { variantComponents: ["List", "Card"] };

it("activates both migrations before strict parsing", () => {
  expect(migrateLine(list)).not.toHaveProperty("style");
  const { id: _id, c: _c, state: _state, ...oldList } = list;
  const { id: _cardId, c: _cardC, ...oldCard } = card;
  expect(components.List.props.safeParse(oldList).success).toBe(false);
  expect(components.Card.props.safeParse(oldCard).success).toBe(false);
  const { id, c, ...upgraded } = migrateLine(card);
  expect({ id, c }).toEqual({ id: card.id, c: card.c });
  expect(components.Card.props.parse(upgraded)).toMatchObject({
    media: "cover",
    photo: card.photo,
  });
});

it("preserves the old ranked display before strict validation, not the unused row trail", () => {
  const schema = z.strictObject({
    ...variantProps({ lead: ["none", "number"], trail: ["chevron", "value"] }),
    rows: z.array(
      z.strictObject({
        title: z.string(),
        value: z.string().optional(),
        goto: z.string().optional(),
        ...itemVariantProps({ trail: ["chevron", "none"] }, { inheritTrail: true }),
      }),
    ),
  });
  expect(migrateLine(list, options)).toEqual({
    id: "list_one",
    c: "List",
    state: "filled",
    lead: "number",
    trail: "value",
    rows: [
      { title: "One", value: "42", goto: "details" },
      { title: "Two", trail: "none" },
    ],
  });
  const { id: _id, c: _c, state: _state, ...raw } = migrateLine(list, options);
  const parsed = schema.parse(raw);
  expect(parsed.rows.map((row) => row.trail ?? parsed.trail)).toEqual(["value", "none"]);
  expect(parsed.rows[0]?.goto).toBe("details");
  expect(migrateLine({ ...list, trail: "badge" }, options)).toMatchObject({ trail: "badge" });
  expect(list.style).toBe("ranked");
  expect(list.rows[0].trail).toBe("toggle");
});

it.each([
  ["List", "plain", {}],
  ["List", "inset", {}],
  ["List", "cards", { style: "cards" }],
  ["Card", "plain", {}],
  ["Card", "outlined", {}],
  ["Card", "tinted", {}],
  ["Card", "media", { media: "cover" }],
])("migrates %s style %s", (c, style, patch) => {
  const migrated = migrateLine({ c, style, id: "entry" }, options);
  expect(migrated).toEqual({ c, id: "entry", ...patch });
  expect(migrateLine(migrated, options)).toBe(migrated);
});

it("retains separate row-card structure and drops the old surface", () => {
  const entry = { ...list, style: "cards", surface: "outlined" };
  expect(migrateLine(entry, options)).toEqual({ ...list, style: "cards" });
  expect(migrateLine({ ...list, style: "inset" }, options)).not.toHaveProperty("style");
});

it("keeps an icon authored for legacy Card media without overriding a new media value", () => {
  const legacy = { c: "Card", style: "media", title: "One", icon: "leaf" };
  const { c: _c, ...props } = migrateLine(legacy);
  expect(components.Card.props.parse(props)).toMatchObject({ media: "thumb", icon: "leaf" });
  expect(migrateLine({ ...legacy, media: "none" })).toMatchObject({ media: "none" });
});

it("replays List's legacy body and me inference in that order", () => {
  const implicit = { c: "List", rows: [{ title: "One", me: true, value: "42", trail: "toggle" }] };
  const migrated = migrateLine(implicit, options);
  expect(migrated).toEqual({
    c: "List",
    lead: "number",
    trail: "value",
    rows: [{ title: "One", me: true, value: "42" }],
  });
  expect(migrateLine(migrated, options)).toBe(migrated);
  const rows = [{ ...implicit.rows[0], title: "One", body: "Answer" }];
  expect(migrateLine({ c: "List", style: "ranked", rows }, options)).toEqual({
    c: "List",
    style: "expand",
    rows,
  });
});

it("preserves Lists that inferred expansion from only some rows", () => {
  const rows = [{ title: "With answer", body: "Answer" }, { title: "Without answer" }];
  const original = { c: "List", style: "inset", rows };
  const { c: _c, ...migrated } = migrateLine(original, options);
  expect(migrated).toEqual({ rows });
  expect(components.List.props.parse(migrated).style).toBe("expand");
});

it("preserves the old photo priority without overriding an adopted lead", () => {
  const rows = [{ title: "One", photo: "lib:plants", icon: "leaf" }];
  expect(migrateLine({ c: "List", style: "inset", rows })).toEqual({
    c: "List",
    rows: [{ title: "One", photo: "lib:plants" }],
  });
  const adopted = { c: "List", lead: "icon", rows };
  expect(migrateLine(adopted)).toBe(adopted);
});

it.each(["list", "l-i_s t"])("migrates normalizable List id %s before validation", (c) => {
  expect(migrateLine({ ...list, c, style: "inset" }, options)).toEqual({
    id: list.id,
    c: "List",
    state: list.state,
    rows: list.rows,
  });
});

it("supports tone moves without touching unknown or structural values", () => {
  const moves = [{ from: "tone", values: { success: { tone: "good" } } }] as const;
  expect(migrateVariantProps({ tone: "success", title: "One" }, moves)).toEqual({
    tone: "good",
    title: "One",
  });
  const unknown = { tone: "unrecognised" };
  expect(migrateVariantProps(unknown, moves)).toBe(unknown);
  const structural = { ...list, style: "expand" };
  expect(migrateLine(structural, options)).toBe(structural);
  const inherited = { ...list, style: "constructor" };
  expect(migrateLine(inherited, options)).toBe(inherited);
});

it("migrates screens and JSON Lines through the same opt-in path", () => {
  const screen = { id: "home", components: [list, card] };
  const upgraded = migrateScreen(screen, options);
  const jsonl = [JSON.stringify(screen), JSON.stringify(card), ""].join("\n");
  const [screenLine, cardLine, blank] = migrateJSONL(jsonl, options).split("\n");
  expect(JSON.parse(screenLine!)).toEqual(upgraded);
  expect(JSON.parse(cardLine!)).toEqual({
    id: "card_one",
    c: "Card",
    media: "cover",
    title: "One",
    photo: "lib:plants",
  });
  expect(upgraded.components.map(({ id }) => id)).toEqual(["list_one", "card_one"]);
  expect(blank).toBe("");
});

it("drops the four presentation props from saved core and pack lines, not their theme", () => {
  const appearance = { density: "compact", surface: "outlined", bleed: "edge", align: "center" };
  const theme = { density: "comfortable" };
  const expected = [
    { id: "photo", c: "Photo", photo: "lib:plants", aspect: "square", detail: "brief" },
    { id: "menu", c: "ServiceMenu", style: "cards", services: [{ name: "Walk", minutes: 30, goto: "book" }] },
  ] as const;
  const screen = Object.freeze({
    id: "home",
    theme,
    components: expected.map((entry) => Object.freeze({ ...entry, ...appearance })),
  });
  const migrated = migrateScreen(screen, { variantOnly: true });
  expect(migrated).toEqual({ id: "home", theme, components: expected });
  for (const { id: _id, c, ...props } of migrated.components) {
    const def = components[c as "Photo" | "ServiceMenu"];
    expect(def.props.safeParse(props).success).toBe(true);
  }
  expect(migrateScreen(migrated)).toEqual(migrated);
  expect(JSON.parse(migrateJSONL(JSON.stringify(screen)))).toEqual(migrated);
  expect(screen.components[0]).toMatchObject(appearance);
  expect(migrateLine(theme)).toBe(theme);
});

it.each([
  ["People", "rows", {}],
  ["Gallery", "grid", { arrange: "grid" }],
  ["Gallery", "strip", { arrange: "strip" }],
  ["Stats", "tiles", { arrange: "grid" }],
  ["Stats", "inline", { arrange: "rows" }],
  ["KeyValue", "rows", { arrange: "rows" }],
  ["KeyValue", "grid", { arrange: "grid" }],
])("migrates legacy %s style %s by default", (c, style, patch) => {
  const expected = { c, id: "entry", ...patch };
  const original = { c, style, id: "entry" };
  expect(migrateLine(original)).toEqual(expected);
  expect(migrateLine(expected)).toBe(expected);
  expect(migrateLine(original, { variantComponents: [] })).toBe(original);
});
