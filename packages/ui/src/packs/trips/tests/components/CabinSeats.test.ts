import { expect, it, vi } from "vitest";
import { components, createRegistry, packReady, placeholderTitle } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";
const { examples, fallback, meta, probes, props } = components.CabinSeats;
const flight = examples[0]!;
const train = examples[1]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const path = "home/c1";

const cast = { things: [], items: [] };
const valid = fallback({ cast });
const first = valid.rows[0]!;
const invalid: unknown[] = [
  { ...valid, unknown: "invalid" },
  { ...valid, color: "red" },
  { ...valid, selectedSeat: "1A" },
  { ...valid, cabin: "x".repeat(25) },
  ...[[], [..."ABCDEFGHIJK"], ["A", "a"], ["", ""], ["ABC", "D"]].map((columns) => ({ ...valid, columns })),
  { ...valid, rows: [] },
  { ...valid, rows: [first, first] },
  { ...valid, rows: Array.from({ length: 21 }, (_, i) => ({ ...first, row: i + 1 })) },
  ...[0, 100, 2.5].map((row) => ({ ...valid, rows: [{ ...first, row }] })),
  { ...valid, rows: [{ ...first, seats: [] }] },
  { ...valid, rows: [{ ...first, seats: [{ col: "", status: "open" }] }] },
  { ...valid, rows: [{ ...first, seats: [{ col: "C", status: "open" }] }] },
  { ...valid, rows: [{ ...first, seats: [{ col: "A", status: "free" }] }] },
  { ...valid, rows: [{ ...first, seats: [{ col: "A", status: "open", fee: -1 }] }] },
  { ...valid, rows: [{ ...first, seats: [first.seats[0], first.seats[0]] }] },
  { ...valid, rows: [{ ...first, seats: first.seats.map((seat) => ({ ...seat, status: "selected" })) }] },
  { ...valid, passenger: "x".repeat(25) },
  { ...valid, detail: "not-a-choice!" },
];

