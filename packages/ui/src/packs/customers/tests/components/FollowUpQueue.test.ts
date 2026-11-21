import { afterEach, describe, expect, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  readComponent,
  stampItemIds,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.FollowUpQueue;
const { examples, fallback, meta, props, probes } = def;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const row = { id: "first", clientName: "Alpha", kind: "quote", due: "2026-11-20", done: false } as const;
const input = {
  items: [
    { ...row, id: "later", clientName: "Later", due: "2026-11-22" },
    { ...row, goto: "client", note: "Open quote", amount: 0 },
    { ...row, id: "today", clientName: "Today", due: "2026-11-21" },
    { ...row, id: "finished", clientName: "Finished", due: "2026-11-19", done: true },
  ],
};
const prefix = "home/c1/";
const render = (value: unknown, state: (typeof meta.states)[number] = "filled") =>
  renderInstance("FollowUpQueue", value, state, theme);
afterEach(() => vi.useRealTimers());

describe("FollowUpQueue contract and fallback", () => {
  it.each(examples)("accepts a domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it.each([
    { items: [] },
    { items: Array.from({ length: 7 }, (_, i) => ({ ...row, id: `row_${i}` })) },
    { items: [row, row] },
    { items: [{ ...row, id: "x".repeat(25) }] },
    { items: [{ ...row, clientName: "x".repeat(25) }] },
    { items: [{ ...row, note: "x".repeat(49) }] },
    { items: [{ ...row, due: "2026-02-31" }] },
    { items: [{ ...row, done: "false" }] },
    { items: [{ ...row, kind: "order" }] },
    { items: [{ ...row, goto: "Bad ID" }] },
    { items: [{ ...row, amount: Infinity }] },
    { items: [{ ...row, overdue: true }] },
    { items: [row], color: "#123456" },
  ])("rejects invalid input", (value) => expect(props.safeParse(value).success).toBe(false));
  it("accepts exact boundaries", () => {
    const items = Array.from({ length: 6 }, (_, i) => ({
      ...row,
      id: "a".repeat(23) + i,
      clientName: "a".repeat(24),
      note: "b".repeat(48),
    }));
    expect(props.parse({ items }).items).toHaveLength(6);
  });
  it("uses only declared cast text or a neutral fallback", () => {
    const things = [{ type: "record", fields: ["label", "summary"] }];
    const cast = {
      things,
      items: [{ id: "a", type: "record", sample: true, label: "Alpha", summary: "Detail" }],
    };
    for (const seed of [
      cast,
      { things, items: [{ ...cast.items[0]!, label: 1, summary: null }] },
      { things: [], items: [] },
    ])
      expect(props.safeParse(fallback({ cast: seed })).success).toBe(true);
    expect(fallback({ cast }).items[0]).toMatchObject({ clientName: "Alpha", note: "Detail" });
    expect(fallback({ cast: { things: [], items: [] } }).items[0]?.clientName).toBe("Item one");
  });
  it("gates registry access and declares all probe kinds with a core near miss", () => {
    expect(createRegistry({ packs: ["customers"] }).ids.includes(meta.id)).toBe(packReady("customers"));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Checklist" }));
    expect(probes.map((probe) => probe.kind)).toEqual(["choose", "choose", "write", "write", "read"]);
    expect(meta.partTiers.remind).toBe("service");
  });
});

describe("FollowUpQueue states, parts and actions", () => {
  it("orders pending rows by date, shows today and overdue, and keeps stable addresses across grouping", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 21, 12));
    const grouped = addressedElements(render(input));
    const flatHtml = render({ ...input, group: "none" });
    const flat = addressedElements(flatHtml);
    expect([...grouped.keys()].filter((key) => key.endsWith("/client_name"))).toEqual(
      ["r2", "r3", "r1", "r4"].map((id) => `${prefix}${id}/client_name`),
    );
    expect(grouped.get(`${prefix}today`)?.text).toEqual(["Due today"]);
    expect(flat.has(`${prefix}r2/due`)).toBe(true);
    expect(flat.has(`${prefix}r4/due`)).toBe(true);
    expect(flatHtml).toContain(">Overdue · 20 Nov 2026<");
    expect(flatHtml).toContain(">Done · 19 Nov 2026<");
    expect([...grouped.keys()].filter((key) => !flat.has(key))).toEqual(
      ["overdue", "today", "upcoming", "completed"].map((part) => prefix + part),
    );
    const reading = readComponent(def, input, "c1", "filled", {}, "en-GB", undefined, "GBP").join("\n");
    expect(reading).toContain("r2 Quote · Open quote · Overdue · 20 Nov 2026 · £0");
    expect(reading).not.toContain('"r2"');
    expect(reading.indexOf('"Alpha"')).toBeLessThan(reading.indexOf('"Later"'));
  });
});

describe("FollowUpQueue read and act", () => {
  it("only offers drawn actions, without routing snooze or remind to the client's link", () => {
    const offers = affordancesOf(meta, stampItemIds(meta, props.parse(input)), "c1");
    expect(
      offers.filter((offer) => offer.address.startsWith("c1/r2")).map(({ part, detail }) => [part, detail]),
    ).toEqual([
      ["root", "→client"],
      ["done", ":todo"],
      ["snooze", ""],
      ["remind", ""],
    ]);
    expect(offers.some(({ address }) => address === "c1/r1")).toBe(false);
    expect(offers.some(({ address }) => address.startsWith("c1/r4"))).toBe(false);
    const parts = addressedElements(render(input));
    for (const part of ["done", "snooze", "remind"]) expect(parts.has(`${prefix}r2/${part}`)).toBe(true);
    expect(parts.get(`${prefix}r2/root`)?.attributes).toContain('role="link"');
    expect(parts.get(`${prefix}r4/done`)?.attributes).not.toContain('role="checkbox"');
    expect(parts.has(`${prefix}r4/remind`)).toBe(false);
  });
  it("checks a row through the controller and removes only that row's outreach actions", () => {
    const screen = { id: "home", components: [{ id: "c1", c: meta.id, ...input }] };
    const controller = createScreenController({ screen, defs: { FollowUpQueue: def } });
    try {
      expect(controller.actionsAt(`${prefix}r2/done`)).toContain("check");
      controller.act({ address: `${prefix}r2/done`, action: "check", value: true });
      expect(controller.actionsAt(`${prefix}r2/done`)).toEqual([]);
      expect(controller.actionsAt(`${prefix}r2/snooze`)).toEqual([]);
      expect(controller.actionsAt(`${prefix}r2/remind`)).toEqual([]);
      expect(controller.actionsAt(`${prefix}r2`)).toContain("press");
      expect(controller.actionsAt(`${prefix}r1/remind`)).toContain("press");
    } finally {
      controller.dispose();
    }
  });
  it.each(["empty", "loading", "success", "error"] as const)(
    "draws the %s state without actions",
    (state) => {
      const html = render(input, state);
      expect(affordancesOf(meta, stampItemIds(meta, props.parse(input)), "c1", {}, state)).toEqual([]);
      expect(addressedElements(html).has(`${prefix}r2/root`)).toBe(false);
      if (state === "loading") expect(html).toContain('aria-busy="true"');
      else expect(addressedElements(html).get(`${prefix}status`)?.text).not.toEqual([]);
    },
  );
});
