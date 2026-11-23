import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it, vi } from "vitest";
import { z } from "zod";
import {
  components,
  readComponent,
  themeName,
  type Definition,
  type DeviceData,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import {
  createAgentAccess,
  createScreenController,
  KitAction,
  KitProvider,
  KitText,
  PartScope,
  useDeviceData,
  useKit,
  type ScreenController,
} from "@lmthing/ui/kit";
import { createPreviewController, previewComponent } from "../../../../../apps/gallery/app/draw";
import { config } from "../../../test/render";
import { exampleDeviceData } from "../../catalog/probes/fixtures";
import { PhoneScreen } from "./PhoneScreen";

const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;

it("applies quantity edits to the correct host row after reordering", () => {
  const { Things } = components;
  const items = [
    { id: "r3", name: "Second", qty: 5, goto: "second" },
    { id: "r7", name: "First", qty: 2, goto: "first" },
  ];
  const controller = createScreenController({
    defs: { Things },
    screen: { id: "home", components: [{ id: "t1", c: "Things", items }] },
  });
  try {
    expect(controller.act({ address: "t1/r7/qty", action: "increment" })).toMatchObject({ ok: true });
    expect(controller.snapshotScreen().components[0]?.items).toEqual([items[0], { ...items[1], qty: 3 }]);
  } finally {
    controller.dispose();
  }
});

it("revalidates and moves only the addressed host card after reordering", () => {
  const { Board } = components;
  const { columns, cards } = Board.examples[0]!;
  const rows = [
    { ...cards[1]!, id: "r4" },
    { ...cards[0]!, id: "r7" },
  ];
  const controller = createScreenController({
    defs: { Board },
    screen: { id: "home", components: [{ id: "b1", c: "Board", columns, cards: rows }] },
  });
  try {
    expect(controller.act({ address: "b1/r7", action: "move", value: "Recovered" })).toMatchObject({
      ok: true,
    });
    expect(controller.snapshotScreen().components[0]?.cards).toEqual([rows[0], { ...rows[1], column: 2 }]);
  } finally {
    controller.dispose();
  }
});

it("projects clock state only onto the timer that owns the host id", () => {
  const { KitchenTimers } = components;
  const timers = [
    { label: "First", seconds: 40 },
    { id: "r1", label: "Second", seconds: 60 },
  ];
  const controller = createScreenController({
    defs: { KitchenTimers },
    screen: { id: "home", components: [{ id: "k1", c: "KitchenTimers", timers }] },
    now: () => 5000,
  });
  try {
    expect(controller.act({ address: "k1/r1", action: "start" })).toMatchObject({ ok: true });
    expect(controller.snapshotScreen().components[0]?.timers).toEqual([
      { ...timers[0], remaining: 40, running: false },
      { ...timers[1], remaining: 60, running: true },
    ]);
  } finally {
    controller.dispose();
  }
});

const records = [{ value: 7 }];
const previewDeviceData = vi.fn<NonNullable<Definition["meta"]["previewDeviceData"]>>(({ input, state }) => ({
  readings: state === "filled" ? [{ value: input.value }] : [],
  unrelated: [{}],
}));
const viewData = vi.fn<(data: DeviceData) => void>();
const readData = vi.fn<(data: DeviceData | undefined) => void>();
const viewController = vi.fn<(controller: ScreenController | undefined) => void>();
const defs = {
  DeviceFixture: {
    ...components.Header,
    meta: {
      ...components.Header.meta,
      id: "DeviceFixture",
      deviceData: ["readings"],
      previewDeviceData,
      read: (_props, _state, _lang, data) => {
        readData(data);
        return [summary(data)];
      },
    },
    props: z.strictObject({ value: z.number() }),
  } satisfies Definition,
};
const input = { value: 2 };
const screen = { id: "home", components: [{ id: "f1", c: "DeviceFixture", ...input }] };

function summary(data: DeviceData | undefined) {
  const row = data?.readings?.[0] as { value: number } | undefined;
  return `Record: ${row?.value ?? "none"}`;
}

function Fixture() {
  const data = useDeviceData();
  viewData(data);
  viewController(useKit().controller);
  return <KitText>{summary(data)}</KitText>;
}

it("gives PhoneScreen views and the controller reader the same host records and no fixture data", () => {
  const deviceData = { readings: records, unrelated: [{ value: 123 }] };
  const html = renderToStaticMarkup(
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <PhoneScreen
        screen={screen}
        defs={defs}
        renderers={{ DeviceFixture: Fixture }}
        theme={theme}
        deviceData={deviceData}
      />
    </TamaguiProvider>,
  );
  const controller = viewController.mock.lastCall![0]!;
  const agent = createAgentAccess({
    current: () => screen,
    store: controller.store,
    defs,
    runtime: controller,
  });
  controller.store.set("home/f1/$deviceData", { readings: [{ value: 0 }] });
  expect(html).toContain("Record: 7");
  expect(agent.read()).toContain("Record: 7");
  expect(viewData).toHaveBeenLastCalledWith({ readings: records });
  expect(readData.mock.lastCall?.[0]?.readings).toBe(viewData.mock.lastCall?.[0].readings);
  expect(controller.deviceDataFor("f1").readings).toBe(records);
  expect(controller.deviceDataFor("absent")).toEqual({});
  expect(controller.snapshotScreen()).toEqual(screen);
  expect(previewDeviceData).not.toHaveBeenCalled();
  const standalone = createAgentAccess({ current: () => screen, store: controller.store, defs, deviceData });
  expect(standalone.read()).toContain("Record: 7");
  controller.reset();
  expect(controller.store.snapshot()).toEqual({});
  expect(agent.read()).toContain("Record: 7");
  controller.dispose();
});

it("uses deterministic, state-specific out-of-band fixtures for the shared gallery and look controller", () => {
  const def = defs.DeviceFixture;
  const filled = createPreviewController(def, input, "frame_a", { state: "filled" })!;
  const repeat = createPreviewController(def, input, "frame_b", { state: "filled" })!;
  const empty = createPreviewController(def, input, "frame_c", { state: "empty" })!;
  expect(filled.deviceDataFor(previewComponent)).toEqual({ readings: [{ value: 2 }] });
  expect(repeat.deviceDataFor(previewComponent)).toEqual(filled.deviceDataFor(previewComponent));
  expect(empty.deviceDataFor(previewComponent)).toEqual({ readings: [] });
  expect(filled.snapshotScreen().components).toEqual([
    { id: previewComponent, c: def.meta.id, state: "filled", ...input },
  ]);
  expect(filled.store.snapshot()).toEqual({});
  expect(filled.read()).toContain("Record: 2");

  const html = renderToStaticMarkup(
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <KitProvider theme={theme} controller={filled}>
        <PartScope screen="frame_a" component={previewComponent} rev={1} state="filled">
          <Fixture />
        </PartScope>
      </KitProvider>
    </TamaguiProvider>,
  );
  expect(html).toContain("Record: 2");
});

it.each(["filled", "empty"] as const)(
  "uses the same host gate in %s preview, read and phone actions",
  (state) => {
    const id = "Fixture";
    const def: Definition = {
      ...defs.DeviceFixture,
      meta: {
        ...defs.DeviceFixture.meta,
        id,
        deviceDataVisible: (data) => Boolean(data.readings?.length),
        actions: { parts: { root: ["press"] } },
      },
      props: z.strictObject({ value: z.number(), goto: z.string() }),
    };
    const raw = { ...input, goto: "detail" };
    const deviceData = exampleDeviceData(def.meta, raw, state);
    const preview = createPreviewController(def, raw, "frame_gate", { state })!;
    expect(preview.deviceData).toEqual(deviceData);
    const action = { address: "f1", action: "press" };
    const scoped = { [id]: def };
    // Keep the wire state filled: only the host records change across the two cases.
    const screen = { id: "home", components: [{ ...raw, c: id, id: action.address }] };
    const View = vi.fn(() => <KitAction label="Open" part="root" />);
    const html = renderToStaticMarkup(
      <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
        <PhoneScreen
          screen={screen}
          defs={scoped}
          renderers={{ [id]: View }}
          theme={theme}
          deviceData={deviceData}
        />
      </TamaguiProvider>,
    );
    const controller = createScreenController({ screen, defs: scoped, deviceData });
    const lines = readComponent(def, raw, "f1", "filled", {}, undefined, deviceData);
    if (state === "empty") {
      expect(html).not.toContain('data-testid="home/f1/root"');
      expect(View).not.toHaveBeenCalled();
      expect(lines).toEqual([]);
      expect(controller.read()).toBe("screen home");
      expect(controller.actionsAt(action.address)).toEqual([]);
      expect(controller.press(action.address)).toMatchObject({ ok: false, code: "not_actionable" });
      expect(controller.act(action)).toMatchObject({ ok: false, code: "not_actionable" });
    } else {
      expect(html).toContain('data-testid="home/f1/root"');
      expect(lines.join("\n")).toContain("[f1 press");
      expect(controller.read()).toContain("[f1 press");
      expect(controller.actionsAt(action.address)).toEqual(["press"]);
      expect(controller.press(action.address)).toMatchObject({ ok: true });
    }
    expect(controller.snapshotScreen()).toEqual(screen);
    controller.dispose();
  },
);
