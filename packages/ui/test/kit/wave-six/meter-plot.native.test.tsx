import * as runtime from "react/jsx-dev-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it, vi } from "vitest";
import { size, themeName } from "@lmthing/ui/catalog";
import { KitLinePlot, KitProvider, PartScope, type ScreenController } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../render";

vi.mock("react/jsx-dev-runtime", { spy: true });
vi.mock("tamagui", async (original) => ({
  ...(await original<typeof import("tamagui")>()),
  isWeb: false,
}));

it("uses an LTR plot coordinate space and accepts native accessibility activation", async () => {
  const address = "home/c1/r2/root";
  const act = vi.fn();
  const { jsxDEV } = await vi.importActual<typeof runtime>("react/jsx-dev-runtime");
  type NativeTarget = {
    testID?: string;
    accessible?: boolean;
    accessibilityState?: unknown;
    onAccessibilityTap?: () => void;
    accessibilityActions?: { name: string }[];
    onAccessibilityAction?: (event: { nativeEvent: { actionName: string } }) => void;
  };
  let target: NativeTarget | undefined;
  const spy = vi.spyOn(runtime, "jsxDEV").mockImplementation((...args) => {
    const props = args[1] as NativeTarget;
    if (props.testID === address && props.accessible) {
      target = props;
      // Capture native props without passing them to the web renderer used to inspect layout.
      const { accessibilityState: _state, accessibilityActions: _actions, ...webProps } = props;
      args[1] = webProps;
    }
    return jsxDEV(...args);
  });
  const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
  try {
    const html = renderToStaticMarkup(
      <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
        <KitProvider theme={theme} interactive controller={{ act } as unknown as ScreenController}>
          <PartScope screen="home" component="c1" rev={1} state="filled">
            <KitLinePlot
              style="compact"
              targetPlacement="marker"
              series={[
                {
                  id: "series",
                  label: "Reading",
                  points: [
                    { id: "r1", x: 0, value: 3, label: "First" },
                    { id: "r2", x: 1, value: 5, label: "Second" },
                  ],
                },
              ]}
              selected="r2"
              targets={[{ point: "r2", target: { item: "r2", part: "root" } }]}
            />
          </PartScope>
        </KitProvider>
      </TamaguiProvider>,
    );
    const drawing = elementAt(html, "home/c1/root").children[0]!.children[0]!;
    expect(styleAt(html, drawing)).toContain("direction:ltr");
    const markerX = Number([...html.matchAll(/<circle [^>]*cx="([\d.]+)"/g)].at(-1)?.[1]);
    expect(styleAt(html, address)).toContain(`left:${markerX - size.control.md / 2}px`);
    expect(target?.accessibilityState).toEqual({ selected: true });
    expect(target?.accessibilityActions).toEqual([{ name: "activate" }]);
    target!.onAccessibilityTap!();
    expect(act).toHaveBeenCalledExactlyOnceWith({ address, action: "select", value: "r2" });
    act.mockClear();
    target!.onAccessibilityAction!({ nativeEvent: { actionName: "activate" } });
    expect(act).toHaveBeenCalledExactlyOnceWith({ address, action: "select", value: "r2" });
  } finally {
    spy.mockRestore();
  }
});
