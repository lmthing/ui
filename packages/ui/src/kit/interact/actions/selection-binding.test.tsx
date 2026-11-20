import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it, vi } from "vitest";
import { allStep, checkStep, selectionFixture } from "../../../catalog/probes/fixtures";
import { themeName, type BoundSelection, type ThemeChoice } from "../../../catalog";
import { PartScope } from "../../part";
import { KitProvider } from "../../provider";
import { createAgentAccess, createScreenController, useLiveControls } from "../index";
import { config } from "../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;

it("projects check state through the render hook and commits a tap or agent select-all once", () => {
  const { screen, defs } = selectionFixture({ source: "table" });
  const onAction = vi.fn();
  const runtime = createScreenController({ screen, defs, requireMounted: true, onAction });
  const agent = createAgentAccess({ current: () => screen, defs, store: runtime.store, runtime });
  const notifications = vi.fn(() => runtime.store.snapshot());
  runtime.store.subscribe(notifications);
  runtime.registerPart(checkStep.address);
  runtime.registerPart(allStep.address);
  function Selection() {
    const live = useLiveControls(defs.BulkActions.meta, { items: [] });
    const selection = live.$selection as BoundSelection | undefined;
    return <output>{selection?.selected.join(",")}</output>;
  }
  const draw = () =>
    renderToStaticMarkup(
      <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
        <KitProvider controller={runtime} theme={theme}>
          <PartScope screen={screen.id} component="bulk" rev={1} state="filled">
            <Selection />
          </PartScope>
        </KitProvider>
      </TamaguiProvider>,
    );
  expect(runtime.press(checkStep.address).ok).toBe(true);
  expect(draw()).toContain("<output>r2</output>");
  expect(agent.read()).toContain("selected r2 [bulk/all press]");
  notifications.mockClear();
  onAction.mockClear();
  expect(runtime.canPress(allStep.address)).toBe(true);
  expect(runtime.press(allStep.address)).toMatchObject({ ok: true, changed: "bulk/all press" });
  expect(notifications).toHaveBeenCalledTimes(1);
  expect(notifications.mock.results[0]?.value).toMatchObject({
    "home/table/r1/pick": true,
    "home/table/r2/pick": true,
  });
  expect(onAction.mock.calls).toEqual([[allStep]]);
  expect(draw()).toContain("<output>r1,r2</output>");
  expect(agent.read()).toContain("selected r1,r2");
  expect(runtime.canPress(allStep.address)).toBe(false);

  runtime.reset();
  notifications.mockClear();
  onAction.mockClear();
  expect(agent.act(allStep, { dryRun: true })).toMatchObject({ ok: true, changed: "bulk/all press" });
  expect(agent.act([allStep, { ...allStep, address: "missing" }])).toMatchObject({ ok: false, at: 1 });
  expect(notifications).not.toHaveBeenCalled();
  expect(draw()).toContain("<output></output>");
  expect(agent.act(allStep)).toMatchObject({ ok: true, changed: "bulk/all press" });
  expect(agent.log()).toHaveLength(1);
  expect(notifications).toHaveBeenCalledTimes(1);
  expect(onAction.mock.calls).toEqual([[allStep]]);
  expect(draw()).toContain("<output>r1,r2</output>");
  expect(runtime.snapshotScreen()).toEqual(screen);
});
