import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { teamWordsFor } from "../../lang";

const def = components.Approval;
const { props, meta, examples, fallback, probes } = def;
const full = examples[0]!;
const row = full.requests[0]!;
const words = teamWordsFor().approval;
const emptyCast: CastLike = { things: [], items: [] };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const view = (input: unknown, state: "filled" | "empty" | "success" = "filled") =>
  addressedElements(renderInstance("Approval", input, state, theme));

describe("Approval schema and boundaries", () => {
  it.each(examples)("accepts a domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("accepts five maximum-length rows and zero amounts, trims copy, and stamps view-only IDs", () => {
    const from = "x".repeat(20);
    const request = {
      ...row,
      from: ` ${from} `,
      title: "x".repeat(32),
      dates: "x".repeat(24),
      note: "x".repeat(100),
      amount: 0,
      photo: "local:1",
    };
    const parsed = props.parse({ requests: Array.from({ length: 5 }, () => request) });
    expect(parsed).toMatchObject({ lead: "avatar" });
    expect(parsed.requests).toEqual(Array.from({ length: 5 }, () => ({ ...request, from, open: true })));
    expect(stampItemIds(meta, parsed).requests).toMatchObject(
      ["r1", "r2", "r3", "r4", "r5"].map((id) => ({ id })),
    );
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["requests"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toBeAny();
  });
  it.each([
    {},
    { requests: [] },
    { requests: Array.from({ length: 6 }, () => row) },
    { ...full, color: "red" },
    { ...full, density: "small" },
    { ...full, lead: "thumb" },
    { ...full, surface: "raised" },
  ])("rejects invalid component input %j", (input) => expect(props.safeParse(input).success).toBe(false));
  it.each([
    { from: " " },
    { from: "x".repeat(21) },
    { title: "" },
    { title: "x".repeat(33) },
    { dates: "x".repeat(25) },
    { note: "x".repeat(101) },
    { photo: undefined },
    { photo: "https://example.org/photo" },
    { kind: "leave" },
    { amount: -1 },
    { amount: "24" },
    { amount: Infinity },
    { id: "r1" },
    { color: "#000000" },
  ])("rejects invalid request input %j", (input) =>
    expect(props.safeParse({ requests: [{ ...row, ...input }] }).success).toBe(false),
  );
});

describe("Approval fallback and metadata", () => {
  it("uses bounded cast copy and neutral placeholders", () => {
    const cast: CastLike = {
      things: [{ type: "person", fields: ["name", "detail"] }],
      items: Array.from({ length: 7 }, (_, index) => ({
        id: `person_${index}`,
        type: "person",
        sample: true,
        name: index ? "a".repeat(30) : "Cameron",
        detail: "Requested Friday",
      })),
    };
    const malformed: CastLike = {
      things: [],
      items: [{ id: "bad", type: "person", sample: true, name: 42 }],
    };
    for (const content of [cast, emptyCast, malformed])
      expect(props.safeParse(fallback({ cast: content })).success).toBe(true);
    expect(fallback({ cast }).requests).toHaveLength(5);
    expect(fallback({ cast }).requests[0]).toMatchObject({
      from: "Cameron",
      title: "Requested Friday",
      kind: "other",
    });
    for (const content of [emptyCast, malformed])
      expect(fallback({ cast: content }).requests).toMatchObject([
        { from: placeholderTitle(0), title: placeholderTitle(1), kind: "other" },
      ]);
  });
  it("retains the people tier, core near miss, write, lead write and decline read", () => {
    expect(meta).toMatchObject({ tier: "people", confirmParts: ["decline"] });
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.realPath).not.toBe("");
    expect(meta.pick).toContain("Checklist");
    expect(probes.slice(0, 5)).toMatchObject([
      { kind: "choose", expect: "Approval" },
      { kind: "choose", expect: "Checklist" },
      { kind: "write", expect: "Approval" },
      { kind: "write", expect: "Approval", variant: { axis: "lead", value: "none" } },
      { kind: "read", expect: { address: "a1/r2/decline", action: "press" } },
    ]);
    expect(createRegistry({ packs: ["team"], includeDrafts: true }).schema("Approval")).toBe(props);
    expect(createRegistry({ packs: ["team"] }).ids.includes("Approval")).toBe(packReady("team"));
  });
});

describe("Approval parts, reading and variants", () => {
  it("addresses the visible details and both buttons for each request", () => {
    const parts = view(full);
    expect(parts.has("home/c1/root")).toBe(true);
    expect(parts.has("home/c1/message")).toBe(false);
    for (const part of meta.items.parts) {
      expect(parts.has(`home/c1/r1/${part}`)).toBe(!["amount", "status"].includes(part));
      expect(parts.has(`home/c1/r2/${part}`)).toBe(!["dates", "status"].includes(part));
    }
    expect(parts.get("home/c1/r1/photo")?.attributes).toContain('aria-label="Anna"');
    expect(parts.get("home/c1/r1/kind")?.text).toEqual([words.kinds.time_off]);
    expect(parts.get("home/c1/r2/amount")?.text).toEqual(["$24"]);
    for (const id of ["r1", "r2"])
      for (const part of ["approve", "decline"])
        expect(parts.get(`home/c1/${id}/${part}`)?.attributes).toContain('role="button"');
    const read = readComponent(def, full, "a1").join("\n");
    expect(read).toContain("Expense · $24");
    expect(read).toContain("Rae can water the ferns.");
    expect(read).toContain("[a1/r1/approve press");
    expect(read).toContain("[a1/r2/decline press");
  });
  it("keeps addresses for finish axes; turning portraits off hides only their parts", () => {
    const addresses = [...view(full).keys()];
    expect([...view({ ...full }).keys()]).toEqual(addresses);
    expect([...view({ ...full }).keys()]).toEqual(addresses);
    const noPortraits = { ...full, lead: "none" };
    expect([...view(noPortraits).keys()]).toEqual(addresses.filter((part) => !part.endsWith("/photo")));
    expect(props.parse(noPortraits).requests.map((item) => item.photo)).toEqual(
      full.requests.map((item) => item.photo),
    );
  });
});

