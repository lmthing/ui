import { describe, expect, it } from "vitest";
import { controlsAction } from "./controls";
import { actionFixture } from "./fixtures";
describe("control action effects", () => {
  it("stages exact replies and clips only the displayed message", () => {
    const action = { address: "c1/send", action: "send" };
    const text = " " + "a".repeat(130) + "\n";
    const { ctx, state, options } = actionFixture("Composer", { max: 600, value: text }, action);
    ctx.active.components.push({ id: "b1", c: "Bubbles", messages: [{ from: "them", text: "Hello" }] });
    const result = controlsAction(state, action, ctx);
    expect(state.values).toEqual({});
    expect(result.state.values["test/c1/field"]).toBe("");
    expect(result.state.values["test/b1/$messages"]).toEqual([
      { from: "them", text: "Hello" },
      { from: "me", text: "a".repeat(119) },
    ]);
    expect(options.onSend).not.toHaveBeenCalled();
    result.effects.forEach((effect) => effect());
    expect(options.onSend).toHaveBeenCalledExactlyOnceWith(text, "test/c1/field");
  });
  it("defers photo requests and clears stale drafts only in staged values", () => {
    const action = { address: "c1/field", action: "press" };
    const { ctx, state } = actionFixture("Field", { kind: "photo" }, action);
    const photo = controlsAction(state, action, ctx);
    expect(ctx.requestPhoto).not.toHaveBeenCalled();
    photo.effects.forEach((effect) => effect());
    expect(ctx.requestPhoto).toHaveBeenCalledExactlyOnceWith("c1", "test/c1/field");
    const typed = { address: "c1/field", action: "type", value: "New" };
    const field = actionFixture("Field", { label: "Text" }, typed);
    field.state.values = { "test/c1/field/$draft": "Old", "test/c1/field/$error": "Invalid" };
    const result = controlsAction(field.state, typed, field.ctx);
    expect(result.state.values["test/c1/field/$draft"]).toBeUndefined();
    expect(result.state.values["test/c1/field/$error"]).toBeUndefined();
    expect(field.state.values["test/c1/field/$draft"]).toBe("Old");
  });
});
