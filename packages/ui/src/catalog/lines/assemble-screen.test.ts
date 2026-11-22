import { readFileSync, readdirSync } from "node:fs";
import { URL } from "node:url";
import { expect, it } from "vitest";
import {
  affordancesOf,
  assembleScreen,
  createRegistry,
  lineCodes as code,
  readScreen,
  components,
  packIds,
  stampItemIds,
} from "@lmthing/ui/catalog";

const ctx = { cast: { things: [], items: [] } };
const packs = new URL("../../packs/", import.meta.url);
const examples = packIds.filter((id) => readdirSync(new URL(`${id}/`, packs)).includes("example.jsonl"));

it.each(examples)("%s/example.jsonl assembles in order with zero repairs", (id) => {
  const lines = readFileSync(new URL(`${id}/example.jsonl`, packs), "utf8")
    .trim()
    .split(/\r?\n/);
  const registry = createRegistry({ packs: [id], includeDrafts: true });
  const { screen, codes } = assembleScreen(lines, registry, { ...ctx, id });
  expect(codes).toEqual([]);
  expect(screen.components).toEqual(lines.filter((line) => line.trim()).map((line) => JSON.parse(line)));
});

it("projects persisted ids into real affordances after a row replacement", () => {
  const registry = createRegistry();
  const first = assembleScreen(
    ['{"id":"l1","c":"List","rows":[{"title":"Old","goto":"old"}]}'],
    registry,
    ctx,
  );
  const result = assembleScreen(['{"id":"l1","c":"List","rows":[{"title":"New","goto":"new"}]}'], registry, {
    ...ctx,
    counters: first.screen.counters,
  });
  const { id, c: _c, state: _state, ...wire } = result.screen.components[0]!;
  const def = components.List;
  const props = def.props.parse(wire);
  expect(() => stampItemIds(def.meta, props, [])).toThrow(/do not match/);
  const addressed = stampItemIds(def.meta, props, result.screen.itemIds[id]);
  const offers = affordancesOf(def.meta, addressed, id);
  expect(offers).toContainEqual(
    expect.objectContaining({ address: "l1/r2", action: "press", detail: "→new" }),
  );
  expect(offers.some(({ address }) => address === "l1/r1")).toBe(false);
  expect(wire.rows).toEqual([{ title: "New", goto: "new" }]);
});

it("keeps wire props readable and does not sort, add components, or repair links", () => {
  const registry = createRegistry();
  const { screen, codes } = assembleScreen(
    [
      "{'c':'List','rows':[{'title':'Keep me','goto':'not_a_screen',}],}",
      '{"c":"missing"}',
      "invalid",
      '{"c":"Header","title":"After the list"}',
    ],
    registry,
    { ...ctx, id: "home", title: "Home" },
  );
  expect(codes).toEqual([code.quotes, code.comma, code.componentDrop, code.parseDrop]);
  expect(screen.components).toEqual([
    { id: "l1", c: "List", rows: [{ title: "Keep me", goto: "not_a_screen" }] },
    { id: "h1", c: "Header", title: "After the list" },
  ]);
  expect(screen.itemIds).toEqual({ l1: ["r1"] });
  expect(readScreen(screen, components)).toContain("Keep me");
});
