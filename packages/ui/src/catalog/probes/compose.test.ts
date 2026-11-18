import { describe, expect, it } from "vitest";
import {
  archetypes,
  components,
  createRegistry,
  scoreComposition,
  runComposeProbes,
} from "@lmthing/ui/catalog";
const cast = { things: [], items: [] };
describe("composition scoring", () => {
  it("accepts a valid default and rejects missing slots/invalid component props", () => {
    const meta = archetypes.chat.meta,
      screen = createRegistry().defaultLines("chat", "thread", cast);
    expect(scoreComposition(JSON.stringify(screen), meta, "thread", components).issues).toEqual([]);
    expect(
      scoreComposition(
        JSON.stringify({ ...screen, components: screen.components.slice(0, 2) }),
        meta,
        "thread",
        components,
      ).issues.length,
    ).toBeGreaterThan(0);
    expect(scoreComposition("invalid JSON", meta, "thread", components).issues.length).toBeGreaterThan(0);
  });
  it("scores independent samples by majority and enforces the rubric threshold", async () => {
    const screen = JSON.stringify(createRegistry().defaultLines("chat", "thread", cast));
    const result = await runComposeProbes({
      archetypes: [archetypes.chat.meta],
      defs: components,
      cast,
      samples: 3,
      rubric: true,
      callModel: async (prompt, sample) =>
        prompt.startsWith("Evaluate")
          ? JSON.stringify({ clarity: 5, focus: 4, flow: 4, content: 4, structure: 4 })
          : sample === 2
            ? "bad"
            : screen,
    });
    expect(result[0]).toMatchObject({ status: "pass", score: "2/3" });
    const failed = await runComposeProbes({
      archetypes: [archetypes.chat.meta],
      defs: components,
      cast,
      rubric: true,
      callModel: async (prompt) =>
        prompt.startsWith("Evaluate")
          ? JSON.stringify({ clarity: 5, focus: 4, flow: 2, content: 4, structure: 4 })
          : screen,
    });
    expect(failed[0]?.status).toBe("fail");
  });
});