describe("Approval states and dispatch", () => {
  it.each(["empty", "success"] as const)("shows only feedback and offers no stale actions in %s", (state) => {
    const parts = view(full, state);
    expect([...parts.keys()]).toEqual(["home/c1/root", "home/c1/message"]);
    expect(parts.get("home/c1/message")?.text).toEqual([
      state === "success" ? words.success : words.queueEmpty,
    ]);
    expect(readComponent(def, full, "a1", state)).toEqual([`a1 Approval (${state})`]);
    expect(affordancesOf(meta, stampItemIds(meta, props.parse(full)), "a1", {}, state)).toEqual([]);
    const screen = { id: "home", components: [{ ...full, id: "a1", c: "Approval", state }] };
    const onAction = vi.fn();
    const runtime = createScreenController({ screen, defs: components, onAction });
    for (const part of ["approve", "decline"]) expect(runtime.press(`a1/r1/${part}`).ok).toBe(false);
    expect(onAction).not.toHaveBeenCalled();
    expect(runtime.confirmation).toBeUndefined();
    runtime.dispose();
  });
  it("approves directly; declining can be cancelled or confirmed for the original request", () => {
    const screen = { id: "home", components: [{ ...full, id: "a1", c: "Approval" }] };
    const onAction = vi.fn();
    const runtime = createScreenController({ screen, defs: components, onAction });
    expect(runtime.press("a1/r3/approve").ok).toBe(false);
    expect(runtime.press("a1/r1/photo").ok).toBe(false);
    expect(runtime.press("a1/r1/approve").ok).toBe(true);
    expect(runtime.confirmation).toBeUndefined();
    expect(runtime.press("a1/r2/decline").ok).toBe(true);
    expect(runtime.confirmation?.source).toBe("home/a1/r2/decline");
    expect(runtime.act({ address: "confirm/cancel", action: "dismiss" }).ok).toBe(true);
    expect(onAction.mock.calls).toEqual([[{ address: "home/a1/r1/approve", action: "press" }]]);
    expect(runtime.press("a1/r2/decline").ok).toBe(true);
    expect(runtime.press("confirm/confirm").ok).toBe(true);
    expect(runtime.confirmation).toBeUndefined();
    expect(onAction.mock.calls[1]).toEqual([{ address: "home/a1/r2/decline", action: "press" }]);
    expect(onAction).toHaveBeenCalledTimes(2);
    runtime.dispose();
  });
});

it("labels shift claims and leaves requester decisions read-only at their original addresses", () => {
  const own = examples[2]!;
  const parts = view(own);
  expect(parts.get("home/c1/r1/kind")?.text).toEqual(["Shift claim"]);
  expect(parts.get("home/c1/r1/status")?.text).toEqual([words.awaitingDecision]);
  expect(parts.get("home/c1/r2/status")?.text).toEqual(["Approved"]);
  expect(parts.has("home/c1/r1/approve")).toBe(false);
  expect(parts.has("home/c1/r1/decline")).toBe(false);
  const reading = readComponent(def, own, "a1").join("\n");
  expect(reading).toContain(`Shift claim · ${words.awaitingDecision}`);
  expect(reading).not.toContain(" press");
  const runtime = createScreenController({
    screen: { id: "home", components: [{ ...own, id: "a1", c: "Approval" }] },
    defs: components,
  });
  expect(runtime.press("a1/r1/approve").ok).toBe(false);
  expect(runtime.press("a1/r1/decline").ok).toBe(false);
  runtime.dispose();
});

it("shows settled requests without offering a second decision in a mixed manager queue", () => {
  const input = {
    requests: [
      { ...row, kind: "expense", title: "Train fare", status: "approved" },
      { ...row, kind: "expense", title: "Courier fee", status: "declined" },
      { ...row, kind: "expense", title: "Spare keys", status: "pending" },
      { ...row, kind: "expense", title: "Parking" },
    ],
  };
  const parts = view(input);
  const reading = readComponent(def, input, "a1").join("\n");
  const screen = { id: "home", components: [{ ...input, id: "a1", c: "Approval" }] };
  const onAction = vi.fn();
  const runtime = createScreenController({ screen, defs: components, onAction });
  for (const [id, status] of [
    ["r1", words.statuses.approved],
    ["r2", words.statuses.declined],
  ]) {
    expect(parts.get(`home/c1/${id}/status`)?.text).toEqual([status]);
    expect(reading).toContain(`${id} Expense · ${status}`);
    for (const action of ["approve", "decline"]) {
      expect(parts.has(`home/c1/${id}/${action}`)).toBe(false);
      expect(reading).not.toContain(`[a1/${id}/${action} press`);
      expect(runtime.press(`a1/${id}/${action}`).ok).toBe(false);
    }
  }
  expect(runtime.confirmation).toBeUndefined();
  expect(onAction).not.toHaveBeenCalled();
  for (const id of ["r3", "r4"]) {
    expect(parts.has(`home/c1/${id}/approve`)).toBe(true);
    expect(reading).toContain(`[a1/${id}/decline press`);
  }
  expect(runtime.press("a1/r4/approve").ok).toBe(true);
  expect(onAction).toHaveBeenCalledOnce();
  runtime.dispose();
});
