import { expect, it, vi } from "vitest";
import { components, createRegistry, packReady, readComponent } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.TeamDirectory;
const { examples, fallback, props, meta } = def;
const full = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

it.each(examples)("parses team directory examples", (example) => {
  expect(props.safeParse(example).success).toBe(true);
});

it("bounds departments, members, names, availability, photos and queries", () => {
  const row = full.members[0]!;
  const members = Array.from({ length: 16 }, () => row);
  const departments = Array.from({ length: 6 }, () => "x".repeat(24));
  expect(props.safeParse({ members, departments, query: "x".repeat(32) }).success).toBe(true);
  for (const bad of [
    { members: [] },
    { members: [...members, row] },
    { departments: [...departments, "X"] },
    { query: "x".repeat(33) },
    { members: [{ ...row, name: "x".repeat(25) }] },
    { members: [{ ...row, availability: "online" }] },
    { members: [{ ...row, photo: "https://example.com" }] },
  ])
    expect(props.safeParse({ ...full, ...bad }).success).toBe(false);
});

it("uses cast names or neutral alternatives and follows team pack readiness", () => {
  const cast = { things: [], items: [] };
  expect(props.safeParse(fallback({ cast })).success).toBe(true);
  const item = { id: "staff", type: "person", name: "Rae", sample: true };
  expect(fallback({ cast: { ...cast, items: [item] } }).members[0]?.name).toBe("Rae");
  expect(createRegistry({ packs: ["team"] }).ids.includes("TeamDirectory")).toBe(packReady("team"));
});

it("keeps addresses tied to members when grouped, filtered and shown in brief", () => {
  const result = { ...full, query: "grower" };
  const html = renderInstance("TeamDirectory", result, "filled", theme);
  const addressed = addressedElements(html);
  expect(addressed.has("home/c1/r1/call")).toBe(true);
  expect(addressed.has("home/c1/r2/call")).toBe(false);
  expect(html).toContain("Reports to Anna Cole");
  expect(html).toContain("On shift");
  const brief = renderInstance("TeamDirectory", { ...result, detail: "brief" }, "filled", theme);
  expect(addressedElements(brief).has("home/c1/r1/root")).toBe(true);
  expect(addressedElements(brief).has("home/c1/r1/call")).toBe(false);
  const reading = readComponent(def, result, "t1").join("\n");
  expect(reading).toContain("Rae Price");
  expect(reading).not.toContain("Lee Park");
});

it("reprojects offers as search edits hide and restore the same members", () => {
  const onLink = vi.fn();
  const screen = { id: "home", components: [{ ...full, id: "t1", c: "TeamDirectory" }] };
  const runtime = createScreenController({ screen, defs: components, onLink });
  const search = (value: string) => runtime.act({ address: "t1/search", action: "type", value });
  expect(meta.partTiers.call).toBe("service");
  expect(runtime.press("t1/r1")).toMatchObject({ ok: true });
  expect(onLink).toHaveBeenCalledWith("rae", "home/t1/r1");
  expect(runtime.press("t1/r2")).toMatchObject({ ok: true });
  expect(runtime.press("t1/r1/message")).toMatchObject({ ok: true });
  expect(search("dispatcher")).toMatchObject({ ok: true });
  expect(runtime.press("t1/r1/call")).toMatchObject({ ok: false });
  expect(runtime.press("t1/r3/call")).toMatchObject({ ok: true });
  expect(search("nothing")).toMatchObject({ ok: true });
  expect(runtime.press("t1/r3/call")).toMatchObject({ ok: false });
  expect(search("")).toMatchObject({ ok: true });
  expect(runtime.press("t1/r1/call")).toMatchObject({ ok: true });
  expect(onLink).toHaveBeenCalledTimes(1);
  runtime.dispose();
});

it.each(["filled", "empty", "loading"] as const)(
  "renders %s with matching search and contact controls",
  (state) => {
    const screen = {
      id: "home",
      components: [{ ...full, id: "t1", c: "TeamDirectory", state, detail: "brief" }],
    };
    const runtime = createScreenController({ screen, defs: components });
    expect(runtime.press("t1/r1/call")).toMatchObject({ ok: false });
    expect(runtime.act({ address: "t1/search", action: "type", value: "Rae" })).toMatchObject({
      ok: state !== "loading",
    });
    runtime.dispose();
    const html = renderInstance("TeamDirectory", { ...full, query: "no such member" }, state, theme);
    if (state === "loading") expect(html).toContain('aria-busy="true"');
    else expect(html).toContain("No matching teammates");
  },
);
