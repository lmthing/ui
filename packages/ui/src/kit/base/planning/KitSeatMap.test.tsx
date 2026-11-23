import * as jsxRuntime from "react/jsx-dev-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it, vi } from "vitest";
import { components, radius, size, space, themeName, type as typography } from "@lmthing/ui/catalog";
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

it("gives all round seats the same orbital radius and retains their order", () => {
  const seats = Array.from({ length: 8 }, (_, i) => ({
    id: `r${i + 2}`,
    label: `Guest ${i}`,
    target: { part: "seat" },
  }));
  const html = render({ tables: [{ ...tables[0], seats }] });
  let diagram = elementAt(html, "home/c1/root").children[0]!;
  while (diagram.children.length === 1) diagram = diagram.children[0]!;
  expect(diagram.children[0]).toEqual(elementAt(html, "home/c1/r1/table"));
  const diameter = Number(styleAt(html, diagram).match(/(?:^|;)width:(\d+)px/)?.[1]);
  const reach = (diameter - size.control.md) / 2;
  expect(reach - size.control.md / 2 - size.control.md).toBeGreaterThanOrEqual(space.xs);
  const ring = diagram.children[1]!;
  expect(ring.children).toHaveLength(8);
  const percent = (css: string, key: string) =>
    Number(css.match(new RegExp(`(?:^|;)${key}:([\\d.]+)%`))?.[1]);
  for (const [index, node] of ring.children.entries()) {
    const css = styleAt(html, node);
    expect(Math.hypot(percent(css, "left") - 50, percent(css, "top") - 50)).toBeCloseTo(50);
    expect(node.children[0]!.attributes).toContain(`data-testid="home/c1/${seats[index]!.id}/seat"`);
  }
});

it("keeps a cold tray flat at the content width and reserves each known guest row without mounting controls", () => {
  const trayGuests = [tables[0].seats[0], tables[0].seats[1]].map((seat) => ({
    ...seat,
    move: { destinations: ["Elm"], label: () => "Move to Elm" },
  }));
  const props = { tables, tray, trayGuests };
  const filled = render(props);
  const loadedTray = elementAt(filled, "home/c1/root").children.at(-1)!;
  expect(styleAt(filled, loadedTray)).toContain("width:100%");
  expect(styleAt(filled, loadedTray)).not.toMatch(/max-width|background-color/);
  expect(loadedTray.children).toHaveLength(3);
  const html = render({ ...props, loading: true });
  const waiting = elementAt(html, "home/c1/root").children.at(-1)!;
  expect(
    waiting.children.map((node) => Number(styleAt(html, node).match(/(?:^|;)height:(\d+)px/)?.[1])),
  ).toEqual([typography.label.lineHeight, size.control.md, size.control.md]);
  expect(html).not.toMatch(/Waiting|role="button"|\/tray"/);
});

it("keeps a seat drawing inert when move has no destination, valid address or controller offer", () => {
  const controller = createScreenController({ defs: components, screen: { id: "home", components: [] } });
  const move = { destinations: ["Elm"], label: (destination: string) => destination };
  const options = [
    {
      ...tables[0],
      seats: [
        { ...tables[0].seats[0], move },
        {
          id: "r3",
          label: "Bea",
          initials: "BE",
          target: { part: "root" },
          move: { ...move, destinations: [] },
        },
        { id: "outer-seat", label: "Cam", initials: "CA", target: { part: "root" }, move },
      ],
    },
  ];
  try {
    const html = render({ tables: options }, controller);
    expect(elementAt(html, "home/c1/r1/seat_1").attributes).toContain('aria-disabled="true"');
    expect(elementAt(html, "home/c1/r3/root").attributes).toContain('role="img"');
    expect(html).not.toMatch(/outer-seat|aria-expanded="true"/);
    expect(render({ tables: options, loading: true }, controller)).not.toMatch(/role="button"|aria-expanded/);
  } finally {
    controller.dispose();
  }
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
