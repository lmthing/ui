import { describe, expect, it } from "vitest";
import { mediaAction } from "./media";
import { actionFixture } from "./fixtures";
describe("media transitions", () => {
  it("stages seek and repeated bounded skips without changing the input state", () => {
    const action = { address: "c1/scrubber", action: "seek", value: 20 };
    const { ctx, state } = actionFixture("Player", { seconds: 30, at: 5 }, action);
    let result = mediaAction(state, action, ctx);
    expect(state.values).toEqual({});
    expect(result.state.values["test/c1/scrubber"]).toBe(20);
    expect(ctx.seekMedia).not.toHaveBeenCalled();
    result.effects.forEach((effect) => effect());
    expect(ctx.seekMedia).toHaveBeenCalledExactlyOnceWith("c1", 20);
    result = mediaAction(result.state, { address: "c1/forward", action: "press" }, ctx);
    expect(result.state.values["test/c1/scrubber"]).toBe(30);
    result = mediaAction(result.state, { address: "c1/back", action: "press" }, ctx);
    expect(result.state.values["test/c1/scrubber"]).toBe(15);
    expect(mediaAction(result.state, { ...action, value: 31 }, ctx).error).toMatchObject({
      at: 2,
      code: "invalid_value",
    });
  });
  it("clears playback errors on play only and rejects a missing adapter", () => {
    const action = { address: "c1/play", action: "play" };
    const { ctx, state } = actionFixture("Player", { seconds: 30 }, action);
    state.values["test/c1/error"] = "Unavailable";
    const playing = mediaAction(state, action, ctx);
    expect(playing.state.values["test/c1/play"]).toBe(true);
    expect(playing.state.values["test/c1/error"]).toBeUndefined();
    expect(state.values["test/c1/error"]).toBe("Unavailable");
    expect(ctx.playMedia).not.toHaveBeenCalled();
    playing.effects.forEach((effect) => effect());
    expect(ctx.playMedia).toHaveBeenCalledExactlyOnceWith("c1", true);
    const paused = mediaAction(state, { ...action, action: "pause" }, ctx);
    expect(paused.state.values["test/c1/play"]).toBe(false);
    expect(paused.state.values["test/c1/error"]).toBe("Unavailable");
    const unavailable = mediaAction(state, action, { ...ctx, options: { ...ctx.options, media: undefined } });
    expect(unavailable.error).toMatchObject({ code: "media_unavailable" });
    expect(unavailable.effects).toEqual([]);
  });
});
