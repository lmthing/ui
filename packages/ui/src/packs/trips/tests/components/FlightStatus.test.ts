import { expect, it, vi } from "vitest";
import type { z } from "zod";
import { components, readComponent, wordsFor } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const { examples, fallback, meta, probes, props } = components.FlightStatus;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

const cast = { things: [], items: [] };
const valid = fallback({ cast });
const invalid: unknown[] = [
  { ...valid, unknown: "invalid" },
  { ...valid, flight: "x".repeat(11) },
  { ...valid, airline: "x".repeat(25) },
  { ...valid, origin: "x".repeat(5) },
  { ...valid, originCity: "x".repeat(21) },
  { ...valid, destination: "x".repeat(5) },
  { ...valid, destinationCity: "x".repeat(21) },
  { ...valid, status: "not-a-choice!" },
  { ...valid, progress: -0.5 },
  { ...valid, progress: 1.5 },
  { ...valid, terminal: "x".repeat(9) },
  { ...valid, gate: "x".repeat(9) },
  { ...valid, baggage: "x".repeat(13) },
  { ...valid, inboundFlight: "x".repeat(11) },
  { ...valid, inboundGoto: "missing_flight" },
  { ...valid, scheduledDep: "24:00" },
  { ...valid, detail: "not-a-choice!" },
];

it.each(examples)("accepts a real flight example", (example) => {
  expect(props.safeParse(example).success).toBe(true);
});

it.each(invalid)("rejects invalid input", (input) => {
  expect(props.safeParse(input).success).toBe(false);
});

it("validates the fallback for empty and populated casts", () => {
  expect(props.safeParse(fallback({ cast })).success).toBe(true);
  expect(valid.origin).toBe(wordsFor().placeholderValue);
  const things = [{ type: "item", fields: ["name"] }];
  const items = [{ id: "one", type: "item", name: "Sample", sample: true }];
  for (const name of ["Sample", 42]) {
    expect(
      props.safeParse(fallback({ cast: { things, items: items.map((item) => ({ ...item, name })) } }))
        .success,
    ).toBe(true);
  }
});

it("declares service tier, core near miss, and an addressed inbound probe", () => {
  expect(meta.tier).toBe("service");
  expect(probes.map(({ kind }) => kind)).toEqual(["choose", "choose", "choose", "write", "write", "read"]);
  expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "KeyValue" }));
});

it("renders its full and brief parts and uses inert loading and a specific error", () => {
  const full = examples[0]!;
  const keys = (input: z.input<typeof props>) => [
    ...addressedElements(renderInstance("FlightStatus", input, "filled", theme)).keys(),
  ];
  const extra = [
    "route",
    "origin_city",
    "destination_city",
    "arrival",
    "estimated_arrival",
    "baggage",
    "terminal",
  ].map((part) => `home/c1/${part}`);
  expect(keys(full)).toEqual(expect.arrayContaining(extra));
  const condensed = keys({ ...full, detail: "brief" });
  for (const part of extra) expect(condensed).not.toContain(part);
  expect(condensed).toContain("home/c1/gate");
  expect(renderInstance("FlightStatus", full, "loading", theme)).toContain('aria-busy="true"');
  const error = renderInstance("FlightStatus", full, "error", theme);
  expect(error).toContain("Flight updates unavailable");
  expect(error).not.toContain("NH 211");
});

it("refreshes the validated flight through the service host, including on error", () => {
  const run = vi.fn(() => ({ status: "accepted" as const }));
  const screen = {
    id: "home",
    components: [{ ...examples[0]!, c: "FlightStatus", id: "f1", state: "error" as const }],
  };
  const controller = createScreenController({
    screen,
    defs: components,
    hostCommands: { commands: { refresh_flight: { allows: () => true, run } } },
  });
  try {
    expect(controller.actionsAt("home/f1/refresh")).toEqual(["press"]);
    expect(controller.act({ address: "home/f1/refresh", action: "press" }).ok).toBe(true);
    expect(run).toHaveBeenCalledOnce();
    expect(run.mock.calls[0]).toEqual(
      expect.arrayContaining([expect.objectContaining({ input: { flight: "NH 212" } })]),
    );
  } finally {
    controller.dispose();
  }
});

it("links only a linked, filled inbound flight and never offers refresh without a host", () => {
  const example = examples[0]!;
  for (const [state, goto] of [
    ["filled", example.inboundGoto],
    ["filled", undefined],
    ["error", example.inboundGoto],
  ] as const) {
    const input = { ...example, inboundGoto: goto };
    const screen = { id: "home", components: [{ ...input, c: "FlightStatus", id: "f1", state }] };
    const controller = createScreenController({ screen, defs: components });
    try {
      const address = "home/f1/inbound";
      const linked = state === "filled" && !!goto;
      expect(
        readComponent(components.FlightStatus, input, "f1", state)
          .join("\n")
          .includes("press→inbound_flight"),
      ).toBe(linked);
      expect(controller.actionsAt(address)).toEqual(linked ? ["press"] : []);
      expect(controller.actionsAt("home/f1/refresh")).toEqual([]);
      expect(controller.act({ address, action: "press" }).ok).toBe(linked);
    } finally {
      controller.dispose();
    }
  }
});
