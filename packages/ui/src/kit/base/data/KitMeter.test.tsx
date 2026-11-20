import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it } from "vitest";
import { themeName } from "@lmthing/ui/catalog";
import { KitMeter, KitProvider, PartScope } from "@lmthing/ui/kit";
import { config } from "../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

function render(addressed?: false) {
  return renderToStaticMarkup(
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <KitProvider theme={theme}>
        <PartScope screen="home" component="c1" rev={1} state="filled">
          <KitMeter
            label="5 stars"
            amount="12"
            ratio={0.5}
            slim
            {...(addressed === false ? { addressed } : {})}
          />
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
