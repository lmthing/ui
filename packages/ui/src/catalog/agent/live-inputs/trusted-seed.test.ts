import { expect, it } from "vitest";
import { z } from "zod";
import { defineLocalState, planAct, readScreen, text, type Definition } from "../../index";

const solution = "synthetic-answer";
const schema = z.strictObject({ revision: z.string(), phase: z.enum(["playing", "solved", "failed"]) });
const wire = { board: "board_a", clue: "A public clue" };
const puzzle: Definition = {
  meta: {
    id: "PuzzleFixture",
    group: "input",
    purpose: "Check a puzzle",
    pick: "Check a puzzle",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Local game",
    readSuccess: true,
    errorActions: ["retry.press"],
    successActions: ["reset.press"],
    actions: { parts: { solve: ["type"], reset: ["press"], retry: ["press"] } },
    localState: defineLocalState({
      schema,
      initial: ({ board }) => ({ revision: String(board), phase: "playing" as const }),
      trustedSeed: ({ board }) => (board === "board_a" ? { solution } : undefined),
      events: ["solve.type", "reset.press", "retry.press"],
      reduce: (state, event, seed) => {
        if (event.part !== "solve") return { state: { ...state, phase: "playing" as const } };
        if (event.value === "fixture-error") return { error: seed.solution };
        return {
          state: {
            ...state,
            phase: event.value === seed.solution ? ("solved" as const) : ("failed" as const),
          },
        };
      },
      project: ({ phase }) => ({
        state: phase === "solved" ? "success" : phase === "failed" ? "error" : "filled",
        phase,
      }),
    }),
    read: (input, _state, _lang, _data, _currency, get) => [
      String((input as { phase: string }).phase),
      JSON.stringify(get?.("$localState/PuzzleFixture") ?? null),
    ],
  },
  props: z.strictObject({ board: z.enum(["board_a", "board_b"]), clue: text(20) }),
  fallback: () => wire,
  examples: [],
  probes: [],
};
const defs = { PuzzleFixture: puzzle };
const screen = { id: "home", components: [{ id: "board", c: puzzle.meta.id, ...wire }] };
const guess = (value: string) => ({ address: "board/solve", action: "type", value });
const reset = { address: "board/reset", action: "press" };

it("keeps the solution outside reads, staged values, and diagnostics across game states", () => {
  const before = readScreen(screen, defs);
  expect(before).toContain("playing");
  expect(before).toContain("A public clue");
  expect(before).not.toContain(solution);
  const result = planAct(screen, defs, {}, [guess(solution)]);
  if (!result.ok) throw new Error(result.code);
  expect(JSON.stringify(result)).not.toContain(solution);
  const solved = readScreen(screen, defs, result.values);
  expect(solved).toContain("(success) solved");
  expect(solved).not.toContain(solution);
  const restarted = planAct(screen, defs, result.values, [reset]);
  if (!restarted.ok) throw new Error(restarted.code);
  expect(readScreen(screen, defs, restarted.values)).toContain("playing");
  const failed = planAct(screen, defs, restarted.values, [guess("not-the-answer")]);
  if (!failed.ok) throw new Error(failed.code);
  expect(readScreen(screen, defs, failed.values)).toContain("(error)");
  expect(readScreen(screen, defs, failed.values)).not.toContain(solution);
  expect(JSON.stringify(failed)).not.toContain(solution);
  const retried = planAct(screen, defs, failed.values, [{ address: "board/retry", action: "press" }]);
  if (!retried.ok) throw new Error(retried.code);
  expect(readScreen(screen, defs, retried.values)).toContain("playing");
  expect(planAct(screen, defs, restarted.values, [guess("fixture-error")])).toEqual({
    at: 0,
    code: "invalid_value",
    hint: "Invalid local state",
    ok: false,
  });
  const unavailable = {
    ...screen,
    components: screen.components.map((entry) => ({ ...entry, board: "board_b" })),
  };
  expect(planAct(unavailable, defs, result.values, [guess(solution)])).toMatchObject({
    ok: false,
    hint: "Invalid local state",
  });
});
