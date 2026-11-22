import { expect, it } from "vitest";
import { components, createRegistry, lineCodes as code, repairComponent } from "@lmthing/ui/catalog";

const registry = createRegistry({ includeDrafts: true });
const ctx = { cast: { things: [{ type: "plant", fields: [] }], items: [] } };
const action = { icon: "dog", label: "Book walk", goto: "book_walk" };

// Reduced Writer samples: Profile (bare photo), List (Lucide name), Ring (retired id),
// Header (legacy fields) and Actions (shortcut payload).
const cases = [
  { kind: code.componentDrop, line: "List", wanted: undefined },
  {
    kind: code.strip,
    line: { c: "Header", title: "My plants", sub: null },
    wanted: { c: "Header", title: "My plants" },
  },
  {
    kind: code.fill,
    line: { c: "Header", action: { icon: "plus", label: "Add a plant" } },
    wanted: { c: "Header", title: "Plant", action: { icon: "plus", label: "Add a plant" } },
  },
  {
    kind: code.variant,
    line: { c: "Actions", arrange: "cards", items: [action, action] },
    wanted: { c: "Actions", arrange: "grid", items: [action, action] },
  },
  {
    kind: code.enum,
    line: { c: "Header", style: "BACK", title: "My plants" },
    wanted: { c: "Header", style: "back", title: "My plants" },
  },
  {
    kind: code.icon,
    line: { c: "List", rows: [{ title: "How often should I water?", icon: "droplet" }] },
    wanted: { c: "List", rows: [{ title: "How often should I water?", icon: "drop" }] },
  },
  {
    kind: code.photo,
    line: { c: "Profile", name: "Clover", photo: "clover_pic_id" },
    wanted: { c: "Profile", name: "Clover", photo: "lib:clover_pic_id" },
  },
  {
    kind: code.text,
    line: { c: "Header", title: "My plants and their watering schedule" },
    wanted: { c: "Header", title: "My plants and their watering" },
  },
  {
    kind: code.array,
    line: { c: "Actions", items: Array(5).fill(action) },
    wanted: { c: "Actions", items: Array(4).fill(action) },
  },
  {
    kind: code.migrate,
    line: { c: "Ring", detail: "brief", value: 3, of: 5, label: "Watered today" },
    wanted: {
      c: "Progress",
      style: "ring",
      detail: "brief",
      bars: [{ value: 3, of: 5, label: "Watered today" }],
    },
  },
];

it.each(cases)("$kind repairs or drops the fixture", ({ kind, line, wanted }) => {
  const before = JSON.stringify(line);
  expect(repairComponent(line, registry, ctx)).toEqual({
    ...(wanted === undefined ? {} : { component: wanted }),
    codes: [kind],
  });
  expect(JSON.stringify(line)).toBe(before);
});

it("requires an exact and in-scope id without consulting permissive registry resolution", () => {
  const ledger = { c: "Ledger", ...components.Ledger.examples[0] };
  const scoped = createRegistry({ packs: ["books"], includeDrafts: true });
  expect(repairComponent(ledger, scoped, ctx)).toEqual({ component: ledger, codes: [] });
  for (const c of ["header", "he-ad_er", "Ledger", "__proto__", "toString"])
    expect(repairComponent({ ...ledger, c }, registry, ctx)).toEqual({ codes: [code.componentDrop] });
});

it("keeps valid content, fills short required arrays, and ignores undeclared fields at every depth", () => {
  const repaired = repairComponent(
    JSON.parse(
      '{"c":"Actions","id":"a2","state":"error","__proto__":{"polluted":true},"items":[{"icon":"dog","label":"Book walk","goto":"book_walk","bogus":true}]}',
    ),
    registry,
    ctx,
  );
  expect(repaired.codes).toEqual([code.strip, code.fill]);
  expect(repaired.component).toMatchObject({ c: "Actions", id: "a2", items: [action, expect.any(Object)] });
  expect(repaired.component).not.toHaveProperty("state");
  expect(Object.hasOwn(repaired.component!, "__proto__")).toBe(false);
  expect((repaired.component?.items as (typeof action)[])[0]).toEqual(action);
});

it("uses the host photo vocabulary only for malformed references and never normalizes a URL", () => {
  const context = { ...ctx, photoTags: ["plants", "dogs"] };
  const from = (photo: string) => repairComponent({ c: "Photo", photo }, registry, context);
  expect(from("PlantS-")).toEqual({ component: { c: "Photo", photo: "lib:plants" }, codes: [code.photo] });
  expect(from("lib:custom")).toEqual({ component: { c: "Photo", photo: "lib:custom" }, codes: [] });
  expect(from("local:2")).toEqual({ component: { c: "Photo", photo: "local:2" }, codes: [] });
  expect(from("https://example.test/picture.png")).toEqual({
    component: { c: "Photo", photo: "lib:plant" },
    codes: [code.fill],
  });
});

it("keeps valid union values and text with harmless padding while repairing an unrelated field", () => {
  const scoped = createRegistry({ packs: ["data"], includeDrafts: true });
  const line = {
    c: "Table",
    columns: [
      { label: "Left", kind: "text" },
      { label: "Right", kind: "number" },
    ],
    rows: [{ cells: ["  valid  ", 3] }],
    selectable: false,
    extra: true,
  };
  expect(repairComponent(line, scoped, ctx)).toMatchObject({
    component: { rows: [{ cells: ["  valid  ", 3] }] },
    codes: [code.strip],
  });
});

it("drops an unrepairable extra row instead of losing otherwise valid shortcuts", () => {
  const second = { icon: "users", label: "Clients", goto: "clients" };
  expect(repairComponent({ c: "Actions", items: [action, second, {}] }, registry, ctx)).toEqual({
    component: { c: "Actions", items: [action, second] },
    codes: [code.strip],
  });
});

it.each(["Timeline", "DayTimeline"])("preserves the legacy blocks of a saved %s", (c) => {
  const blocks = [
    { start: "11:00", end: "12:30", title: "Repot basil", tone: "warn" },
    { start: "09:00", end: "10:00", title: "Water the fern", goto: "fern" },
  ];
  const result = repairComponent({ c, id: "d1", blocks }, registry, ctx);
  expect(result).toMatchObject({
    codes: [code.migrate],
    component: {
      c: "Timeline",
      id: "d1",
      style: "hours",
      items: [
        { time: "11:00", end: "12:30", title: "Repot basil", tone: "warn" },
        { time: "09:00", end: "10:00", title: "Water the fern", goto: "fern" },
      ],
    },
  });
});
