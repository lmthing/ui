import { describe, expect, it, vi } from "vitest";
import { motion, signatures, springs } from "../../catalog";
import { animateNumber, easeOut, springStep } from "./animate";
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
  it("bounds arrival to four groups and preserves the shared press tokens", () => {
    expect(Object.keys(signatures)).toHaveLength(11);
    expect(motion.staggerLimit).toBe(4);
    expect(motion.pressScale).toBeLessThan(1);
    expect(signatures.day_unfold).toMatchObject({ component: "Timeline", style: "hours" });
    expect(signatures.record_arrive.component).toBe("HandoffReceipt");
  });
  it("carries velocity into a reversed spring and cancels the obsolete completion", () => {
    let frame: FrameRequestCallback;
    vi.stubGlobal("requestAnimationFrame", (run: FrameRequestCallback) => ((frame = run), 1));
    vi.stubGlobal("cancelAnimationFrame", () => {});
    try {
      let position = 0;
      let velocity = 0;
      const done = vi.fn();
      const stop = animateNumber(0, 8, (value) => (position = value), {
        onVelocity: (value) => (velocity = value),
        done,
      });
      frame!(0);
      frame!(16);
      const prior = position;
      stop();
      const obsolete = frame!;
      animateNumber(position, 0, (value) => (position = value), { velocity });
      expect(position).toBe(prior);
      obsolete(1000);
      expect(done).not.toHaveBeenCalled();
      frame!(17);
      expect(position).toBeGreaterThan(prior);
      for (let time = 33; time < 2000; time += 16) frame!(time);
      expect(position).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("eases timed effects without overshooting or extending their duration", () => {
    let frame: FrameRequestCallback;
    vi.stubGlobal("requestAnimationFrame", (run: FrameRequestCallback) => ((frame = run), 1));
    try {
      const update = vi.fn();
      animateNumber(0, 1, update, { duration: 120, easing: easeOut });
      frame!(0);
      frame!(60);
      expect(update).toHaveBeenLastCalledWith(0.75);
      frame!(120);
      expect(update).toHaveBeenLastCalledWith(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
