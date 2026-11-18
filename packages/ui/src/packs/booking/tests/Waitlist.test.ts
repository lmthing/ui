import { describe, expect, it } from "vitest";
import { affordancesOf, components, readComponent, queueLabels } from "@lmthing/ui/catalog";
import { renderInstance } from "../../../../test/render";

const { props, meta, examples, fallback, probes } = components.Waitlist;
it("keeps distinct exact boundary counts in accessibility labels and the agent reading", () => {
  const input = { position: Number.MAX_SAFE_INTEGER, ahead: Number.MAX_SAFE_INTEGER - 1, joined: true };
  const html = renderInstance("Waitlist", input, "filled", { preset: "bold", mode: "dark", accent: "moss" });
  expect(html).toContain("9.01Q");
  expect(html).toContain('aria-label="Your place in line: 9007199254740991; 9007199254740990 people ahead"');
  const reading = readComponent(components.Waitlist, input, "w1").join("\n");
  expect(reading).toContain("9007199254740991");
  expect(reading).toContain("9007199254740990");
});
describe("Waitlist schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it.each([
    {},
    { ahead: -1, joined: false },
    { ahead: 1.5, joined: false },
    { ahead: 0, joined: "yes" },
    { ahead: 0, joined: true, position: 0 },
    { ahead: 0, joined: true, position: 1.5 },
    { ahead: Infinity, joined: false },
    { ahead: 0, joined: false, color: "#fff" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
});
describe("Waitlist fallback", () => {
  it.each([
    { things: [], items: [] },
    {
      things: [{ type: "plant", fields: ["name"] }],
      items: [{ id: "fern", type: "plant", sample: true, name: "Fern" }],
    },
    { things: [], items: [{ id: "bad", type: "thing", sample: false, name: 7 }] },
  ])("accepts empty, matching and malformed casts", (cast) => {
    expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast })).toEqual({ ahead: 0, joined: false });
  });
});
describe("Waitlist probes and actions", () => {
  it("includes the core capacity near miss, write, and both read states", () => {
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Progress")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Waitlist" });
    expect(probes.filter((probe) => probe.kind === "read")).toHaveLength(2);
    expect(meta.confirmParts).toEqual(["leave"]);
  });
  it.each([false, true])("offers only the drawn action when joined is %s", (joined) => {
    const input = { ahead: 2, joined, position: 3 };
    const html = renderInstance("Waitlist", input, "filled", {
      preset: "calm",
      mode: "light",
      accent: "moss",
    });
    const part = joined ? "leave" : "join";
    expect(affordancesOf(meta, props.parse(input), "w1")).toEqual([
      { address: `w1/${part}`, part, action: "press", detail: "" },
    ]);
    expect(html).toContain(`home/c1/${part}`);
    expect(html).not.toContain(`home/c1/${joined ? "join" : "leave"}`);
    expect(html.includes("home/c1/position")).toBe(joined);
    expect(readComponent(components.Waitlist, input, "w1").join("\n")).toContain(
      joined ? queueLabels.leave : queueLabels.join,
    );
  });
  it("renders joined without a position, zero ahead, success and the largest allowed integers", () => {
    for (const state of ["filled", "success"] as const)
      for (const input of [
        { ahead: 0, joined: true },
        { ahead: Number.MAX_SAFE_INTEGER, joined: true, position: Number.MAX_SAFE_INTEGER },
      ])
        expect(
          renderInstance("Waitlist", input, state, { preset: "calm", mode: "dark", accent: "moss" }),
        ).toContain(queueLabels.leave);
  });
});
