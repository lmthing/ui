import { describe, expect, it } from "vitest";
import { navigationAction } from "./navigation";
import { actionFixture } from "./fixtures";
describe("navigation transitions", () => {
  it("dismisses sheets and defers host links before the action callback", () => {
    const action = { address: "c1/close", action: "dismiss" };
    const { ctx, state, options } = actionFixture("Sheet", {}, action);
    state.sheet = "c1";
    ctx.links = [{ goto: "next", address: "test/c1/close" }];
    const result = navigationAction(state, action, ctx);
    expect(result.state.sheet).toBeUndefined();
    expect(state.sheet).toBe("c1");
    expect(options.onLink).not.toHaveBeenCalled();
    result.effects.forEach((effect) => effect());
    expect(options.onLink).toHaveBeenCalledExactlyOnceWith("next", "test/c1/close");
    expect(options.onAction).toHaveBeenCalledExactlyOnceWith({ address: "test/c1/close", action: "dismiss" });
    expect(options.onLink.mock.invocationCallOrder[0]).toBeLessThan(
      options.onAction.mock.invocationCallOrder[0]!,
    );
  });
  it.each([0, 1, 2])("validates sheet links with %i sheets before effects", (count) => {
    const action = { address: "c1", action: "press" };
    const { ctx, state, options } = actionFixture("Button", {}, action);
    ctx.screen.components.push(...Array.from({ length: count }, (_, id) => ({ id: `s${id}`, c: "Sheet" })));
    ctx.links = [{ goto: "sheet", address: "test/c1" }];
    const result = navigationAction(state, action, ctx);
    expect(Boolean(result.error)).toBe(count !== 1);
    expect(result.state.sheet).toBe(count === 1 ? "s0" : undefined);
    expect(options.onLink).not.toHaveBeenCalled();
    expect(options.onAction).not.toHaveBeenCalled();
  });
});
