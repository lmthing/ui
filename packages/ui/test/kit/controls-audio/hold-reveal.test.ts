import { expect, it, vi } from "vitest";
import { createScreenController } from "@lmthing/ui/kit";
import { defs, revealStep, screen } from "../reveal/fixture";

it("preserves the mounted hold requirement on the local reveal dispatch path", () => {
  const authenticateReveal = vi.fn(async () => "denied" as const);
  const controller = createScreenController({ screen, defs, authenticateReveal, requireMounted: true });
  const unmount = controller.registerPart(revealStep.address);
  const hold = controller.registerHoldPart(revealStep.address);
  try {
    expect(controller.act(revealStep)).toMatchObject({ ok: false, code: "hold_required" });
    expect(authenticateReveal).not.toHaveBeenCalled();
    expect(hold.complete()).toMatchObject({ ok: true });
    expect(authenticateReveal).toHaveBeenCalledExactlyOnceWith({ address: revealStep.address, tier: "ok" });
  } finally {
    hold.unregister();
    unmount();
    controller.dispose();
  }
});
