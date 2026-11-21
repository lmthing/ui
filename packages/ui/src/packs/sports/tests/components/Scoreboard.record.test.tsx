import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it } from "vitest";
import { components, themeName } from "@lmthing/ui/catalog";
import { createScreenController, KitProvider, renderers, Screen } from "@lmthing/ui/kit";
import { addressedElements, config } from "../../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const confirm = { address: "confirm/confirm", action: "press" };
const cancel = { address: "confirm/cancel", action: "dismiss" };
const board = components.Scoreboard.examples[0];

function renderMatch(controller: ReturnType<typeof createScreenController>) {
  return addressedElements(
    renderToStaticMarkup(
      <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
        <KitProvider theme={theme} controller={controller}>
          <Screen controller={controller} renderers={renderers} />
        </KitProvider>
      </TamaguiProvider>,
    ),
  );
}

it.each(["home", "away"] as const)(
  "renders confirmed %s goals in both components and leaves them unchanged after cancel",
  (side) => {
    const runtime = createScreenController({
      defs: components,
      screen: {
        id: "match",
        components: [
          { ...board, c: "Scoreboard", id: "s1", homeScore: 0, awayScore: 0 },
          {
            c: "MatchFeed",
            id: "m1",
            state: "empty",
            events: [{ kind: "note", minute: 0, side, text: "Kickoff" }],
          },
        ],
      },
    });
    const render = () => renderMatch(runtime);
    const score = `match/s1/${side}_score`;
    const goal = "match/m1/r17/text";
    const empty = "match/m1/empty";
    const increment = { address: `s1/${side}`, action: "increment" };
    const decrement = { address: `s1/${side}`, action: "decrement" };
    try {
      const initial = render();
      expect(initial.get(score)?.text).toEqual(["0"]);
      expect(initial.has(empty)).toBe(true);
      expect(runtime.act(increment).ok).toBe(true);
      const pending = render();
      expect(pending.has("match/confirm/confirm")).toBe(true);
      expect(pending.has(goal)).toBe(false);
      expect(runtime.act(cancel).ok).toBe(true);
      expect(runtime.read()).toContain("Ledge Rovers 0–0 Fern House");
      expect(runtime.act([increment, confirm]).ok).toBe(true);
      const added = render();
      expect(added.get(score)?.text).toEqual(["1"]);
      expect(added.get(goal)?.text).toEqual(["Goal"]);
      expect(added.has(empty)).toBe(false);
      expect(runtime.read()).toContain(
        side === "home" ? "Ledge Rovers 1–0 Fern House" : "Ledge Rovers 0–1 Fern House",
      );
      const afterAdd = runtime.read();
      expect(runtime.act(decrement).ok).toBe(true);
      expect(runtime.act(cancel).ok).toBe(true);
      expect(runtime.read()).toBe(afterAdd);
      expect(runtime.act([decrement, confirm]).ok).toBe(true);
      const undone = render();
      expect(undone.get(score)?.text).toEqual(["0"]);
      expect(undone.has(goal)).toBe(false);
      expect(undone.has(empty)).toBe(true);
    } finally {
      runtime.dispose();
    }
  },
);
