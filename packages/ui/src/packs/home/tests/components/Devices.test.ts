import { describe, expect, it } from "vitest";
import { components, readComponent } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";

const { props, meta, examples, fallback, probes } = components.Devices;
const focused = examples[0]!;

describe("Devices contract and fallback", () => {
  it.each(examples)("accepts a real example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it("retains service tier, confirmation, and the Field slider near miss", () => {
    expect(meta).toMatchObject({ tier: "service", dense: true, confirmParts: ["lock", "secure"] });
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Field" }));
  });

  it("builds valid fallback props from cast titles or neutral placeholders", () => {
    const items = [{ id: "lamp", type: "light", sample: true, title: "   Lamp   " }];
    const from = (sample: typeof items) => fallback({ cast: { things: [], items: sample } });
    expect(props.parse(from(items)).rooms[0]?.devices[0]?.name).toBe("Lamp");
    expect(props.parse(from([])).rooms[0]?.devices[0]?.name).toBe("Item one");
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
    for (let i = 0; i < 18; i++) expect(runtime.act(plus).ok).toBe(true);
    expect(runtime.act(plus)).toMatchObject({ ok: false, code: "not_actionable" });
    expect(
      readComponent(components.Devices, focused, "d1", "filled", {
        "d1/$runtime": true,
        "d1/r1/$adjust/temp": 30,
      }).join("\n"),
    ).toContain("Set point 30 °C");
    expect(runtime.act({ address: "d1/r2/plus", action: "increment" })).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
    runtime.dispose();
  });
});
