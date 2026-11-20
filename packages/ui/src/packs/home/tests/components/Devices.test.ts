import { describe, expect, it, vi } from "vitest";
import { affordancesOf, components, readComponent, stampItemIds } from "@lmthing/ui/catalog";
import { createScreenController, renderers } from "@lmthing/ui/kit";
import { elementAt, renderInstance } from "../../../../../test/render";

const { props, meta, examples, fallback, probes } = components.Devices;
const focused = examples[0]!;
const tiles = examples[1]!;
const theme = { preset: "calm", accent: "moss", mode: "light" } as const;
const room = (devices: unknown[]) => ({ rooms: [{ label: "Hall", devices }] });

describe("Devices contract and fallback", () => {
  it.each(examples)("accepts a real example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it("retains service tier, confirmation, and the Field slider near miss", () => {
    expect(meta).toMatchObject({ tier: "service", dense: true, confirmParts: ["lock", "secure"] });
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Field" }));
  });

  it.each([
    { rooms: [] },
    room([]),
    room(Array(7).fill({ key: "lamp", name: "Lamp", kind: "light", on: false })),
    room([{ key: "heat", kind: "heat", name: "x".repeat(17), on: true, temp: 21 }]),
    room([{ key: "heat", kind: "heat", name: "Heat", on: true, temp: 30.1 }]),
    room([{ key: "sensor", kind: "sensor", name: "Humidity", reading: 45 }]),
    { ...focused, entries: [] },
    { ...focused, color: "red" },
  ])("rejects out-of-range, unknown or code-owned input", (input) => {
    expect(props.safeParse(input).success).toBe(false);
  });

  it("builds valid fallback props from cast titles or neutral placeholders", () => {
    const items = [{ id: "lamp", type: "light", sample: true, title: "   Lamp   " }];
    const from = (sample: typeof items) => fallback({ cast: { things: [], items: sample } });
    expect(props.parse(from(items)).rooms[0]?.devices[0]?.name).toBe("Lamp");
    expect(props.parse(from([])).rooms[0]?.devices[0]?.name).toBe("Item one");
    expect(props.parse(from([{ ...items[0]!, title: " " }])).rooms[0]?.devices[0]?.name).toBe("Item one");
  });
});

describe("Devices states and parts", () => {
  const renderTest = it.skipIf(!Object.hasOwn(renderers, "Devices"));
  renderTest.each(examples)("draws each offered action once with its validator-owned address", (example) => {
    const html = renderInstance("Devices", example, "filled", theme, { component: "d1" });
    const propsWithIds = stampItemIds(meta, props.parse(example));
    for (const { address } of affordancesOf(meta, propsWithIds, "d1")) {
      const full = `home/${address}${address.split("/").length === 2 ? "/root" : ""}`;
      expect(html.split(`data-testid="${full}"`)).toHaveLength(2);
    }
    expect(elementAt(html, "home/d1/r2/name")).toBeDefined();
  });

  renderTest("shows one heading for a room grid rather than repeating it on every device", () => {
    const html = renderInstance("Devices", tiles, "filled", theme, { component: "d1" });
    expect(html.match(/>Hall</g)).toHaveLength(1);
    expect(elementAt(html, "home/d1/r1/room")).toBeDefined();
    expect(html).toMatch(/>Hall<[\s\S]*?role="list"[\s\S]*?role="listitem"[\s\S]*?>Hall light</);
  });

  renderTest("keeps focused room devices together before scenes and puts scenes first in tiles", () => {
    const input = { ...focused, rooms: [...tiles.rooms, ...focused.rooms] };
    const focusedHtml = renderInstance("Devices", input, "filled", theme);
    const tilesHtml = renderInstance("Devices", tiles, "filled", theme);
    expect(focusedHtml).toMatch(
      />Thermostat<[\s\S]*>Humidity<[\s\S]*>Plant lamp<[\s\S]*>Hall<[\s\S]*>Saved scenes</,
    );
    expect(tilesHtml).toMatch(/>Saved scenes<[\s\S]*>Hall<[\s\S]*>Hall light</);
  });

  renderTest("draws intentional empty, inert loading, success and readable offline states", () => {
    expect(renderInstance("Devices", focused, "empty", theme, "device")).toContain("No devices yet");
    expect(renderInstance("Devices", focused, "loading", theme)).not.toContain('role="slider"');
    expect(renderInstance("Devices", focused, "success", theme)).toContain("Command acknowledged");
    const error = renderInstance("Devices", focused, "error", theme);
    expect(error).toContain("Devices unavailable or command failed");
    expect(error).toContain("Reading · °C");
    expect(error).toContain("20.5");
    expect(elementAt(error, "home/c1/r1/temp").attributes).toContain('aria-disabled="true"');
  });

  it("offers no level for a switch with no level reading, or commands for an unlinked sensor", () => {
    const input = room([
      { key: "lamp", name: "Lamp", kind: "light", on: false },
      { key: "air", name: "Air", kind: "sensor", reading: 28, unit: "ppm" },
    ]);
    expect(affordancesOf(meta, stampItemIds(meta, props.parse(input)), "d1")).toEqual([
      { address: "d1/r1", part: "root", action: "toggle", detail: ":off" },
    ]);
  });
});

