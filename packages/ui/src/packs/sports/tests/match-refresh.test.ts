import { components, type ScreenLike } from "@lmthing/ui/catalog";
import { expect, it } from "vitest";
import { createAgentAccess, createInteractionStore } from "../../../kit/interact";

it("keeps a pending undo on the latest journal goal when older seeds are inserted", () => {
  const opener = { side: "home", minute: 32, kind: "goal", text: "Reed scores" };
  let screen: ScreenLike = {
    id: "match",
    components: [
      { ...components.Scoreboard.examples[0], id: "s1", c: "Scoreboard", homeScore: 1, awayScore: 0 },
      { id: "m1", c: "MatchFeed", events: [opener] },
    ],
  };
  const agent = createAgentAccess({
    defs: components,
    store: createInteractionStore(),
    current: () => screen,
  });
  const confirm = { address: "confirm/confirm", action: "press" };
  expect(agent.act([{ address: "s1/home", action: "increment" }, confirm]).ok).toBe(true);
  expect(agent.act({ address: "s1/home", action: "decrement" }).ok).toBe(true);
  screen = {
    ...screen,
    components: [
      { ...screen.components[0]!, awayScore: 2 },
      {
        ...screen.components[1]!,
        events: [
          opener,
          { side: "away", minute: 20, kind: "goal", text: "Banks scores" },
          { side: "away", minute: 11, kind: "goal", text: "Quinn scores" },
        ],
      },
    ],
  };
  expect(agent.act(confirm).ok).toBe(true);
  const reading = agent.read();
  expect(reading).toContain("Ledge Rovers 1–2 Fern House");
  expect(reading).toContain("32′ Home · Goal: Reed scores");
  expect(reading).not.toContain("0′ Home · Goal");
});
