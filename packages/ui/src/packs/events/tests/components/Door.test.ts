import { describe, expect, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readScreen,
  type DeviceData,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { pack } from "../..";

const { Door } = components;
const { meta, props, fallback, examples, probes } = Door;
type Input = ReturnType<typeof fallback>;
const first: Input = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const address = (part: string) => `home/d1/${part}`;
const tickets = [
  { instance: "d1", id: "r4", name: "Jo Bell" },
  { instance: "d1", id: "r8", name: "Lee Ortiz" },
  { instance: "d1", id: "r11", name: "Sam Bell", arrivedAt: 2 },
  { instance: "other", id: "r12", name: "Other Guest" },
];
const host: DeviceData = { doorTickets: tickets, doorScanner: ["d1"] };
const screen = (input: Input, state: StateName) => ({
  id: "home",
  components: [{ id: "d1", c: "Door", state, ...input }],
});
const render = (input = first, state: StateName = "filled", deviceData: DeviceData = host) =>
  renderInstance("Door", input, state, theme, { component: "d1", deviceData });
const read = (input = first, state: StateName = "filled", values = {}, data = host) =>
  readScreen(screen(input, state), { Door }, values, undefined, data);
const mount = (state: StateName = "filled", deviceData = host, onAction = vi.fn()) =>
  createScreenController({ screen: screen(first, state), defs: { Door }, deviceData, onAction });

describe("Door contract and fallback", () => {
  it.each(examples)("accepts examples with only a hint and optional variants", (input) =>
    expect(props.safeParse(input).success).toBe(true),
  );
  it("trims the hint and keeps hosts, not the Writer, responsible for admission data", () => {
    expect(props.parse({ hint: ` ${"x".repeat(40)} ` })).toMatchObject({
      hint: "x".repeat(40),
      detail: "full",
    });
    for (const fields of [
      { hint: "" },
      { hint: "x".repeat(41) },
      { arrivals: 4 },
      { doorTickets: tickets },
      { results: [] },
      { recent: [] },
      { scannerReady: true },
      { query: "Lee" },
      { color: "red" },
      { density: "tiny" },
      { detail: "minimal" },
    ])
      expect(props.safeParse({ ...first, ...fields }).success).toBe(false);
  });
  it("uses a cast label or neutral copy for an empty or malformed cast", () => {
    const item = { id: "event", type: "record", sample: true, title: "  Spring opening  " };
    for (const [items, hint] of [
      [[item], "Spring opening"],
      [[{ ...item, title: 5 }], placeholderTitle(0)],
      [[], placeholderTitle(0)],
    ] as const) {
      const input = fallback({ cast: { things: [], items: [...items] } });
      expect(props.safeParse(input).success).toBe(true);
      expect(input).toEqual({ hint });
    }
  });
  it("keeps the pack gate, tier and core-first near miss", () => {
    expect(createRegistry({ packs: [pack.id] }).ids.includes(meta.id)).toBe(packReady(pack.id));
    expect(meta.tier).toBe("ok");
    for (const probe of [
      { kind: "choose", expect: "Door" },
      { kind: "choose", expect: "Camera" },
      { kind: "write", expect: "Door" },
      { kind: "write", variant: { axis: "detail", value: "brief" } },
      { kind: "read", expect: { address: "d1/scan", action: "scan" } },
    ])
      expect(probes).toContainEqual(expect.objectContaining(probe));
  });
});

describe("Door states and parts", () => {
  it("only shows declared host data and keeps addresses across finishes", () => {
    const parts = addressedElements(render());
    expect(parts.get(address("arrivals"))?.text).toEqual(["1 of 3"]);
    expect(parts.get(address("recent"))?.text).toEqual(["Recent: Sam Bell"]);
    expect(parts.get(address("r8/name"))?.text).toEqual(["Lee Ortiz"]);
    expect(parts.has(address("r12/name"))).toBe(false);
    expect(parts.get(address("scan"))?.attributes).toContain('role="button"');
    expect([
      ...addressedElements(render({ ...first, density: "compact", surface: "outlined" })).keys(),
    ]).toEqual([...parts.keys()]);
    const brief: Input = { ...first, detail: "brief" };
    expect([...addressedElements(render(brief)).keys()]).toEqual(
      [...parts.keys()].filter((part) => part !== address("recent")),
    );
    expect(read(brief)).not.toContain("Sam Bell");
  });
  it("does not claim a count, search result or camera access without host data", () => {
    const parts = addressedElements(render(first, "filled", {}));
    expect(parts.get(address("arrivals"))?.text).toEqual(["No ticket totals yet"]);
    expect(parts.get(address("scan"))?.attributes).toContain('aria-disabled="true"');
    expect(parts.has(address("r4/checkin"))).toBe(false);
    expect(mount("filled", {}).actionsAt("d1/scan")).toEqual([]);
    expect(read(first, "filled", {}, {})).not.toContain("[d1/scan scan");
  });
  it("reflects the host's recent check-in while retaining scan, search and remaining admissions", () => {
    const refreshed = {
      ...host,
      doorTickets: tickets.map((row) => (row.id === "r4" ? { ...row, arrivedAt: 3 } : row)),
    };
    const success = addressedElements(render(first, "success", refreshed));
    expect(success.get(address("feedback"))?.text).toEqual(["Guest checked in"]);
    expect(success.get(address("arrivals"))?.text).toEqual(["2 of 3"]);
    expect(success.get(address("recent"))?.text).toEqual(["Recent: Jo Bell, Sam Bell"]);
    expect(success.has(address("scan"))).toBe(true);
    expect(success.has(address("search"))).toBe(true);
    expect(success.has(address("r4/checkin"))).toBe(false);
    expect(success.has(address("r8/checkin"))).toBe(true);
    expect(mount("success", refreshed).actionsAt("d1/scan")).toEqual(["scan"]);
    expect(mount("success", refreshed).actionsAt("d1/r4/checkin")).toEqual([]);
    expect(mount("success", refreshed).actionsAt("d1/r8/checkin")).toEqual(["press"]);
    expect(read(first, "success", {}, refreshed)).toContain("Guest checked in");
  });
  it("shows either error without offering unsupported controls", () => {
    const failed = { ...host, doorFeedback: [{ instance: "d1", reason: "already_in" }] };
    const error = addressedElements(render(first, "error", failed));
    expect(error.get(address("feedback"))?.text).toEqual(["Guest already checked in"]);
    expect(error.has(address("scan"))).toBe(false);
    expect(error.has(address("search"))).toBe(false);
    expect(mount("error").actionsAt("d1/scan")).toEqual([]);
    expect(addressedElements(render(first, "error")).get(address("feedback"))?.text).toEqual([
      "Ticket not found",
    ]);
  });
});

describe("Door read and act", () => {
  it("dispatches scanner requests and checks in only an available result at its unchanged address", () => {
    const onAction = vi.fn();
    const controller = mount("filled", host, onAction);
    expect(controller.act({ address: "d1/scan", action: "scan" }).ok).toBe(true);
    expect(onAction).toHaveBeenCalledWith({ address: address("scan"), action: "scan" });
    expect(controller.act({ address: "d1/search", action: "type", value: "  BELL " }).ok).toBe(true);
    expect(controller.actionsAt("d1/r8/checkin")).toEqual([]);
    expect(controller.actionsAt("d1/r11/checkin")).toEqual([]);
    expect(controller.press("d1/r4/checkin").ok).toBe(true);
    expect(onAction).toHaveBeenCalledWith({ address: address("r4/checkin"), action: "press" });
    expect(controller.act({ address: "d1/search", action: "type", value: "x".repeat(41) }).ok).toBe(false);
    const live = read(first, "filled", { [address("$type/search")]: "BELL" });
    expect(live).toContain("[d1/r4/checkin press !needs-ok]");
    expect(live).toContain("Sam Bell · Checked in");
    expect(live).not.toContain("Lee Ortiz");
    expect(live).not.toContain("[d1/r11/checkin");
    expect(read(first, "filled", { [address("$type/search")]: "Nothing" })).toContain("No matching guests");
  });
});
