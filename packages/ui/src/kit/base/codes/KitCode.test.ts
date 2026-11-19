import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it } from "vitest";
import { component, themeName } from "@lmthing/ui/catalog";
import { KitProvider, PartScope, KitCode } from "@lmthing/ui/kit";
import { config, styleAt } from "../../../../test/render";
import { codeDrawing } from "./KitCode";
function render(props: Parameters<typeof KitCode>[0], mode: "light" | "dark" = "light") {
  const theme = { preset: "calm", mode: mode, accent: "moss" } as const;
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
          createElement(KitCode, props),
        ),
      ),
    ),
  );
}

const input = { value: "https://example.org/pass", label: "Scan pass" };

it("renders the same fixed QR matrix and four-module quiet zone in light and dark", () => {
  const figure = codeDrawing(input.value)!;
  const runs = [...figure.path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)];
  expect(figure.side).toBe(33);
  expect(Math.min(...runs.map(([, x]) => Number(x)))).toBe(4);
  expect(Math.min(...runs.map(([, , y]) => Number(y)))).toBe(4);
  expect(Math.max(...runs.map(([, x, , run]) => Number(x) + Number(run)))).toBe(figure.side - 4);
  expect(Math.max(...runs.map(([, , y]) => Number(y) + 1))).toBe(figure.side - 4);
  const light = render(input),
    dark = render(input, "dark");
  const expected = `d="${figure.path}" fill="${component.swatch.black}"`;
  for (const html of [light, dark]) {
    expect(html).toContain(expected);
    expect(html).toContain(`fill="${component.swatch.white}"`);
    expect(html).toContain('aria-label="Scan pass"');
    expect(html).not.toContain(input.value);
  }
});

it("encodes distinct Unicode payloads and declines values exceeding capacity", () => {
  expect(codeDrawing("é")?.path).not.toBe(codeDrawing("e")?.path);
  expect(codeDrawing("🐕")).toBeDefined();
  expect(codeDrawing("x".repeat(3000))).toBeUndefined();
  expect(codeDrawing(undefined)).toBeUndefined();
});

it("uses the same footprint for empty, used and loading, with no QR matrix", () => {
  const filled = render(input);
  for (const props of [
    { ...input, value: "" },
    { ...input, used: true },
    { ...input, loading: true },
  ]) {
    const html = render(props);
    expect(html).not.toContain(`fill="${component.swatch.black}"`);
    expect(styleAt(html, "home/c1/root")).toContain("height:168px");
    expect(styleAt(filled, "home/c1/root")).toContain("height:168px");
  }
  expect(render({ ...input, part: null })).not.toContain("data-testid=");
});
