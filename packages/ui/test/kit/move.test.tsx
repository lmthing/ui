import { expect, it, vi } from "vitest";
import { planAct, readScreen } from "@lmthing/ui/catalog";
import { createScreenController, KitColumns, KitProvider, PartScope } from "@lmthing/ui/kit";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { PhoneScreen } from "../../src/kit/screen";
import { config, elementAt } from "../render";
import { hasColumnTarget } from "./column-target";
import { moveDef, moveDefs, moveScreen, MoveFixture } from "./move";

const address = "home/c1/r1/root";
const move = (value: unknown) => ({ address, action: "move", value });
const press = { address, action: "press" };
const offer = (current: string, choices: string[]) =>
  `[c1/r1 move = ${JSON.stringify(current)}; choices ${JSON.stringify(choices)}]`;

it("plans a move and press at one address without mutating the wire input", () => {
  const result = planAct(moveScreen, moveDefs, {}, [move("Finished"), press]);
  expect(result).toMatchObject({
    ok: true,
    links: [{ goto: "snake_plant", address: "home/c1/r1" }],
  });
  if (!result.ok) throw new Error("Failed to plan a valid move");
  const read = readScreen(moveScreen, moveDefs, result.values);
  expect(read).toContain(offer("Finished", ["Waiting", "In care"]));
  expect(read).toContain('"Finished" 1');
  expect(read).toContain("[c1/r1 press→snake_plant]");
  expect(readScreen(moveScreen, moveDefs)).toContain(offer("Waiting", ["In care", "Finished"]));
});

it.each(["Unknown stage", "finished", "Waiting", 2, undefined])("rejects destination %s", (value) => {
  expect(planAct(moveScreen, moveDefs, {}, [move(value)])).toMatchObject({
    ok: false,
    code: "invalid_value",
  });
});

it("matches a normalized label in planning, drawing and reading", () => {
  const source = moveScreen.components[0]!;
  const screen = {
    ...moveScreen,
    components: [{ ...source, columns: [{ label: "Waiting" }, { label: "  Finished  " }] }],
  };
  const controller = createScreenController({ screen, defs: moveDefs });
  expect(controller.act(move("Finished"))).toMatchObject({ ok: true });
  expect(controller.snapshotScreen().components[0]?.cards).toMatchObject([{ column: 1 }, { column: 1 }]);
  expect(controller.read()).toContain(offer("Finished", ["Waiting"]));
});

it("does not accept moves declared on named component parts", () => {
  const def = {
    ...moveDef,
    meta: { ...moveDef.meta, parts: ["header"], actions: { parts: { header: ["move"] } } } as const,
  };
  expect(
    planAct(moveScreen, { MoveFixture: def }, {}, [{ ...move("Finished"), address: "c1/header" }]),
  ).toMatchObject({ ok: false, code: "not_actionable" });
});

it("rejects cards whose source column does not exist", () => {
  const { id: _id, c: _c, state: _state, ...input } = moveScreen.components[0]!;
  const cards = [{ title: "Snake plant", column: 4, goto: "snake_plant" }];
  expect(moveDef.props.safeParse({ ...input, cards }).success).toBe(false);
});

it("does not target ambiguous labels or offer a move during loading", () => {
  const source = moveScreen.components[0]!;
  const ambiguous = {
    ...moveScreen,
    components: [
      {
        ...source,
        columns: [{ label: "Waiting" }, { label: "In care" }, { label: "In care" }, { label: "Finished" }],
      },
    ],
  };
  expect(readScreen(ambiguous, moveDefs)).toContain(offer("Waiting", ["Finished"]));
  expect(planAct(ambiguous, moveDefs, {}, [move("In care")])).toMatchObject({
    ok: false,
    code: "invalid_value",
  });
  const loading = { ...moveScreen, components: [{ ...source, state: "loading" as const }] };
  expect(planAct(loading, moveDefs, {}, [move("Finished")])).toMatchObject({
    ok: false,
    code: "not_actionable",
  });
});

it("commits moves atomically, supports dry run and preserves the mounted press link", () => {
  const onLink = vi.fn();
  const controller = createScreenController({
    screen: moveScreen,
    defs: moveDefs,
    onLink,
    requireMounted: true,
  });
  controller.registerPart(address);
  expect(controller.actionsAt(address)).toEqual(["press", "move"]);
  expect(controller.act([move("Finished"), move("Bad")])).toMatchObject({ ok: false, at: 1 });
  expect(controller.act(move("Finished"), { dryRun: true })).toMatchObject({ ok: true, dryRun: true });
  expect(controller.snapshotScreen()).toEqual(moveScreen);
  expect(controller.act(move("Finished"))).toMatchObject({ ok: true, changed: 'c1/r1 move = "Finished"' });
  expect(controller.snapshotScreen().components[0]?.cards).toEqual([
    { title: "Snake plant", column: 2, goto: "snake_plant" },
    { title: "Pothos", column: 1, goto: "pothos" },
  ]);
  expect(controller.read()).toContain(offer("Finished", ["Waiting", "In care"]));
  expect(controller.press(address)).toMatchObject({ ok: true });
  expect(onLink).toHaveBeenCalledExactlyOnceWith("snake_plant", "home/c1/r1");
});

it("renders one canonical item address with separate, unaddressed move and press targets", () => {
  const html = renderToStaticMarkup(
    <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
      <PhoneScreen
        screen={moveScreen}
        theme={{ preset: "calm", mode: "light", accent: "moss" }}
        defs={moveDefs}
        renderers={{ MoveFixture }}
      />
    </TamaguiProvider>,
  );
  expect(html.match(/data-testid="home\/c1\/r1\/root"/g)).toHaveLength(1);
  const item = elementAt(html, address);
  expect(hasColumnTarget(item, "move")).toBe(true);
  expect(hasColumnTarget(item, "press")).toBe(true);
});

it("shows display labels and omits ambiguous wire values when opted into stable destinations", () => {
  const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
  const html = renderToStaticMarkup(
    <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
      <KitProvider theme={theme}>
        <PartScope screen="home" component="c1" rev={1} state="filled">
          <KitColumns
            style="stack"
            columns={[
              { id: "a", label: "Waiting", count: "1", moveValue: "queued" },
              { id: "b", label: "In care", count: "0", moveLabel: "care", moveValue: "working" },
              { id: "c", label: "Finished", count: "0", moveValue: "done" },
              { id: "d", label: "Complete", count: "0", moveValue: "done" },
            ]}
            move={{
              caption: "Move to",
              label: (destination, card) => `Move ${card} to ${destination}`,
              cards: [{ id: "r1", column: 0, label: "Snake plant", children: "Snake plant" }],
            }}
          />
        </PartScope>
      </KitProvider>
    </TamaguiProvider>,
  );
  expect(html).toContain(">In care</");
  expect(html).toContain('aria-label="Move Snake plant to care"');
  expect(html).toContain(">care</");
  expect(html).not.toContain('aria-label="Move Snake plant to working"');
  expect(html).not.toContain('aria-label="Move Snake plant to Finished"');
  expect(html).not.toContain('aria-label="Move Snake plant to Complete"');
  expect(html).not.toContain('aria-label="Move Snake plant to Waiting"');
});
