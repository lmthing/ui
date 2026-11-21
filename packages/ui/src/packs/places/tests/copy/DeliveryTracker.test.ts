import { expect, it } from "vitest";
import { formatAddress } from "@lmthing/ui/catalog";
import { deliveryCopy, deliveryReading } from "../../copy";

const input = { step: "nearby", courier: "Nia" } as const;
const record = { ...input, etaMinutes: 123, position: { x: 0.3, y: 0.4 }, destination: { x: 0.7, y: 0.6 } };
const data = (entry: object = record) => ({ delivery_tracking: [entry] });

it("projects matching service coordinates and formats ETA in the requested locale", () => {
  const display = deliveryCopy(input, "filled", data(), "ar-EG");
  expect(display).toMatchObject({
    eta: "١٢٣ min",
    step: "Nearby",
    pins: [
      { id: "r1", ...record.position, mark: "dot", selected: true },
      { id: "r2", ...record.destination, selected: false },
    ],
  });
  for (const { id } of display.pins)
    expect(formatAddress({ screen: "home", component: "d1", item: id, part: "root" })).toContain(id);
  expect(deliveryReading(input, "filled", data({ ...record, etaMinutes: 0 }))).toEqual([
    "Estimated arrival",
    "Arriving now",
    "Nearby",
    "Courier",
    "Call courier",
  ]);
});

it("does not reuse another courier or step, and discards malformed service fields independently", () => {
  for (const entry of [{ ...record, courier: "Sam" }, { ...record, step: "preparing" }, {}])
    expect(deliveryCopy(input, "filled", data(entry))).toMatchObject({
      pins: [],
      eta: "Estimate unavailable",
    });
  expect(
    deliveryCopy(input, "filled", data({ ...record, position: { x: -1, y: 0 }, etaMinutes: -1 })),
  ).toMatchObject({ pins: [{ id: "r2" }], eta: "Estimate unavailable" });
});

it("keeps only the destination with no ETA or call once delivered", () => {
  expect(deliveryCopy(input, "success", data())).toMatchObject({
    delivered: true,
    eta: undefined,
    step: "Delivered",
    call: undefined,
    pins: [{ id: "r2", selected: true }],
  });
  expect(deliveryReading(input, "success", data())).toEqual(["Delivered", "Courier"]);
  expect(deliveryReading(input, "loading", data())).toEqual([]);
});
