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
  rows: [{ title: "One", value: "42", trail: "toggle", goto: "details" }],
} as const;
const card = { id: "card_one", c: "Card", style: "media", title: "One", photo: "lib:plants" } as const;
const options = { variantComponents: ["List", "Card"] };

it("leaves live List and Card lines intact while the fixtures are staged", () => {
  expect(migrateLine(list)).toBe(list);
  expect(migrateLine(card)).toBe(card);
  const { id: _id, c: _c, state: _state, ...oldList } = list;
  const { id: _cardId, c: _cardC, ...oldCard } = card;
  expect(components.List.props.safeParse(oldList).success).toBe(true);
  expect(components.Card.props.safeParse(oldCard).success).toBe(true);
});

it("migrates before strict validation without changing data or explicit destinations", () => {
  const schema = z.strictObject({
    ...variantProps({ lead: ["none", "number"], trail: ["chevron", "value"] }),
    rows: z.array(
      z.strictObject({
        title: z.string(),
        value: z.string(),
        goto: z.string(),
        ...itemVariantProps({ trail: ["chevron", "toggle"] }, { inheritTrail: true }),
      }),
    ),
  });
  expect(migrateLine(list, options)).toEqual({
    id: "list_one",
    c: "List",
    state: "filled",
    lead: "number",
    trail: "value",
    rows: list.rows,
  });
  const { id: _id, c: _c, state: _state, ...raw } = migrateLine(list, options);
  expect(schema.parse(raw)).toMatchObject({ lead: "number", trail: "value", rows: list.rows });
  expect(migrateLine({ ...list, trail: "badge" }, options)).toMatchObject({ trail: "badge" });
  expect(list.style).toBe("ranked");
});

it.each([
  ["List", "plain", { surface: "plain" }],
  ["List", "inset", { surface: "card" }],
  ["List", "cards", { surface: "card" }],
  ["Card", "plain", { surface: "plain" }],
  ["Card", "outlined", { surface: "outlined" }],
  ["Card", "tinted", { surface: "tinted" }],
  ["Card", "media", { media: "cover" }],
])("migrates %s style %s", (c, style, patch) => {
  const migrated = migrateLine({ c, style, id: "entry" }, options);
  expect(migrated).toEqual({ c, id: "entry", ...patch });
  expect(migrateLine(migrated, options)).toBe(migrated);
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
