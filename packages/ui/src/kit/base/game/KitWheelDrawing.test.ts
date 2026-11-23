import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it } from "vitest";
import { component, presets, size, themeName } from "@lmthing/ui/catalog";
import { KitProvider, PartScope, KitDiceFace, KitWheel, KitOrbit, KitText } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

function render(props: Parameters<typeof WheelDrawing>[0], preset = "calm", mode = "light") {
  const theme = { preset, mode, accent: "moss" } as Parameters<typeof KitProvider>[0]["theme"];
  return renderToStaticMarkup(
    createElement(
      TamaguiProvider,
      { config, defaultTheme: themeName(theme) },
      createElement(
        KitProvider,
        { theme, children: null },
        createElement(
          PartScope,
          { screen: "home", component: "c1", rev: 1, state: "filled", children: null },
          createElement(WheelDrawing, props),
        ),
      ),
    ),
  );
}
import { WheelDrawing } from "./KitWheelDrawing";
describe("WheelDrawing", () => {
  it("draws equal sector arcs and retains labels for one option", () => {
    const one = render({ options: [{ id: "r1", label: "Only" }], angle: 0, at: "r1", loading: false });
    expect(elementAt(one, "home/c1/r1/root").attributes).toContain('aria-current="true"');
    expect(one).toContain("Only");
    const props = {
      options: ["A", "B", "C", "D"].map((label, i) => ({ id: `r${i + 1}`, label })),
      loading: false,
    };
    const zero = render({ ...props, angle: 0 });
    const turned = render({ ...props, angle: 0.25 });
    expect([...zero.matchAll(/<path[^>]*d="M /g)]).toHaveLength(4);
    expect(turned).not.toEqual(zero);
    expect(turned).not.toMatch(/NaN|Infinity/);
    const hidden = render({ ...props, angle: 0, loading: true });
    expect(hidden).not.toContain("data-testid=");
    expect(hidden).not.toContain('role="text"');
    expect(hidden.match(new RegExp(`stroke-opacity="${component.base.disabledOpacity}"`, "g"))).toHaveLength(
      5,
    );
  });
});
