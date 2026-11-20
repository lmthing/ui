import { expect, it } from "vitest";
import { workOrderCopy, workOrderLine, type WorkLine } from "../../copy";

const part = { id: "r2", kind: "part", name: "Fastener", qty: 2, unitCost: 1.255 } as const;
const lines: WorkLine[] = [
  { id: "r1", kind: "task", text: "Inspect the joint", required: true, done: false },
  part,
];
const order = {
  number: "WO-1",
  request: "R-1",
  title: "Inspect a joint",
  who: "Ari",
  date: "2026-11-20",
  from: "13:00",
  to: "15:00",
  status: "ready",
  detail: "full",
  lines,
  note: "",
  running: false,
  editable: true,
  minutes: 20,
  elapsed: 12,
} as const;

it("adds elapsed seconds to recorded work and computes extended prices", () => {
  expect(workOrderLine(part)).toEqual({ qty: "×2", cost: "$2.51" });
  expect(workOrderCopy(order, "filled")).toMatchObject({
    clock: "20:12",
    total: { label: "Parts total", value: "$2.51" },
  });
});

it("does not present unknown prices as zero; actual zero remains a price", () => {
  const unpriced = { ...part, id: "r3", unitCost: undefined };
  expect(workOrderLine(unpriced).cost).toBeUndefined();
  expect(workOrderCopy({ ...order, lines: [unpriced] }, "filled").total).toBeUndefined();
  expect(workOrderCopy({ ...order, lines: [unpriced, { ...part, unitCost: 0 }] }, "filled").total).toEqual({
    label: "Priced parts total",
    value: "$0",
  });
});

it("passes the language tag through to quantity, date, time and money formats", () => {
  const { window, clock, total } = workOrderCopy(order, "filled", "ar-EG");
  expect(window).toContain("١٣:٠٠–١٥:٠٠");
  expect(window).toContain("٢٠");
  expect(clock).toBe("٢٠:١٢");
  expect(total?.value).toContain("٢٫٥١");
  expect(workOrderLine(part, "ar-EG").qty).toBe("×٢");
});
