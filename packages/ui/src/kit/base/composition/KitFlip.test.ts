import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it } from "vitest";
import { component, space, themeName } from "@lmthing/ui/catalog";
import { KitProvider, PartScope, KitFlip, KitText } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

function render(props: Parameters<typeof KitFlip>[0]) {
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
          createElement(KitFlip, props),
        ),
      ),
    ),
  );
}

const text = (part: string) => createElement(KitText, { part, children: part });
const input = {
  front: text("question"),
  back: text("answer"),
  flipped: false,
  label: "Turn",
  target: { item: "r2", part: "turn" },
};

it("mounts only the active face and addresses it with the caller's item", () => {
  const front = render(input);
  expect(front).toContain('data-testid="home/c1/r2/question"');
  expect(front).not.toContain("/answer");
  expect(front).toContain(">Turn</");
  expect(elementAt(front, "home/c1/r2/turn").attributes).toContain('role="button"');
  const back = render({ ...input, flipped: true, disabled: true });
  expect(back).toContain('data-testid="home/c1/r2/answer"');
  expect(back).not.toContain("/question");
  expect(back).not.toContain(">Turn</");
  expect(elementAt(back, "home/c1/r2/turn").attributes).toContain('aria-disabled="true"');
});

it("draws empty/static and loading cards without mounting either slot", () => {
  const loading = render({ ...input, loading: true });
  expect(loading).toContain('aria-busy="true"');
  expect(loading).not.toMatch(/role="button"|\/(answer|question|turn)"/);
  expect(styleAt(loading, elementAt(loading, "home/c1/root").children[0]!)).toContain(
    `min-height:${component.base.ringMd + space.md}px`,
  );
  const empty = render({ ...input, front: null, part: null, target: { part: null } });
  expect(empty).toContain("<svg");
  expect(empty).not.toMatch(/role="button"|data-testid=/);
});
