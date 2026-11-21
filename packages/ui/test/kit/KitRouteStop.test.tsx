import type { ComponentProps } from "react";
import * as jsxRuntime from "react/jsx-dev-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it, vi } from "vitest";
import { size, themeName, type StateName } from "@lmthing/ui/catalog";
import { KitProvider, KitRouteStop, KitText, PartScope, type ScreenController } from "@lmthing/ui/kit";
import { addressedElements, config, elementAt, styleAt } from "../render";

vi.mock("react/jsx-dev-runtime", { spy: true });
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const item = "r2";
const root = "home/c1/r2/root";

function draw(
  props: Partial<ComponentProps<typeof KitRouteStop>> = {},
  state: StateName = "filled",
  controller?: ScreenController,
  onLink = vi.fn(),
) {
  return renderToStaticMarkup(
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <KitProvider theme={theme} interactive controller={controller} onLink={onLink}>
        <PartScope screen="home" component="c1" rev={1} state={state}>
          <KitRouteStop item={item} label="Handoff" position="end" {...props}>
            {props.children ?? <KitText part="label">Handoff</KitText>}
          </KitRouteStop>
        </PartScope>
      </KitProvider>
    </TamaguiProvider>,
  );
}

describe("KitRouteStop", () => {
  it("keeps the default route and uses a neutral dot or completed check without extra parts", () => {
    const route = draw();
    expect(elementAt(draw({ mark: "route" }), root)).toEqual(elementAt(route, root));
    const dot = draw({ mark: "dot" });
    const check = draw({ mark: "check" });
    expect([...addressedElements(dot).keys()]).toEqual([root, "home/c1/r2/label"]);
    expect([...addressedElements(check).keys()]).toEqual([root, "home/c1/r2/label"]);
    const mark = (html: string) => elementAt(html, root).children[0]!.children[1]!.children[0]!;
    expect(mark(route).tag).toBe("svg");
    expect(styleAt(dot, mark(dot))).toContain("var(--muted)");
    expect(styleAt(check, mark(check))).toContain("var(--goodSoft)");
    expect(mark(check).children[0]!.tag).toBe("svg");
  });

  it("gives a linked stop a full-row target that uses the controller rather than the supplied fallback", async () => {
    const { jsxDEV } = await vi.importActual<typeof jsxRuntime>("react/jsx-dev-runtime");
    let press: ((event: object) => void) | undefined;
    const spy = vi.spyOn(jsxRuntime, "jsxDEV").mockImplementation((...args) => {
      const props = args[1] as { testID?: string; onPress?: typeof press };
      if (props.testID === root && props.onPress) press = props.onPress;
      return jsxDEV(...args);
    });
    const controller = { press: vi.fn() } as unknown as ScreenController;
    const onLink = vi.fn();
    try {
      const html = draw({ goto: "details" }, "filled", controller, onLink);
      expect(elementAt(html, root).attributes).toContain('role="link"');
      expect(styleAt(html, root)).toContain(`min-height:${size.control.md}px`);
      expect(press).toBeDefined();
      press?.({});
      expect(controller.press).toHaveBeenCalledWith(root);
      expect(onLink).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it("does not offer the link in empty or loading states", () => {
    const empty = draw({ goto: "details", mark: "check" }, "empty");
    const loading = draw({ goto: "details", mark: "check" }, "loading");
    expect(elementAt(empty, root).attributes).not.toContain('role="link"');
    expect(loading).not.toContain('role="link"');
    expect(addressedElements(loading).has(root)).toBe(false);
    expect(addressedElements(loading).has("home/c1/r2/label")).toBe(false);
    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain('aria-hidden="true"');
  });
});

it("reserves cold loading lines from the caller's text without rendering its links", () => {
  const html = draw(
    {
      children: (
        <>
          <KitText part="label">Handoff</KitText>
          <KitText part="detail" role="caption" goto="details">
            Additional context
          </KitText>
        </>
      ),
    },
    "loading",
  );
  expect(addressedElements(html).size).toBe(0);
  expect(html).not.toContain('role="link"');
  expect(html).toContain(">Handoff</span>");
  expect(html).toContain(">Additional context</span>");
  const bars = (markup: string) =>
    markup
      .split("</style>")
      .at(-1)!
      .match(/_backgroundColor-line/g)?.length ?? 0;
  expect(bars(html)).toBe(bars(draw({}, "loading")) + 1);
});
