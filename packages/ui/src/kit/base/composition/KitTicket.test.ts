import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it } from "vitest";
import { component, space, themeName } from "@lmthing/ui/catalog";
import { KitProvider, PartScope, KitTicket, KitCode, KitText, KitCard } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

function render(props: Parameters<typeof KitTicket>[0], preset: "calm" | "editorial" = "calm") {
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
          createElement(KitCard, { part: "frame", children: createElement(KitTicket, props) }),
        ),
      ),
    ),
  );
}

const input = {
  children: createElement(KitText, { part: "summary", children: "Gate A12" }),
  code: createElement(KitCode, { part: "code", label: "Scan ticket", value: "P42" }),
  label: "Open ticket",
};

it("draws separate body and code addresses and supports card/pass and used treatment", () => {
  const html = render({ ...input, style: "pass", used: true, target: { item: "r3", part: "open" } });
  expect(elementAt(html, "home/c1/r3/open").attributes).toContain('role="button"');
  expect(html).toContain('data-testid="home/c1/r3/summary"');
  expect(html).toContain('data-testid="home/c1/code"');
  const pass = styleAt(html, "home/c1/r3/open");
  const card = render({ ...input, target: { part: "open" } });
  expect(pass).not.toBe(styleAt(card, "home/c1/open"));
  expect(styleAt(html, elementAt(html, "home/c1/root").children[0]!)).not.toBe(
    styleAt(card, elementAt(card, "home/c1/root").children[0]!),
  );
});

it("uses the shared card corner and lets the perforation cover the outer hairline", () => {
  const html = render({ ...input, style: "pass" }, "editorial");
  const root = elementAt(html, "home/c1/root");
  const frame = styleAt(html, root);
  const corner = frame.match(/border-top-left-radius:[^;]+/)?.[0];
  expect(corner).toBeDefined();
  expect(styleAt(html, "home/c1/frame")).toContain(corner!);
  expect(frame).not.toContain("overflow:hidden");
  const [notch] = root.children[0]!.children[1]!.children;
  expect(styleAt(html, notch!)).toContain(
    `left:${-(space.md + space.xs) / 2 - component.base.borderWidth}px`,
  );
});

it("draws empty without a code stub; loading keeps the supplied stub but not its contents or targets", () => {
  const empty = render({ children: null, label: input.label, part: null, target: { part: null } });
  expect(empty).toContain("<svg");
  expect(empty).not.toContain('role="button"');
  expect(empty.match(/data-testid="[^"]+"/g)).toEqual(['data-testid="home/c1/frame"']);
  const loading = render({ ...input, loading: true, target: { part: "open" } });
  expect(loading).toContain('aria-busy="true"');
  expect(loading).not.toMatch(/role="button"|\/(open|summary|code)"/);
  const filledCodeFrame = styleAt(render(input), "home/c1/code");
  expect(styleAt(loading, elementAt(loading, "home/c1/root").children[0]!.children[2]!.children[0]!)).toBe(
    filledCodeFrame,
  );
});
