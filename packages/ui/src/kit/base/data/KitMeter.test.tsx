import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it } from "vitest";
import { themeName } from "@lmthing/ui/catalog";
import { KitMeter, KitProvider, PartScope } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

function render(addressed?: false, fillFrom?: "start" | "end", ratio = 0.5) {
  return renderToStaticMarkup(
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <KitProvider theme={theme}>
        <PartScope screen="home" component="c1" rev={1} state="filled">
          <div data-testid="meter">
            <KitMeter
              label="5 stars"
              amount="12"
              ratio={ratio}
              slim
              {...(addressed === false ? { addressed } : {})}
              {...(fillFrom ? { fillFrom } : {})}
            />
          </div>
        </PartScope>
      </KitProvider>
    </TamaguiProvider>,
  );
}

it("keeps meter text and geometry when callers opt out of the default text addresses", () => {
  const original = render();
  expect(original).toContain('data-testid="home/c1/label"');
  expect(original).toContain('data-testid="home/c1/amount"');
  expect(original).toContain(">5 stars<");
  expect(original).toContain(">12<");
  const withoutStyles = (html: string) => html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "");
  expect(withoutStyles(render(false))).toBe(
    withoutStyles(original).replace(/ data-testid="home\/c1\/(?:label|amount)"/g, ""),
  );
});

it("anchors only the opted-in fill to the logical end and preserves the clamped width", () => {
  expect(render(undefined, "start")).toBe(render());
  for (const [ratio, width] of [
    [-1, 0],
    [0.35, 35],
    [2, 100],
  ] as const) {
    const fill = (from?: "end") => {
      const html = render(undefined, from, ratio);
      return styleAt(html, elementAt(html, "meter").children[0]!.children[1]!.children[0]!);
    };
    expect(fill()).toContain(`width:${width}%`);
    expect(fill()).not.toContain("align-self:flex-end");
    expect(fill("end")).toContain(`width:${width}%`);
    expect(fill("end")).toContain("align-self:flex-end");
  }
});
