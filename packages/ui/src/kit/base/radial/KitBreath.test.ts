import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it } from "vitest";
import { component, space, themeName } from "@lmthing/ui/catalog";
import { KitProvider, PartScope, KitBreath, KitText } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";
import { breathRatio } from "./KitBreath";
function render(props: Parameters<typeof KitBreath>[0]) {
  const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
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
          createElement(KitBreath, props),
        ),
      ),
    ),
  );
}

const input = {
  progress: 0.25,
  phase: "inhale" as const,
  label: "Pause",
  target: { part: "pause", item: "r1" },
  children: createElement(KitText, { part: "phase", children: "Breathe in" }),
};

it("expands, holds, contracts and rests from bounded caller progress", () => {
  expect(breathRatio("inhale", 0.25)).toBe(0.25);
  expect(breathRatio("hold", 0.25)).toBe(1);
  expect(breathRatio("exhale", 0.25)).toBe(0.75);
  expect(breathRatio("rest", 1)).toBe(0);
  expect(breathRatio("inhale", -2)).toBe(0);
  expect(breathRatio("inhale", 2)).toBe(1);
  expect(breathRatio("inhale", NaN)).toBe(0);
});

it("keeps the circle footprint, shows caller slots and inactivates loading", () => {
  const filled = render(input);
  const pause = elementAt(filled, "home/c1/r1/pause");
  expect(pause.attributes).toContain('role="button"');
  expect(filled).toContain('data-testid="home/c1/r1/phase"');
  const paused = render({ ...input, paused: true });
  expect(styleAt(paused, "home/c1/r1/pause")).toBe(styleAt(filled, pause));
  const rest = render({ ...input, phase: "rest", children: null, target: { part: null } });
  expect(rest).not.toMatch(/role="button"|\/phase"/);
  const loading = render({ ...input, loading: true });
  expect(loading).toContain('aria-busy="true"');
  expect(loading).not.toMatch(/role="button"|\/phase"|\/pause"/);
  expect(styleAt(loading, elementAt(loading, "home/c1/root").children[0]!)).toContain(
    `height:${component.base.ringLg + space.lg * 2}px`,
  );
  const min = component.base.ringMd + space.xl;
  const diameter = min + (component.base.ringLg + space.lg * 2 - min) * input.progress;
  expect(styleAt(loading, elementAt(loading, "home/c1/root").children[0]!.children[0]!)).toContain(
    `height:${diameter}px`,
  );
});
