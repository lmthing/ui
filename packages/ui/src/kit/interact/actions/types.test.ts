import { expect, it } from "vitest";
import { actionFailure, rejected, type ActionState } from "./types";
it("keeps the failure address and input state without effects", () => {
  const state: ActionState = { values: {}, sheet: undefined, confirmation: undefined, changes: [] };
  expect(actionFailure(3, "disabled", "Try later")).toEqual({
    ok: false,
    at: 3,
    code: "disabled",
    hint: "Try later",
  });
  const result = rejected(state, 3, "disabled", "Try later");
  expect(result.state).toBe(state);
  expect(result.effects).toEqual([]);
  expect(result.error).toEqual(actionFailure(3, "disabled", "Try later"));
});
