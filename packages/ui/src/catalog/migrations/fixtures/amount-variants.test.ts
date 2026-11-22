import { expect, it } from "vitest";
import { affordancesOf, components, migrateLine } from "@lmthing/ui/catalog";

it.each([
  ["inline", { style: "inline", emphasis: "normal" }, {}],
  ["large", { emphasis: "hero" }, { emphasis: "normal" }],
  ["total", { style: "total" }, {}],
] as const)("migrates the legacy Amount %s treatment without changing links", (style, expected, override) => {
  const legacy = { c: "Amount", id: "walks_price", state: "filled", style, value: 18, goto: "walks" };
  const def = components.Amount;
  for (const explicit of [{}, override]) {
    const line = migrateLine({ ...legacy, ...explicit });
    const { c, id, state, ...input } = line;
    expect({ c, id, state }).toEqual({ c: "Amount", id: "walks_price", state: "filled" });
    if (style === "large") expect(input).not.toHaveProperty("style");
    const parsed = def.props.parse(input);
    expect(parsed).toMatchObject({ ...expected, ...explicit, value: 18 });
    expect(affordancesOf(def.meta, parsed, "walks_price")).toEqual([
      { address: "walks_price", part: "root", action: "press", detail: "→walks" },
    ]);
    expect(migrateLine(line)).toEqual(line);
  }
});
