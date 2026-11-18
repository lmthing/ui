import { describe, expect, it } from "vitest";
import { showConfirmation, confirmationAction } from "./sheet";
import { actionFixture } from "./fixtures";
const press = { address: "c1", action: "press" };
const accept = { address: "confirm/confirm", action: "press" };
describe("confirmation transitions", () => {
  it("stages confirmation and defers its original link and action", () => {
    const { ctx, state, options } = actionFixture(
      "Button",
      { confirm: "Continue?", kind: "danger", goto: "next" },
      press,
    );
    const pending = showConfirmation(state, press, ctx);
    expect(state.confirmation).toBeUndefined();
    expect(pending.effects).toEqual([]);
    expect(pending.state.confirmation).toEqual({
      message: "Continue?",
      kind: "danger",
      source: "test/c1/root",
      goto: "next",
    });
    const accepted = confirmationAction(pending.state, accept, ctx);
    expect(options.onLink).not.toHaveBeenCalled();
    expect(accepted.state.confirmation).toBeUndefined();
    accepted.effects.forEach((effect) => effect());
    expect(options.onLink).toHaveBeenCalledExactlyOnceWith("next", "test/c1/root");
    expect(options.onAction).toHaveBeenCalledExactlyOnceWith({ address: "test/c1/root", action: "press" });
  });
  it("cancels without effects and preserves pending state on invalid input", () => {
    const { ctx, state } = actionFixture("Button", { confirm: "Continue?", kind: "primary" }, press);
    const pending = showConfirmation(state, press, ctx).state;
    const cancelled = confirmationAction(pending, { address: "confirm/cancel", action: "dismiss" }, ctx);
    expect(cancelled.state.confirmation).toBeUndefined();
    expect(cancelled.effects).toEqual([]);
    expect(confirmationAction(pending, { ...accept, value: false }, ctx).error).toMatchObject({
      at: 2,
      code: "invalid_value",
    });
    expect(confirmationAction(pending, { address: "c1", action: "press" }, ctx).error).toMatchObject({
      code: "not_actionable",
    });
    expect(pending.confirmation?.message).toBe("Continue?");
  });
});
describe("confirmed sheet links", () => {
  it.each([0, 1, 2])("requires exactly one sheet, with %i sheets", (count) => {
    const { ctx, state, options } = actionFixture(
      "Button",
      { confirm: "Continue?", kind: "primary", goto: "sheet" },
      press,
    );
    ctx.screen.components.push(...Array.from({ length: count }, (_, id) => ({ id: `s${id}`, c: "Sheet" })));
    const result = confirmationAction(showConfirmation(state, press, ctx).state, accept, ctx);
    expect(Boolean(result.error)).toBe(count !== 1);
    expect(result.state.sheet).toBe(count === 1 ? "s0" : undefined);
    result.effects.forEach((effect) => effect());
    expect(options.onLink).not.toHaveBeenCalled();
  });
});
