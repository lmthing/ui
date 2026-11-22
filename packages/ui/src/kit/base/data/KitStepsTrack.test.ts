import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it } from "vitest";
import { space, themeName } from "@lmthing/ui/catalog";
import { KitProvider, KitStepsTrack, PartScope } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

function draw(props: Parameters<typeof KitStepsTrack>[0]) {
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
          { screen: "home", component: "story", rev: 1, state: "filled", children: null },
          createElement(KitStepsTrack, props),
        ),
      ),
    ),
  );
}
const segmented = { style: "segmented", count: 4, at: 2 } as const;
const widths = (html: string) =>
  elementAt(html, "home/story/track").children.map(
    ({ children: [fill] }) => fill && styleAt(html, fill).match(/(?:^|;)width:([\d.]+)%/)?.[1],
  );

it("draws one decorative addressed track with a full past step, fractional current step, and empty future steps", () => {
  const html = draw({ ...segmented, progress: 0.375 });
  const track = elementAt(html, "home/story/track");
  expect(track.attributes).toContain('aria-hidden="true"');
  expect(widths(html)).toEqual(["100", "37.5", undefined, undefined]);
  for (const item of track.children) expect(styleAt(html, item)).toContain(`height:${space.xs}px`);
  expect(html.match(/data-testid=/g)).toHaveLength(1);
});

it.each([
  [undefined, undefined],
  [-2, undefined],
  [NaN, undefined],
  [Infinity, undefined],
  [2, "100"],
])("handles out-of-range or absent progress (%s)", (progress, fill) => {
  const html = draw({ ...segmented, ...(progress === undefined ? {} : { progress }) });
  expect(widths(html)).toEqual(["100", fill, undefined, undefined]);
});

it("draws no segments without steps and leaves existing track styles alone", () => {
  expect(widths(draw({ ...segmented, count: 0, at: 0 }))).toEqual([]);
  for (const style of ["dots", "bar", "numbered"] as const) {
    const props = { ...segmented, style };
    const track = (html: string) => elementAt(html, "home/story/track");
    expect(track(draw({ ...props, progress: 0.375 }))).toEqual(track(draw(props)));
  }
});
