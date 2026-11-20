import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it, vi } from "vitest";
import { z } from "zod";
import {
  components,
  themeName,
  type Definition,
  type DeviceData,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import {
  createAgentAccess,
  KitProvider,
  KitText,
  PartScope,
  useDeviceData,
  useKit,
  type ScreenController,
} from "@lmthing/ui/kit";
import { createPreviewController, previewComponent } from "../../../../../apps/gallery/app/draw";
import { config } from "../../../test/render";
import { PhoneScreen } from "./PhoneScreen";

const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
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
