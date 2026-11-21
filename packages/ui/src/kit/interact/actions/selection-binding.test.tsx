import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it, vi } from "vitest";
import { allStep, checkStep, selectionFixture } from "../../../catalog/probes/fixtures";
import { themeName, type BoundSelection, type Meta, type ThemeChoice } from "../../../catalog";
import { PartScope } from "../../part";
import { KitProvider } from "../../provider";
import { createAgentAccess, createScreenController, useLiveControls, type ScreenController } from "../index";
import { config } from "../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;

function renderSelection(runtime: ScreenController, meta: Meta) {
  function Selection() {
    const live = useLiveControls(meta, { items: [] });
    const selection = live.$selection as BoundSelection | undefined;
    return selection?.selected.length ? <output>{selection.selected.join(",")}</output> : null;
  }
  return renderToStaticMarkup(
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <KitProvider controller={runtime} theme={theme}>
        <PartScope screen="home" component="bulk" rev={1} state="filled">
          <Selection />
        </PartScope>
      </KitProvider>
    </TamaguiProvider>,
  );
}

it("projects check state through the render hook and commits a tap or agent select-all once", () => {
  const { screen, defs } = selectionFixture({ source: "table", requireSelection: true });
  const onAction = vi.fn();
  const runtime = createScreenController({ screen, defs, requireMounted: true, onAction });
  const agent = createAgentAccess({ current: () => screen, defs, store: runtime.store, runtime });
  const notifications = vi.fn(() => runtime.store.snapshot());
  runtime.store.subscribe(notifications);
  runtime.registerPart(checkStep.address);
  runtime.registerPart(allStep.address);
  const draw = () => renderSelection(runtime, defs.BulkActions.meta);
  expect(draw()).not.toContain("<output>");
  expect(agent.read()).not.toMatch(/\[bulk\//);
  expect(runtime.canPress(allStep.address)).toBe(false);
  expect(runtime.press(allStep.address)).toMatchObject({ ok: false, code: "not_actionable" });
  expect(agent.act(allStep)).toMatchObject({ ok: false, code: "not_actionable" });
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
  expect(runtime.press(checkStep.address).ok).toBe(true);
  notifications.mockClear();
  onAction.mockClear();
  expect(agent.act(allStep, { dryRun: true })).toMatchObject({ ok: true, changed: "bulk/all press" });
  expect(agent.act([allStep, { ...allStep, address: "missing" }])).toMatchObject({ ok: false, at: 1 });
  expect(notifications).not.toHaveBeenCalled();
  expect(draw()).toContain("<output>r2</output>");
  expect(agent.act(allStep)).toMatchObject({ ok: true, changed: "bulk/all press" });
  expect(agent.log()).toHaveLength(1);
  expect(notifications).toHaveBeenCalledTimes(1);
  expect(onAction.mock.calls).toEqual([[allStep]]);
  expect(draw()).toContain("<output>r1,r2</output>");
  expect(runtime.snapshotScreen()).toEqual(screen);
});

it("excludes host-disabled row checks from the shared selection and the bulk write", () => {
  const { screen, defs } = selectionFixture();
  const disabled = "home/table/r1/pick";
  const runtime = createScreenController({ screen, defs });
  const registration = runtime.registerDisabledPart(disabled);
  expect(runtime.act({ address: disabled, action: "check" })).toMatchObject({
    ok: false,
    code: "disabled",
  });
  expect(runtime.press(allStep.address)).toMatchObject({ ok: true, changed: "bulk/all press" });
  expect(runtime.store.get(disabled)).toBeUndefined();
  expect(runtime.store.get(checkStep.address)).toBe(true);
  expect(runtime.liveControls(defs.BulkActions.meta, { items: [] }, "bulk").$selection).toEqual({
    source: "table",
    selected: ["r2"],
    canSelectAll: false,
  });
  expect(runtime.read()).not.toContain("[bulk/all press]");
  registration();
  expect(runtime.read()).toContain("[bulk/all press]");
  expect(runtime.act(allStep, { agent: true }).ok).toBe(true);
  expect(runtime.store.get(disabled)).toBe(true);
});

it("revalidates a host-gated select-all confirmation with the same source table", () => {
  const { screen, defs } = selectionFixture();
  const bulk = defs.BulkActions.meta;
  bulk.confirmParts = ["all"];
  bulk.deviceDataFlags = { inWindow: (_data, _props, now) => now < 20 };
  bulk.actions = { ...bulk.actions, when: { "all.press": { inWindow: true } } };
  let now = 10;
  const runtime = createScreenController({ screen, defs, now: () => now });
  expect(runtime.press(allStep.address).ok).toBe(true);
  expect(runtime.read()).toContain("[confirm/confirm press]");
  expect(runtime.store.get(checkStep.address)).toBeUndefined();
  const enableFirst = runtime.registerDisabledPart("home/table/r1/pick");
  const enableSecond = runtime.registerDisabledPart(checkStep.address);
  expect(runtime.read()).not.toContain("[confirm/confirm press]");
  enableFirst();
  enableSecond();
  expect(runtime.read()).toContain("[confirm/confirm press]");
  expect(runtime.press("home/confirm/confirm").ok).toBe(true);
  expect(runtime.store.get(checkStep.address)).toBe(true);
  runtime.reset();
  expect(runtime.press(allStep.address).ok).toBe(true);
  now = 20;
  expect(runtime.read()).not.toContain("[confirm/confirm press]");
  expect(runtime.press("home/confirm/confirm").ok).toBe(false);
  expect(runtime.store.get(checkStep.address)).toBeUndefined();
});
