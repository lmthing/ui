import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it } from "vitest";
import { config, elementAt, styleAt } from "../../../test/render";
import { size, themeName, type ThemeChoice } from "../../catalog";
import { KitStepper, KitText } from "../base";
import { PartScope } from "../part";
import { KitProvider } from "../provider";
import { KitPinnedBottom, ScreenBottomOutlet, ScreenBottomSlots, ScreenBottomSource } from "./pinned-bottom";

const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;

function render(value: number, withinScreen = false) {
  const details = (
    <PartScope screen="fixture" component="d1" item="r1" state="filled" rev={1}>
      <KitText part="detail">Details</KitText>
      <KitPinnedBottom>
        <KitStepper part="qty" value={value} min={1} max={3} labels={{ less: "Less", more: "More" }} />
      </KitPinnedBottom>
    </PartScope>
  );
  return renderToStaticMarkup(
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <KitProvider theme={theme}>
        {withinScreen ? (
          <ScreenBottomSlots>
            <ScreenBottomSource>{details}</ScreenBottomSource>
            <ScreenBottomOutlet />
          </ScreenBottomSlots>
        ) : (
          details
        )}
      </KitProvider>
    </TamaguiProvider>,
  );
}

it("renders pins inline without a screen, and never duplicates them in the server-rendered body", () => {
  expect(render(2)).toContain('data-testid="fixture/d1/r1/qty"');
  const screen = render(2, true);
  expect(screen).toContain('data-testid="fixture/d1/r1/detail"');
  expect(screen).not.toContain('data-testid="fixture/d1/r1/qty"');
});

it.each([
  [1, true, false],
  [2, false, false],
  [3, false, true],
] as const)("mounts one addressed stepper with two named targets at %s", (value, less, more) => {
  const html = render(value);
  const address = "fixture/d1/r1/qty";
  expect(html.match(new RegExp(`data-testid="${address}"`, "g"))).toHaveLength(1);
  const [minus, , plus] = elementAt(html, address).children;
  for (const [button, name, disabled] of [
    [minus, "Less", less],
    [plus, "More", more],
  ] as const) {
    expect(button!.attributes).toContain('role="button"');
    expect(button!.attributes).toContain(`aria-label="${name}"`);
    expect(button!.attributes.includes('aria-disabled="true"')).toBe(disabled);
    expect(button!.attributes).not.toContain("data-testid");
    expect(styleAt(html, button!)).toContain(`min-width:${size.control.md}px`);
    expect(styleAt(html, button!)).toContain(`min-height:${size.control.md}px`);
  }
});
