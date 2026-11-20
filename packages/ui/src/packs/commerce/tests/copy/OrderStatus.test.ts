import { describe, expect, it } from "vitest";
import { nextOrderStage, orderStatusReading } from "../../copy";

const order = {
  steps: [{ label: "Received", time: "08:45" }, { label: "Preparing", time: "09:00" }, { label: "Ready" }],
  at: 1,
  seller: true,
};

describe("order status copy", () => {
  it("names the current stage, only known times, and the seller's next stage", () => {
    expect(orderStatusReading(order, false)).toEqual([
      "Current stage: Preparing",
      "Received · 08:45",
      "Preparing · 09:00",
      "Mark as Ready",
    ]);
    expect(nextOrderStage(order)).toBe("Ready");
    expect(nextOrderStage({ ...order, seller: false })).toBeUndefined();
    expect(nextOrderStage({ ...order, at: 2 })).toBeUndefined();
  });

  it("localizes clocks and omits the action from the completed reading", () => {
    expect(orderStatusReading(order, true, "ar-EG")).toEqual([
      "Order complete",
      "Received · ٠٨:٤٥",
      "Preparing · ٠٩:٠٠",
    ]);
  });
});
