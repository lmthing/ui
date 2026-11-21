import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it } from "vitest";
import { component, space, themeName, type ThemeChoice } from "@lmthing/ui/catalog";
import { KitProvider, PartScope, KitFlip, KitText } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

function render(props: Parameters<typeof KitFlip>[0], preset: ThemeChoice["preset"] = "calm") {
  const theme = { preset, mode: "light", accent: "moss" } as const;
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
  const disabledButton = elementAt(back, "home/c1/r2/turn");
  expect(disabledButton.attributes).toContain('aria-disabled="true"');
  const enabledHint = elementAt(front, "home/c1/r2/turn").children[0]!.children[1]!;
  const disabledHint = disabledButton.children[0]!.children[1]!;
  expect(disabledHint.attributes).toContain('aria-hidden="true"');
  expect(styleAt(back, disabledHint)).toContain("opacity:0");
  expect(styleAt(back, disabledHint)).toContain(`margin-top:${space.sm}px`);
  expect(styleAt(back, disabledHint.children[0]!)).toBe(styleAt(front, enabledHint.children[0]!));
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

it.each([
  ["calm", 0],
  ["bold", 0],
  ["editorial", component.base.borderWidth],
] as const)("opts into the shared start inset in %s without changing vertical padding", (preset, border) => {
  const address = "home/c1/r2/turn";
  const centered = render(input, preset);
  const explicitCenter = render({ ...input, align: "center" }, preset);
  expect(elementAt(centered, address)).toEqual(elementAt(explicitCenter, address));
  expect(styleAt(centered, address)).toContain(`padding-left:${space.lg}px`);
  expect(styleAt(centered, elementAt(centered, address).children[0]!.children[1]!.children[0]!)).toContain(
    "text-align:center",
  );

  const start = render({ ...input, align: "start" }, preset);
  const face = elementAt(start, address);
  const content = face.children[0]!;
  expect(face.attributes).toContain('role="button"');
  expect(styleAt(start, face)).toContain(`padding-left:${space.md - border}px`);
  expect(styleAt(start, face)).toContain(`padding-right:${space.md - border}px`);
  expect(styleAt(start, face)).toContain(`padding-top:${space.lg}px`);
  expect(styleAt(start, content)).toContain("align-items:stretch");
  expect(styleAt(start, content.children[1]!.children[0]!)).not.toContain("text-align:center");
});
