import type { ReactNode } from "react";
import * as jsxRuntime from "react/jsx-dev-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it, vi } from "vitest";
import { themeName, type StateName } from "@lmthing/ui/catalog";
import { KitProvider, KitText, PartScope } from "@lmthing/ui/kit";
import { addressedElements, config, elementAt, styleAt } from "../render";

vi.mock("react/jsx-dev-runtime", { spy: true });
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

function draw(children: ReactNode, state: StateName = "filled", onLink = vi.fn()) {
  return renderToStaticMarkup(
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <KitProvider theme={theme} interactive onLink={onLink}>
        <PartScope screen="home" component="c1" item="r9" rev={1} state={state}>
          {children}
        </PartScope>
      </KitProvider>
    </TamaguiProvider>,
  );
}

describe("KitText runs", () => {
  it("keeps inline runs within the parent line and keeps the theme emphasis axis separate", () => {
    const html = draw(
      <KitText part="body">
        Before{" "}
        <KitText part="bold" emphasis="strong">
          strong
        </KitText>
        {" and "}
        <KitText part="italic" emphasis="emphasis">
          emphasized
        </KitText>
        {" text"}
        <KitText part="hero" emphasis="hero">
          Hero
        </KitText>
      </KitText>,
    );
    const root = addressedElements(html).get("home/c1/r9/body")!;
    expect(root.children.map((node) => node.tag)).toEqual(["span", "span", "span"]);
    expect(styleAt(html, root.children[0]!)).toContain("font-weight:700");
    expect(styleAt(html, root.children[1]!)).toContain("font-style:italic");
    expect(styleAt(html, root.children[1]!)).toContain("font-size:16px");
    expect(styleAt(html, root.children[2]!)).toContain("font-size:18px");
  });
});

describe("KitText links", () => {
  it("links at the explicit item and part using the shared link path", async () => {
    const { jsxDEV } = await vi.importActual<typeof jsxRuntime>("react/jsx-dev-runtime");
    let press: ((event: { stopPropagation(): void }) => void) | undefined;
    const spy = vi.spyOn(jsxRuntime, "jsxDEV").mockImplementation((...args) => {
      const props = args[1] as { testID?: string; onPress?: typeof press };
      if (props.testID === "home/c1/r1/link" && props.onPress) press = props.onPress;
      return jsxDEV(...args);
    });
    const onLink = vi.fn();
    try {
      const html = draw(
        <KitText part="link" goto="details" item="r1">
          Details
        </KitText>,
        "filled",
        onLink,
      );
      const link = elementAt(html, "home/c1/r1/link");
      expect(link.attributes).toContain('role="link"');
      expect(styleAt(html, link)).toContain("text-decoration-line:underline");
      const stopPropagation = vi.fn();
      expect(press).toBeDefined();
      press?.({ stopPropagation });
      expect(stopPropagation).toHaveBeenCalledOnce();
      expect(onLink).toHaveBeenCalledWith("details", "home/c1/r1/link");
    } finally {
      spy.mockRestore();
    }
  });

  it("keeps empty text static, loading text unaddressed and private to the layout, and null parts opt out", () => {
    const node = (
      <KitText part="link" goto="details" item="r1">
        Details
      </KitText>
    );
    const empty = draw(node, "empty");
    expect(elementAt(empty, "home/c1/r1/link").attributes).not.toContain('role="link"');
    const loading = draw(node, "loading");
    expect(addressedElements(loading).size).toBe(0);
    expect(loading).toContain('aria-hidden="true"');
    expect(loading).not.toContain('role="link"');
    expect(
      addressedElements(
        draw(
          <KitText part={null} goto="details">
            Details
          </KitText>,
        ),
      ).size,
    ).toBe(0);
  });
});
