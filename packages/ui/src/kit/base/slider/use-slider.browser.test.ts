import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it, vi } from "vitest";
import { KitProvider, KitSlider, PartScope, type ScreenController } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";
import { useSlider } from "./use-slider";

function capture(options: Partial<Parameters<typeof useSlider>[0]> = {}) {
  const act = vi.fn();
  let control: ReturnType<typeof useSlider>;
  function Harness() {
    control = useSlider({
      address: "home/c1/field",
      part: "field",
      min: 1,
      max: 5.2,
      value: 2,
      step: 0.5,
      ...options,
    });
    return null;
  }
  const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
  renderToStaticMarkup(
    createElement(
      TamaguiProvider,
      { config },
      createElement(KitProvider, {
        theme,
        interactive: true,
        controller: { act } as unknown as ScreenController,
        children: createElement(Harness),
      }),
    ),
  );
  return { act, control: control! };
}
describe("KitSlider wave 2 step and disabled controls", () => {
  it("steps keyboard actions relative to min and clamps at valid end steps", () => {
    const { act, control } = capture();
    const handlers = control.handlers as { onKeyDown(event: { key: string; preventDefault(): void }): void };
    for (const [key, value] of [
      ["ArrowRight", 2.5],
      ["ArrowLeft", 1.5],
      ["Home", 1],
      ["End", 5],
    ] as const) {
      handlers.onKeyDown({ key, preventDefault: vi.fn() });
      expect(act).toHaveBeenLastCalledWith({ address: "home/c1/field", action: "set", value });
    }
    const invalid = capture({ step: 0 });
    (invalid.control.handlers as typeof handlers).onKeyDown({ key: "End", preventDefault: vi.fn() });
    expect(invalid.act).toHaveBeenLastCalledWith({ address: "home/c1/field", action: "set", value: 5 });
    expect(capture({ disabled: true }).control.handlers).toEqual({});
  });
  it("snaps pointer coordinates to half steps", () => {
    const { act, control } = capture();
    const listeners = vi.stubGlobal("document", { addEventListener: vi.fn(), removeEventListener: vi.fn() });
    try {
      const handlers = control.handlers as { onPointerDown(event: object): void };
      handlers.onPointerDown({
        currentTarget: { getBoundingClientRect: () => ({ left: 0, width: 224 }) },
        clientX: 112,
      });
      expect(act).toHaveBeenLastCalledWith({ address: "home/c1/field", action: "set", value: 3 });
    } finally {
      listeners.unstubAllGlobals();
    }
  });
});
describe("KitSlider loading geometry", () => {
  it("draws disabled and loading sliders without live roles in loading", () => {
    const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
    for (const state of ["filled", "loading"] as const) {
      const html = renderToStaticMarkup(
        createElement(
          TamaguiProvider,
          { config },
          createElement(
            KitProvider,
            { theme, children: null },
            createElement(
              PartScope,
              { screen: "home", component: "c1", rev: 1, state, children: null },
              createElement(KitSlider, { label: "Value", value: 2.5, step: 0.5, disabled: true }),
            ),
          ),
        ),
      );
      const field = elementAt(html, "home/c1/field");
      expect(field.attributes).toContain('aria-disabled="true"');
      expect(field.attributes.includes('aria-valuenow="2.5"')).toBe(state === "filled");
      expect(field.attributes.includes('role="slider"')).toBe(state === "filled");
      if (state === "loading") {
        expect(field.children[0]!.children).toHaveLength(0);
        expect(styleAt(html, field.children[0]!)).toContain("background-color:var(--line)");
      }
    }
  });
});