describe("Devices read and act", () => {
  it("quotes the focused device name instead of showing its key", () => {
    const input = {
      ...focused,
      rooms: [
        {
          label: "Hall",
          devices: [{ key: "device_a", name: "Thermostat", kind: "heat", on: true, temp: 21 }],
        },
      ],
      scenes: [],
      focus: "device_a",
    };
    expect(props.parse({ ...input, focus: " device_a " }).focus).toBe("device_a");
    expect(props.safeParse({ ...input, focus: "other" }).success).toBe(false);
    const reading = readComponent(components.Devices, input, "d1").join("\n");
    expect(reading).toContain('Focused device: "Thermostat"');
    expect(reading).not.toContain("device_a");
    expect(readComponent(components.Devices, { ...input, focus: undefined }, "d1")[0]).toContain(
      'Focused device: "Thermostat"',
    );
  });

  it("adjusts the thermostat in bounded half-degree steps and reads the projected value", () => {
    const screen = {
      id: "home",
      components: [{ id: "d1", c: "Devices", ...focused }],
    };
    const runtime = createScreenController({ screen, defs: components });
    const plus = { address: "d1/r1/plus", action: "increment" };
    const minus = { address: "d1/r1/minus", action: "decrement" };
    expect(runtime.act(plus)).toMatchObject({ ok: true, changed: "d1/r1/plus increment = 21.5" });
    expect(runtime.act(minus)).toMatchObject({ ok: true, changed: "d1/r1/minus decrement = 21" });
    const set = (value: number) => runtime.act({ address: "d1/r1/temp", action: "set", value });
    expect(set(29.5).ok).toBe(true);
    expect(runtime.act(plus)).toMatchObject({ ok: true, changed: "d1/r1/plus increment = 30" });
    expect(runtime.act(plus)).toMatchObject({ ok: false, code: "not_actionable" });
    expect(runtime.read()).toContain("Set point 30 °C");
    expect(runtime.read()).toContain("Reading 20.5 °C");
    expect(set(30.1).ok).toBe(false);
    expect(set(5.5).ok).toBe(true);
    expect(runtime.act(minus)).toMatchObject({ ok: true, changed: "d1/r1/minus decrement = 5" });
    expect(runtime.act(minus)).toMatchObject({ ok: false, code: "not_actionable" });
    expect(set(4.9).ok).toBe(false);
    expect(runtime.read()).toContain("Set point 5 °C");
    expect(runtime.act({ address: "d1/r2/plus", action: "increment" })).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
    runtime.dispose();
  });
});

describe("Devices safety confirmations", () => {
  it("reads the actual Review button as a press that opens confirmation", () => {
    const read = readComponent(components.Devices, tiles, "d1").join("\n");
    expect(read).toContain('Press "Review" to open confirmation for this scene');
    expect(read).toContain("[d1/r8/secure press");
  });

  it.each([
    { address: "d1/r2/lock", action: "toggle" },
    { address: "d1/r8/secure", action: "press" },
  ])("confirms $address before the host sees it and supports cancellation", (step) => {
    const onAction = vi.fn();
    const screen = { id: "home", components: [{ id: "d1", c: "Devices", ...tiles }] };
    const runtime = createScreenController({ screen, defs: components, onAction });
    expect(runtime.act(step).ok).toBe(true);
    expect(runtime.confirmation).toBeDefined();
    expect(onAction).not.toHaveBeenCalled();
    expect(runtime.act({ address: "confirm/cancel", action: "dismiss" }).ok).toBe(true);
    expect(onAction).not.toHaveBeenCalled();
    expect(runtime.act(step).ok).toBe(true);
    expect(runtime.act({ address: "confirm/confirm", action: "press" }).ok).toBe(true);
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ ...step, address: `home/${step.address}` });
    expect(runtime.confirmation).toBeUndefined();
    runtime.dispose();
  });

  it("dispatches an ordinary scene without opening confirmation", () => {
    const onAction = vi.fn();
    const screen = { id: "home", components: [{ id: "d1", c: "Devices", ...tiles }] };
    const runtime = createScreenController({ screen, defs: components, onAction });
    expect(runtime.act({ address: "d1/r7/apply", action: "press" }).ok).toBe(true);
    expect(runtime.confirmation).toBeUndefined();
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: "home/d1/r7/apply", action: "press" });
    runtime.dispose();
  });
});
