import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it, vi } from "vitest";
import { component, themeName } from "@lmthing/ui/catalog";
import {
  createScreenController,
  KitProvider,
  KitSignaturePad,
  PartScope,
  PrivateMarkContext,
  type PrivateMarkAdapter,
} from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

const input = { label: "Draw your mark", part: "frame", target: { item: "r2", part: "pad" } };
const target = "home/c1/r2/pad";
const reference = "private-local-reference";
const adapter = {
  resolve: vi.fn((address, ref) =>
    address === target && ref === reference ? createElement("span", null, "Synthetic mark") : undefined,
  ),
  Surface: ({ children }: { children: ReactNode }) => createElement("div", { "data-surface": "" }, children),
} satisfies PrivateMarkAdapter;

function render(
  props: Parameters<typeof KitSignaturePad>[0],
  value?: PrivateMarkAdapter,
  interactive = true,
) {
  const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
  const controller = createScreenController({ defs: {}, screen: { id: "home", components: [] } });
  const draw = createElement(PrivateMarkContext.Provider, { value }, createElement(KitSignaturePad, props));
  const scope = createElement(PartScope, {
    screen: "home",
    component: "c1",
    rev: 1,
    state: "filled",
    children: draw,
  });
  const kit = createElement(KitProvider, { theme, controller, interactive, children: scope });
  const html = renderToStaticMarkup(
    createElement(TamaguiProvider, { config, defaultTheme: themeName(theme) }, kit),
  );
  controller.dispose();
  return html;
}

it("addresses the frame and the named item pad; only a trusted host supplies the mark", () => {
  expect(elementAt(render(input, adapter), target).attributes).toContain(`data-testid="${target}"`);
  const html = render({ ...input, mark: reference }, adapter);
  expect(html).toContain("Synthetic mark");
  expect(html).toContain("data-surface");
  expect(html).not.toContain(reference);
  expect(adapter.resolve).toHaveBeenLastCalledWith(target, reference);
  expect(elementAt(html, "home/c1/frame")).toBeDefined();
  const sameAddress = render({ label: input.label, target: { part: "root" } }, adapter);
  expect(sameAddress.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
});

it("does not mount capture for disabled, preview-only, loading or unresolved states", () => {
  const saved = render({ ...input, mark: reference, disabled: true }, adapter);
  expect(saved).toContain("Synthetic mark");
  expect(elementAt(saved, target).attributes).toContain('aria-disabled="true"');
  const missing = render({ ...input, mark: reference });
  const unowned = render({ ...input, mark: "other" }, adapter);
  const loading = render({ ...input, mark: reference, loading: true }, adapter);
  const preview = render({ ...input, mark: reference }, adapter, false);
  for (const html of [saved, missing, unowned, loading, preview]) expect(html).not.toContain("data-surface");
  for (const html of [missing, unowned, loading]) expect(html).not.toContain("Synthetic mark");
  expect(loading).not.toContain(target);
  expect(elementAt(loading, "home/c1/frame").attributes).toContain('aria-busy="true"');
});

it("reserves the same surface height in blank and loading states without resolving marks during loading", () => {
  const blank = render(input);
  const populated = render({ ...input, mark: reference }, adapter);
  adapter.resolve.mockClear();
  const loading = render({ ...input, mark: reference, loading: true }, adapter);
  expect(adapter.resolve).not.toHaveBeenCalled();
  for (const html of [blank, populated, loading]) {
    const drawing = elementAt(html, html.includes(`data-testid="${target}"`) ? target : "home/c1/frame");
    const footprint = (element: typeof drawing): boolean =>
      styleAt(html, element).includes(`min-height:${component.base.ringLg}px`) ||
      element.children.some(footprint);
    expect(footprint(drawing)).toBe(true);
  }
});
