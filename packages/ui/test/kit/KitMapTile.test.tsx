import * as React from "react";
import * as jsxRuntime from "react/jsx-dev-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it, vi } from "vitest";
import { component, components, size, themeName, type StateName } from "@lmthing/ui/catalog";
import {
  createScreenController,
  KitMapTile,
  KitProvider,
  PartScope,
  type ScreenController,
} from "@lmthing/ui/kit";
import { addressedElements, config, elementAt, styleAt } from "../render";

vi.mock("react", { spy: true });
vi.mock("react/jsx-dev-runtime", { spy: true });
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const width = 240;
const pins = [
  { id: "r1", label: "North gate", x: 0, y: 0, selected: true, target: { part: "pin" } },
  { id: "r2", label: "South gate", x: 1, y: 1, mark: "dot", target: { item: "r7", part: "select" } },
  { id: "r3", label: "In transit", x: 0.5, y: 0.5, mark: "dot" },
] as const;

async function draw(
  props: React.ComponentProps<typeof KitMapTile>,
  state: StateName,
  controller?: ScreenController,
) {
  const { useState } = await vi.importActual<typeof React>("react");
  // Server render has no onLayout event; seed the width used by the measured client drawing.
  const spy = vi
    .spyOn(React, "useState")
    .mockImplementation(((initial: unknown) => useState(initial === 0 ? width : initial)) as typeof useState);
  try {
    return renderToStaticMarkup(
      <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
        <KitProvider theme={theme} interactive controller={controller}>
          <PartScope screen="home" component="c1" rev={1} state={state}>
            <KitMapTile {...props} />
          </PartScope>
        </KitProvider>
      </TamaguiProvider>,
    );
  } finally {
    spy.mockRestore();
  }
}

describe("KitMapTile", () => {
  it("keeps the decorative numbered path when pins are absent", async () => {
    const html = await draw({ count: 2, part: "drawing" }, "filled");
    expect([...addressedElements(html).keys()]).toEqual(["home/c1/drawing"]);
    expect(elementAt(html, "home/c1/drawing").attributes).toContain('aria-hidden="true"');
    expect(html.match(/<circle\b/g)).toHaveLength(2);
    expect(html).toMatch(/>1<\/text>/);
    expect(html).toMatch(/>2<\/text>/);
  });

  it("addresses supplied targets and keeps edge hit boxes inside the map", async () => {
    const html = await draw({ count: 5, pins }, "filled");
    const root = "home/c1";
    const height = Math.round(width / component.base.wideRatio);
    expect([...addressedElements(html).keys()]).toEqual([
      `${root}/map`,
      `${root}/r1/pin`,
      `${root}/r7/select`,
    ]);
    const first = elementAt(html, `${root}/r1/pin`);
    expect(first.attributes).toContain('role="button"');
    expect(first.attributes).toContain('aria-pressed="true"');
    expect(first.attributes).toContain('aria-label="North gate"');
    expect(styleAt(html, first)).toContain("left:0px");
    const last = elementAt(html, `${root}/r7/select`);
    expect(styleAt(html, last)).toContain(`width:${size.control.md}px`);
    expect(styleAt(html, last)).toContain(`left:${width - size.control.md}px`);
    expect(styleAt(html, last)).toContain(`top:${height - size.control.md}px`);
    expect(html).toMatch(/role="img"[^>]*aria-label="In transit"|aria-label="In transit"[^>]*role="img"/);
    expect(html).not.toMatch(/>1<\/text>/);
  });

  it("keeps an empty map and the loaded viewport geometry without pin actions or labels", async () => {
    const empty = await draw({ pins }, "empty");
    const loading = await draw({ pins }, "loading");
    const full = await draw({ pins }, "filled");
    for (const html of [empty, loading]) {
      expect([...addressedElements(html).keys()]).toEqual(["home/c1/map"]);
      expect(html).not.toContain('role="button"');
      expect(html).not.toContain("North gate");
    }
    expect(styleAt(empty, "home/c1/map")).toContain(`height:${size.control.md}px`);
    expect(styleAt(loading, "home/c1/map")).toContain(`aspect-ratio:${component.base.wideRatio}`);
    expect(styleAt(loading, "home/c1/map")).toEqual(styleAt(full, "home/c1/map"));
    expect(elementAt(loading, "home/c1/map").attributes).toContain('aria-busy="true"');
  });
});

describe("KitMapTile interaction", () => {
  it("dispatches the declared root action through the controller", async () => {
    const { jsxDEV } = await vi.importActual<typeof jsxRuntime>("react/jsx-dev-runtime");
    let press: ((event: object) => unknown) | undefined;
    const spy = vi.spyOn(jsxRuntime, "jsxDEV").mockImplementation((...args) => {
      const props = args[1] as { testID?: string; onPress?: typeof press };
      if (props.testID === "home/c1/r1/root" && props.onPress) press = props.onPress;
      return jsxDEV(...args);
    });
    const onLink = vi.fn();
    const controller = createScreenController({
      defs: components,
      requireMounted: true,
      onLink,
      screen: { id: "home", components: [{ id: "c1", c: "MapPins", ...components.MapPins.examples[0] }] },
    });
    try {
      const close = { ...pins[0], id: "r2", x: 0.02, target: { part: "root" } };
      await draw({ pins: [{ ...pins[0], target: { part: "root" } }, close] }, "filled", controller);
      expect(press).toBeDefined();
      expect(press?.({})).toMatchObject({ ok: false, code: "not_mounted" });
      const unregister = controller.registerPart("home/c1/r1/root");
      expect(press?.({})).toMatchObject({ ok: true });
      expect(onLink).toHaveBeenCalledWith("greenhouse", "home/c1/r1");
      unregister();
      const unregisterClose = controller.registerPart("home/c1/r2/root");
      const half = size.avatar.sm / 2;
      expect(
        press?.({
          nativeEvent: { offsetX: half + 0.02 * (width - size.avatar.sm), offsetY: half, detail: 1 },
        }),
      ).toMatchObject({ ok: true });
      expect(onLink).toHaveBeenCalledWith("riverside", "home/c1/r2");
      unregisterClose();
    } finally {
      spy.mockRestore();
      controller.dispose();
    }
  });

  it("does not collapse nearby markers even when their boxes share the same edge inset", async () => {
    const near = { ...pins[0], id: "r4", x: 0.02 };
    const html = await draw({ pins: [pins[0], near] }, "filled");
    const first = elementAt(html, "home/c1/r1/pin");
    const second = elementAt(html, "home/c1/r4/pin");
    for (const pin of [first, second]) expect(styleAt(html, pin)).toContain("left:0px");
    expect(styleAt(html, first.children[0]!)).not.toEqual(styleAt(html, second.children[0]!));
  });
});
