import { readFileSync, readdirSync } from "node:fs";
import { URL } from "node:url";
import { expect, it } from "vitest";
import {
  assembleScreen,
  createRegistry,
  lineCodes as code,
  readScreen,
  components,
  packIds,
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
