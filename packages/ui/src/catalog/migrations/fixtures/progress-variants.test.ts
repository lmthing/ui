import { expect, it } from "vitest";
import { affordancesOf, components, migrateLine, stampItemIds } from "@lmthing/ui/catalog";

it.each([
  ["stack", {}, "comfortable"],
  ["compact", {}, "compact"],
  ["compact", { density: "comfortable" }, "comfortable"],
  [undefined, {}, undefined],
] as const)("migrates Progress %s and per-bar tones with stable item links", (style, explicit, density) => {
  const bars = [
    { label: "Walks", value: 5, of: 4, over: "good" },
    { label: "Visits", value: 8, of: 6, over: "bad", tone: "warn", goto: "visits" },
  ];
  const def = components.Progress;
  const line = migrateLine({ c: "Progress", id: "weekly", ...(style && { style }), ...explicit, bars });
  const { c, id, ...input } = line;
  expect({ c, id }).toEqual({ c: "Progress", id: "weekly" });
  expect(input).not.toHaveProperty("style");
  const parsed = def.props.parse(input);
  expect(parsed.density).toBe(density);
  expect(parsed.bars.map((bar) => bar.tone)).toEqual(["good", "warn"]);
  const stamped = stampItemIds(def.meta, parsed);
  expect(stamped.bars.map((bar) => "id" in bar && bar.id)).toEqual(["r1", "r2"]);
  expect(affordancesOf(def.meta, stamped, "weekly")).toEqual([
    { address: "weekly/r2", part: "root", action: "press", detail: "→visits" },
  ]);
  expect(migrateLine(line)).toEqual(line);
});