it.each(examples)("accepts a real example", (example) => expect(props.safeParse(example).success).toBe(true));
it.each(invalid)("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));

it("accepts the dense envelope and normalizes lettered columns", () => {
  const columns = [..."ABCDEFGHIJ"];
  const rows = Array.from({ length: 20 }, (_, i) => ({
    row: i + 80,
    seats: columns.map((col) => ({ col: col.toLowerCase(), status: "open", fee: 0 })),
  }));
  expect(props.parse({ ...valid, columns, rows }).rows[19]).toMatchObject({
    row: 99,
    exit: false,
    seats: columns.map((col) => ({ col, status: "open", fee: 0 })),
  });
});

it("validates the fallback for empty and populated casts", () => {
  expect(props.parse(valid).cabin).toBe(placeholderTitle(0));
  const things = [{ type: "item", fields: ["name"] }];
  const items = [{ id: "one", type: "item", name: "Sample", sample: true }];
  for (const name of ["Sample", 42]) {
    expect(
      props.safeParse(fallback({ cast: { things, items: items.map((item) => ({ ...item, name })) } }))
        .success,
    ).toBe(true);
  }
  expect(fallback({ cast: { things, items } }).cabin).toBe("Sample");
});

it("declares dense service metadata, the Choice near miss and the zoom write", () => {
  expect(meta).toMatchObject({ dense: true, weight: 3, tier: "service", confirmParts: ["confirm"] });
  expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Choice" }));
  expect(probes.find((probe) => "variant" in probe)).toMatchObject({
    kind: "write",
    variant: { axis: "detail", value: "brief" },
  });
  expect(probes.find(({ kind }) => kind === "read")).toMatchObject({
    expect: { address: "c1/r12001", action: "select" },
  });
  expect(createRegistry({ packs: ["trips"] }).ids.includes("CabinSeats")).toBe(packReady("trips"));
});

it("renders the full grid, compact window, and all four inactive states", () => {
  const draw = (state: (typeof meta.states)[number], input: unknown = flight) =>
    renderInstance("CabinSeats", input, state, theme);
  const full = draw("filled");
  expect(full).toContain('aria-rowcount="5"');
  expect(full).toContain('aria-label="10A · Occupied"');
  expect(full.match(/aria-selected="true"/g)).toHaveLength(1);
  const brief = addressedElements(draw("filled", { ...flight, detail: "brief" }));
  expect(brief.get(`${path}/preview`)?.text).toEqual(["12C · Selected · Exit row"]);
  expect(brief.get(`${path}/fee_label`)?.text).toEqual(["Upgrade fee"]);
  expect(brief.get(`${path}/fee`)?.text).toEqual(["$35"]);
  expect(brief.has(`${path}/r12001/root`)).toBe(true);
  for (const id of ["r10002", "r14004"]) expect(brief.has(`${path}/${id}/root`)).toBe(false);
  const noSelection = addressedElements(draw("filled", train));
  expect(noSelection.has(`${path}/legend`)).toBe(false);
  expect(noSelection.get(`${path}/confirm`)?.attributes).toContain('aria-disabled="true"');
  expect(draw("empty")).toContain("Seat map unavailable");
  expect(draw("error")).toContain("Seat assignment failed");
  expect(draw("loading")).toContain('aria-busy="true"');
  expect([...addressedElements(draw("loading")).keys()]).toEqual([`${path}/root`]);
  expect(draw("success")).toContain("Seat 12C confirmed");
  expect(draw("success")).not.toContain('role="grid"');
  expect(addressedElements(draw("success")).has(`${path}/confirm`)).toBe(false);
});

it("keeps repeated selections local, recalculating the visible window and price", () => {
  const screen = { id: "home", components: [{ ...flight, detail: "brief", c: meta.id, id: "c1" }] };
  const controller = createScreenController({ screen, defs: components, currency: "GBP", lang: "en-GB" });
  try {
    expect(controller.read()).toContain("12C · Selected · Exit row");
    expect(controller.actionsAt(`${path}/confirm`)).toEqual([]);
    expect(controller.act({ address: `${path}/r10002`, action: "select" }).ok).toBe(false);
    expect(controller.act({ address: `${path}/r12001`, action: "select", value: "12D" }).ok).toBe(false);
    const result = controller.press(`${path}/r12001`);
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(controller.read()).toContain("Upgrade fee: £45");
    expect(controller.read()).toContain("12A · Selected · Extra legroom · Exit row");
    expect(controller.press(`${path}/r11001`).ok).toBe(true);
    expect(controller.read()).toContain("11A · Selected");
    expect(controller.read()).not.toContain("Upgrade fee:");
    expect(controller.actionsAt(`${path}/r10002`)).toEqual(["select"]);
    expect(controller.snapshotScreen()).toEqual(screen);
  } finally {
    controller.dispose();
  }
});

it("keeps seat addresses tied to their coordinates when inventory changes", () => {
  const inventory = structuredClone(flight);
  const screen = { id: "home", components: [{ ...inventory, c: meta.id, id: "c1" }] };
  const controller = createScreenController({ screen, defs: components });
  try {
    expect(controller.press(`${path}/r12001`).ok).toBe(true);
    inventory.rows[2]!.seats[0]!.status = "occupied";
    inventory.rows.reverse();
    expect(controller.actionsAt(`${path}/r12001`)).toEqual([]);
    expect(controller.read()).not.toContain("Upgrade fee:");
    expect(controller.press(`${path}/r12002`).ok).toBe(true);
    expect(controller.read()).toContain("12B · Selected");
  } finally {
    controller.dispose();
  }
});

it("asks for confirmation and refuses to reuse it for a different quote", () => {
  const inventory = structuredClone(flight);
  const screen = { id: "home", components: [{ ...inventory, c: meta.id, id: "c1" }] };
  const run = vi.fn(() => ({ status: "accepted" as const }));
  const controller = createScreenController({
    screen,
    defs: components,
    hostCommands: { commands: { reserve_seat: { allows: () => true, run } } },
  });
  try {
    expect(controller.actionsAt(`${path}/confirm`)).toEqual(["press"]);
    expect(controller.press(`${path}/confirm`).ok).toBe(true);
    expect(run).not.toHaveBeenCalled();
    expect(controller.press(`${path}/r12001`).ok).toBe(false);
    const quote = inventory.rows[2]!.seats[2]!;
    if (!("fee" in quote)) throw new Error("Expected a fixture seat with a fee");
    quote.fee = 95;
    expect(controller.press("home/confirm/confirm").ok).toBe(false);
    expect(run).not.toHaveBeenCalled();
    expect(controller.press("home/confirm/cancel").ok).toBe(true);
    expect(controller.press(`${path}/r12001`).ok).toBe(true);
    expect(controller.press(`${path}/confirm`).ok).toBe(true);
    expect(controller.press("home/confirm/cancel").ok).toBe(true);
    expect(run).not.toHaveBeenCalled();
    expect(controller.press(`${path}/confirm`).ok).toBe(true);
    expect(controller.press("home/confirm/confirm").ok).toBe(true);
    expect(run).toHaveBeenCalledOnce();
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { cabin: "NH 212 Economy", passenger: "Sam", row: 12, column: "A", fee: 45 },
      }),
      expect.objectContaining({ source: "human" }),
    );
  } finally {
    controller.dispose();
  }
});

it("requires a preview even when the booking service is available", async () => {
  const screen = { id: "home", components: [{ ...train, c: meta.id, id: "c1" }] };
  const run = vi.fn(() => ({ status: "rejected" as const }));
  const controller = createScreenController({
    screen,
    defs: components,
    hostCommands: { commands: { reserve_seat: { allows: () => true, run } } },
  });
  try {
    expect(controller.actionsAt(`${path}/confirm`)).toEqual([]);
    expect(controller.press(`${path}/confirm`).ok).toBe(false);
    expect(controller.press(`${path}/r7001`).ok).toBe(true);
    expect(controller.press(`${path}/confirm`).ok).toBe(true);
    expect(controller.press("home/confirm/confirm").ok).toBe(true);
    expect(run).toHaveBeenCalledOnce();
    expect(controller.actionsAt(`${path}/confirm`)).toEqual([]);
    await vi.waitFor(() => expect(controller.read()).toContain("reserve_seat rejected"));
    expect(controller.actionsAt(`${path}/confirm`)).toEqual(["press"]);
  } finally {
    controller.dispose();
  }
});
