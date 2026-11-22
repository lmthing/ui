import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { components, readComponent, type StateName } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const { Offer } = components;
const { examples, fallback } = Offer;
const full: ReturnType<typeof fallback> = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const parts = (input = full, state: StateName = "filled") =>
  addressedElements(renderInstance("Offer", input, state, theme, { component: "o1" }));
const read = (input = full, state: StateName = "filled") =>
  readComponent(Offer, input, "o1", state).join("\n");
const controller = (input = full, options?: Partial<Parameters<typeof createScreenController>[0]>) =>
  createScreenController({
    screen: { id: "home", components: [{ ...input, id: "o1", c: "Offer" }] },
    defs: { Offer },
    ...options,
  });
const actionParts = ["edit", "send", "accept", "decline", "withdraw"] as const;

beforeEach(() => vi.useFakeTimers({ now: new Date(2027, 4, 1, 12) }));
afterEach(() => vi.useRealTimers());

describe("Offer actions", () => {
  it.each([
    ["draft", ["edit", "send"]],
    ["sent", ["accept", "decline", "withdraw"]],
    ["accepted", []],
    ["declined", []],
    ["withdrawn", []],
  ] as const)("offers only the corresponding actions for %s", (status, actions) => {
    const input = { ...full, status };
    const drawn = parts(input),
      reading = read(input),
      current = controller(input);
    try {
      for (const part of actionParts) {
        const on = (actions as readonly string[]).includes(part);
        const step = { address: `o1/${part}`, action: part === "send" ? "send" : "press" };
        expect(drawn.has(`home/${step.address}`)).toBe(on);
        expect(reading.includes(`[${step.address} `)).toBe(on);
        expect(current.act(step, { dryRun: true }).ok).toBe(on);
      }
    } finally {
      current.dispose();
    }
  });
  it("only opens the edit link on edit and only requests delivery on an explicit send", () => {
    const onLink = vi.fn(),
      onAction = vi.fn();
    const current = controller({ ...full, status: "draft" }, { onLink, onAction });
    try {
      expect(onAction).not.toHaveBeenCalled();
      expect(current.read()).toContain("[o1/send send !needs-service]");
      expect(current.press("o1/edit").ok).toBe(true);
      expect(onLink).toHaveBeenCalledExactlyOnceWith("offer_edit", "home/o1/edit");
      expect(current.act({ address: "o1/send", action: "send" }).ok).toBe(true);
      expect(onAction).toHaveBeenLastCalledWith({ address: "home/o1/send", action: "send" });
      expect(onLink).toHaveBeenCalledTimes(1);
    } finally {
      current.dispose();
    }
  });
  it("accepts a sent offer without a deadline and leaves the confirmed status to the host", () => {
    const onAction = vi.fn(),
      onLink = vi.fn();
    const current = controller({ ...full, respondBy: undefined }, { onAction, onLink });
    try {
      expect(current.read()).toContain("[o1/accept press !needs-people]");
      expect(current.press("o1/accept").ok).toBe(true);
      expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: "home/o1/accept", action: "press" });
      expect(onLink).not.toHaveBeenCalled();
      expect(current.snapshotScreen().components[0]?.status).toBe("sent");
    } finally {
      current.dispose();
    }
  });
});

describe("Offer confirmation and expiry", () => {
  it.each(["decline", "withdraw"] as const)("dispatches %s only after confirmation", (part) => {
    const onAction = vi.fn(),
      onLink = vi.fn();
    const current = controller(full, { onAction, onLink });
    try {
      expect(current.press(`o1/${part}`).ok).toBe(true);
      expect(current.confirmation?.source).toBe(`home/o1/${part}`);
      expect(current.press("confirm/cancel").ok).toBe(true);
      expect(onAction).not.toHaveBeenCalled();
      expect(current.press(`o1/${part}`).ok).toBe(true);
      expect(current.press("confirm/confirm").ok).toBe(true);
      expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: `home/o1/${part}`, action: "press" });
      expect(onLink).not.toHaveBeenCalled();
    } finally {
      current.dispose();
    }
  });
  it("expires at local midnight, dropping a pending decline but keeping withdrawal", () => {
    vi.setSystemTime(new Date(2027, 4, 1, 23, 59, 59, 999));
    const onAction = vi.fn(),
      current = controller(full, { onAction });
    try {
      current.mount();
      expect(parts().has("home/o1/accept")).toBe(true);
      expect(current.press("o1/decline").ok).toBe(true);
      vi.advanceTimersByTime(1);
      expect(current.confirmation).toBeUndefined();
      expect(current.press("confirm/confirm").ok).toBe(false);
      expect(onAction).not.toHaveBeenCalled();
      expect(current.read()).toContain("Expired");
      expect(current.read()).not.toContain("[o1/decline ");
      expect(parts().has("home/o1/accept")).toBe(false);
      expect(current.press("o1/accept").ok).toBe(false);
      expect(current.press("o1/withdraw").ok).toBe(true);
    } finally {
      current.dispose();
    }
  });
});
