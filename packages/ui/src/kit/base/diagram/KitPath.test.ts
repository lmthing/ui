import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it } from "vitest";
import { themeName } from "@lmthing/ui/catalog";
import { KitProvider, PartScope, KitPath, KitText } from "@lmthing/ui/kit";
import { config, elementAt } from "../../../../test/render";

function render(props: Parameters<typeof KitPath>[0]) {
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
          createElement(KitPath, props),
        ),
      ),
    ),
  );
}

const heading = createElement(KitText, { part: "title", children: "Skill" });
const nodes = [
  { id: "r1", label: "Done", content: heading, state: "done" },
  { id: "r2", label: "Current", content: heading, state: "current", target: { part: "open" } },
  {
    id: "r3",
    label: "Locked",
    content: heading,
    state: "locked",
    milestone: true,
    target: { item: "r4", part: "open" },
  },
  { id: "r5", label: "Static", content: heading, state: "locked", target: { part: null } },
] as const;

it("connects items, marks a current step, and disables locked targets", () => {
  const html = render({ nodes });
  expect(elementAt(html, "home/c1/r1/root").attributes).not.toContain('role="button"');
  expect(elementAt(html, "home/c1/r2/open").attributes).toContain('aria-current="step"');
  expect(elementAt(html, "home/c1/r4/open").attributes).toContain('aria-disabled="true"');
  expect(html).toContain('data-testid="home/c1/r4/title"');
  expect(html).toContain('data-testid="home/c1/r5/title"');
  expect(html).not.toContain("home/c1/r5/root");
  expect(html.match(/vector-effect="non-scaling-stroke"/g)).toHaveLength(nodes.length - 1);
});

it("keeps connector count in loading, and draws an unaddressed empty track", () => {
  const html = render({ nodes, loading: true });
  expect(html).toContain('aria-busy="true"');
  expect(html.match(/vector-effect="non-scaling-stroke"/g)).toHaveLength(nodes.length - 1);
  expect(html).not.toMatch(/home\/c1\/r\d|role="button"|Skill/);
  const empty = render({ nodes: [], part: null });
  expect(empty).toContain("<svg");
  expect(empty).not.toContain("data-testid=");
});
