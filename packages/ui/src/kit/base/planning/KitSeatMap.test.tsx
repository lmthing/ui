import * as jsxRuntime from "react/jsx-dev-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it, vi } from "vitest";
import { components, radius, size, themeName } from "@lmthing/ui/catalog";
import {
  createScreenController,
  KitProvider,
  KitSeatMap,
  KitText,
  PartScope,
  type ScreenController,
} from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

vi.mock("react/jsx-dev-runtime", { spy: true });

const tables = [
  {
    id: "r1",
    label: "Juniper",
    shape: "round",
    target: { part: "table" },
    seats: [
      { id: "r2", label: "Ari", initials: "AR", selected: true, target: { item: "r1", part: "seat_1" } },
      { id: "r3", label: "Free seat", target: { part: "seat" } },
      { id: "r4", label: "Bea", initials: "BE" },
      { id: "r5", label: "Cam", initials: "CA" },
    ],
  },
  {
    id: "r6",
    label: "Elm",
    shape: "long",
    target: { part: "table" },
    seats: [{ id: "r7", label: "Dev", initials: "DE" }],
  },
] as const;
const tray = <KitText part="tray">Waiting</KitText>;

function render(props: Parameters<typeof KitSeatMap>[0], controller?: ScreenController) {
  const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
  return renderToStaticMarkup(
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <KitProvider theme={theme} interactive controller={controller}>
        <PartScope screen="home" component="c1" rev={1} state="filled">
          <KitSeatMap {...props} />
        </PartScope>
      </KitProvider>
    </TamaguiProvider>,
  );
}

it("draws both table shapes, three seat states and the caller tray at separate addresses", () => {
  const html = render({ tables, part: "plan", tray });
  const round = styleAt(html, "home/c1/r1/table");
  const long = styleAt(html, "home/c1/r6/table");
  expect(round).toContain(`width:${size.control.md * 2}px`);
  expect(round).toContain(`border-top-left-radius:${radius.pill}px`);
  expect(long).toContain(`height:${size.control.lg}px`);
  const selected = elementAt(html, "home/c1/r1/seat_1");
  expect(selected.attributes).toContain('aria-pressed="true"');
  expect(selected.attributes).toContain('aria-label="Ari"');
  expect(styleAt(html, selected)).toContain(`height:${size.control.md}px`);
  expect(styleAt(html, selected)).toContain(`width:${size.control.md}px`);
  expect(elementAt(html, "home/c1/r3/seat").attributes).toContain('aria-pressed="false"');
  expect(html).toContain('aria-label="Bea"');
  expect(html).toContain("DE");
  expect(html).not.toContain("home/c1/r4/");
  expect(elementAt(html, "home/c1/plan").children).toHaveLength(3);
  expect(elementAt(html, "home/c1/tray")).toBeDefined();
});

it("retains both table layouts when loading, without mounting controls or tray content", () => {
  const filled = render({ tables, tray });
  const html = render({ tables, tray, loading: true });
  const layouts = (markup: string) => elementAt(markup, "home/c1/root").children.slice(0, 2);
  expect(layouts(html).map((node) => node.children.map((bank) => bank.children.length))).toEqual(
    layouts(filled).map((node) => node.children.map((bank) => bank.children.length)),
  );
  expect(html).toContain('aria-busy="true"');
  expect(html).not.toMatch(/Juniper|Waiting|role="button"|home\/c1\/r\d|home\/c1\/tray/);
  expect(render({ tables: [] })).toContain("<svg");
  expect(render({ tables: [], loading: true })).toContain("aria-busy");
  expect(render({ tables: [], tray })).toContain("Waiting");
});

it("keeps descriptive drawing ids separate from controller item ids", () => {
  const html = render({
    tables: [
      {
        id: "round-table",
        shape: "round",
        label: "Juniper",
        target: { part: "table" },
        seats: [{ id: "outer-seat", label: "Ari", initials: "AR", target: { item: "r8", part: "seat" } }],
      },
    ],
  });
  expect(html).toContain("Juniper");
  expect(html).not.toContain('data-testid="home/c1/table"');
  expect(elementAt(html, "home/c1/r8/seat").attributes).toContain('aria-label="Ari"');
});

it("dispatches touch and keyboard activation through the controller at the seat's supplied address", async () => {
  const controller = createScreenController({ defs: components, screen: { id: "home", components: [] } });
  const press = vi.spyOn(controller, "press");
  const { jsxDEV } = await vi.importActual<typeof jsxRuntime>("react/jsx-dev-runtime");
  type Handler = { testID?: string; onPress?: (event: object) => void; onKeyDown?: (event: object) => void };
  let seat: Handler | undefined;
  const spy = vi.spyOn(jsxRuntime, "jsxDEV").mockImplementation((...args) => {
    const input = args[1] as Handler;
    if (input.testID === "home/c1/r1/seat_1") seat = input;
    return jsxDEV(...args);
  });
  try {
    render({ tables }, controller);
    const event = { stopPropagation: vi.fn(), preventDefault: vi.fn() };
    seat!.onPress!(event);
    seat!.onKeyDown!({ ...event, key: "Tab" });
    seat!.onKeyDown!({ ...event, key: " " });
    seat!.onKeyDown!({ ...event, key: "Enter" });
    expect(press.mock.calls).toEqual(Array.from({ length: 3 }, () => ["home/c1/r1/seat_1"]));
    expect(event.stopPropagation).toHaveBeenCalledTimes(3);
    expect(event.preventDefault).toHaveBeenCalledTimes(2);
  } finally {
    spy.mockRestore();
    controller.dispose();
  }
});
