import { expect, it } from "vitest";
import { components, readComponent, variants } from "@lmthing/ui/catalog";
import { addressedElements, renderInstance, styleAt } from "../../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const prefix = "home/c1/";
const grid = components.Library.props.parse(components.Library.examples[0]);
const item = grid.items[0]!;
const tracks = components.Playlist.examples[0]!;
const episodes = components.Playlist.examples[1]!;

// prettier-ignore
it("shows only authored extras and retains controls when the book layout puts the title first", () => {
  const book = { ...components.Collection.examples[0], style: "book", rating: 0, ratingCount: 0, tags: ["Field guide", "Gardening"], shelfStatus: "Want to read" };
  const parts = addressedElements(renderInstance("Collection", book, "filled", theme));
  for (const [part, value, reading] of [["rating", "0", "0 out of 5"], ["rating_count", "0", "0 ratings"],
    ["tags", "Field guide · Gardening", "Field guide · Gardening"], ["shelf_status", "Want to read", "Want to read"]]) {
    expect(parts.get(prefix + part)?.text).toEqual([value]);
    expect(readComponent(components.Collection, book, "c1").join("\n")).toContain(reading);
  }
  const order = [...parts.keys()];
  expect(order.indexOf(prefix + "title")).toBeLessThan(order.indexOf(prefix + "photo"));
  expect(parts.get(prefix + "play")?.attributes).toContain('role="button"');
  expect(parts.get(prefix + "play")?.attributes).toContain('aria-label="Play audiobook"');
  expect(parts.get(prefix + "follow")?.attributes).toContain('role="button"');
});

// prettier-ignore
it.each([{ arrange: "grid" }, { arrange: "rows" }, { arrange: "strip" }, { style: "loans" }] as const)("keeps item roots and shows only supplied loan details in %j", (layout) => {
  const input = { ...layout, items: [{ ...item, status: "borrowed", dueLabel: "Due Friday" }, grid.items[1]!] };
  const addresses = addressedElements(renderInstance("Library", input, "filled", theme));
  expect(addresses.get(`${prefix}r1/status`)?.text).toEqual(["Borrowed"]);
  expect(addresses.get(`${prefix}r1/due_label`)?.text).toEqual(["Due Friday"]);
  expect(addresses.has(`${prefix}r2/status`)).toBe(false);
  const reading = readComponent(components.Library, input, "l1").join("\n");
  expect(reading).toContain("Fern Shelf · Due Friday");
  expect(reading).toContain("[l1/r2 press→window_garden]");
  expect(addresses.get(`${prefix}r2/root`)?.attributes).toContain('role="link"');
});

it("keeps the grid default and respects explicit loan arrangement and row crop", () => {
  const draw = (layout: Record<string, string>) =>
    renderInstance("Library", { ...grid, ...layout }, "filled", theme);
  const photo = `${prefix}r1/photo`;
  expect(draw({})).toEqual(draw({ arrange: "grid" }));
  expect(draw({ style: "loans" })).toEqual(draw({ style: "loans", arrange: "grid" }));
  expect(draw({ style: "loans", arrange: "rows" })).not.toEqual(draw({ style: "loans" }));
  expect(draw({ style: "loans", arrange: "strip" })).not.toEqual(draw({ style: "loans" }));
  expect(styleAt(draw({ arrange: "rows", aspect: "tall" }), photo)).toContain(
    `aspect-ratio:${variants.aspect.tall}`,
  );
  expect(styleAt(draw({ arrange: "rows", aspect: "square" }), photo)).toContain(
    `aspect-ratio:${variants.aspect.square}`,
  );
});

it("keeps the artwork slot in loading without exposing the lead address", () => {
  const html = renderInstance("Playlist", episodes, "loading", theme);
  expect([...addressedElements(html).keys()]).toEqual([
    `${prefix}root`,
    `${prefix}r1/played`,
    `${prefix}r2/played`,
  ]);
  expect(html).not.toContain('role="img"');
});

// prettier-ignore
it.each([[undefined, "Choosing a pot"], [0, "When to water"], [1, undefined]] as const)(
  "places the queue heading before upcoming items only, with current index %s",
  (playing, upcoming) => {
    const input = { ...tracks, playing, style: "queue" };
    const parts = addressedElements(renderInstance("Playlist", input, "filled", theme));
    const keys = [...parts.keys()];
    const heading = keys.indexOf(`${prefix}queue_label`);
    const reading = readComponent(components.Playlist, input, "c1");
    expect(parts.has(`${prefix}r1/root`) && parts.has(`${prefix}r2/trail`)).toBe(true);
    if (!upcoming) {
      expect(heading).toBe(-1);
      expect(reading.join("\n")).not.toContain("Up next");
      return;
    }
    expect(keys[heading + 1]).toBe(`${prefix}r${playing === undefined ? 1 : 2}/root`);
    expect(parts.get(`${prefix}queue_label`)?.text).toEqual(["Up next"]);
    expect(reading.join("\n")).toContain(`Up next — ${upcoming}`);
  },
);
