import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it } from "vitest";
import { component, space, themeName } from "@lmthing/ui/catalog";
import { KitProvider, PartScope, KitCode } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";
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
    expect(html).toContain(`width="${component.base.ringLg}" height="${component.base.ringLg}"`);
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
  const filledFrame = styleAt(render(input), "home/c1/root");
  const edge = component.base.ringLg + space.md * 2;
  expect(filledFrame).toContain(`height:${edge}px`);
  expect(filledFrame).not.toMatch(/background-color|shadow/);
  for (const props of [
    { ...input, value: "" },
    { ...input, used: true },
    { ...input, loading: true },
  ]) {
    const html = render(props);
    expect(html).not.toContain(`fill="${component.swatch.black}"`);
    expect(styleAt(html, "home/c1/root")).toBe(filledFrame);
  }
  const loading = render({ ...input, loading: true });
  const plate = elementAt(loading, "home/c1/root").children[0]!;
  expect(styleAt(loading, plate)).toContain(`width:${component.base.ringLg}px`);
  expect(styleAt(loading, plate)).toContain(`height:${component.base.ringLg}px`);
  expect(render({ ...input, part: null })).not.toContain("data-testid=");
});

it("uses its rectangular barcode plate only for a drawable, available payload", () => {
  const barcode = { label: input.label, value: "TEST-042", kind: "barcode" } as const;
  const html = render(barcode);
  expect(html).toContain('viewBox="0 0 143 48"');
  expect(html).toContain(`fill="${component.swatch.black}"`);
  expect(html).not.toContain(barcode.value);
  for (const options of [{ used: true }, { unavailable: true }, { loading: true }, { value: "æ" }]) {
    expect(render({ ...barcode, ...options })).not.toContain(`fill="${component.swatch.black}"`);
  }
});

it.each([
  { ...input, kind: "qr" },
  { ...input, value: "TEST-042", kind: "barcode" },
] as const)("enlarges a $kind without changing its encoded geometry", (props) => {
  const normal = render(props);
  const scanner = render({ ...props, scale: "scanner" });
  for (const pattern of [/viewBox="[^"]+"/, /<path d="[^"]+"/])
    expect(scanner.match(pattern)?.[0]).toBe(normal.match(pattern)?.[0]);
  expect(scanner).toContain(`width="${component.base.codeScanner}"`);
  expect(normal).not.toContain(`width="${component.base.codeScanner}"`);
});
