import { describe, expect, it } from "vitest";
import { motion, signatures, springs } from "../../catalog";
import { springStep } from "./animate";
import { countText } from "./use-motion";
import { swipeDirection } from "../interact";
describe("motion and gesture contracts", () => {
  it("settles every shared spring at its target without diverging", () => {
    for (const spring of Object.values(springs)) {
      let position = 0,
        velocity = 0;
      for (let frame = 0; frame < 360; frame++)
        ({ position, velocity } = springStep(position, velocity, 1, 1 / 120, spring));
      expect(position).toBeCloseTo(1, 3);
      expect(Math.abs(velocity)).toBeLessThan(0.02);
    }
  });
  it("preserves final numeric copy and formats intermediate values", () => {
    expect(countText("€1,200.50", 1)).toBe("€1,200.50");
    expect(countText("€1,200.50", 0.5)).toBe("€600.25");
    expect(countText("18%", 0.5)).toBe("9%");
    expect(countText("Not numeric", 0)).toBe("Not numeric");
  });
  it("uses a direction threshold that does not steal a vertical scroll", () => {
    expect(swipeDirection(80, 2, "horizontal")).toBe("right");
    expect(swipeDirection(-80, 2, "horizontal")).toBe("left");
    expect(swipeDirection(10, 80, "horizontal")).toBeUndefined();
    expect(swipeDirection(5, 80, "vertical")).toBe("down");
    expect(swipeDirection(5, -80, "vertical")).toBeUndefined();
  });
  it("exports all ten signatures and bounded arrival/press tokens", () => {
    expect(Object.keys(signatures)).toHaveLength(10);
    expect(motion.staggerLimit).toBe(6);
    expect(motion.pressScale).toBeLessThan(1);
    expect(signatures.day_unfold).toMatchObject({ component: "Timeline", style: "hours" });
  });
});
