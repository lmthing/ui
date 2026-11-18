import { describe, expect, it } from "vitest";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import {
  component,
  presets,
  size,
  space,
  type as typography,
  type StateName,
  type ThemeChoice,
} from "../../../catalog";
import { KitAction, KitProvider, KitSkeleton, KitStrip, PartScope } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";
import { columnHeights } from "./skeleton-shapes";

describe("loading columns", () => {
  it("matches the supplied first filled plot, including its maximum", () => {
    expect(columnHeights([2, 4, 3, 5].map((value) => ({ value })))).toEqual([48, 96, 72, 120]);
  });
  it("keeps zero columns visible at every supported count", () => {
    for (let count = 2; count <= 7; count++) {
      expect(columnHeights(Array.from({ length: count }, () => ({ value: 0 })))).toEqual(
        Array.from({ length: count }, () => space.xs),
      );
    }
  });
  it("retains the plot cap for extreme finite values", () => {
    expect(columnHeights([{ value: Number.MAX_VALUE }, { value: Number.MAX_VALUE / 2 }])).toEqual([
      component.base.barsHeight,
      component.base.barsHeight / 2,
    ]);
  });
});
function renderBase(child: ReactElement, theme: ThemeChoice, state: StateName = "filled") {
  return renderToStaticMarkup(
    createElement(
      TamaguiProvider,
      { config },
      createElement(
        KitProvider,
        { theme, children: null },
        createElement(
          PartScope,
          { screen: "home", component: "c1", rev: 1, state, children: null },
          createElement("div", { "data-testid": "base" }, child),
        ),
      ),
    ),
  );
}

describe("role-sized skeleton text", () => {
  it.each(["label", "body", "display", "number"] as const)(
    "retains %s text geometry and alignment",
    (role) => {
      for (const numberScale of ["display", "compact"] as const) {
        for (const align of ["start", "center", "end"] as const) {
          const html = renderBase(
            createElement(KitSkeleton, {
              shape: "figure",
              inset: "none",
              content: [[role, "Caller content", align, numberScale]],
            }),
            { preset: "calm", mode: "dark", accent: "moss" },
          );
          const text = elementAt(html, "base").children[0]!.children[0]!.children[0]!.children[0]!;
          const scale = typography[role === "number" && numberScale === "compact" ? "body" : role];
          expect(styleAt(html, text)).toContain("max-width:100%");
          expect(styleAt(html, text)).toContain(
            `align-self:${align === "center" ? "center" : align === "end" ? "flex-end" : "flex-start"}`,
          );
          expect(styleAt(html, text.children[0]!)).toContain("opacity:0");
          expect(styleAt(html, text.children[0]!.children[0]!)).toContain(
            `line-height:${scale.lineHeight}px`,
          );
          expect(styleAt(html, text.children[1]!)).toContain(`height:${scale.size * 0.6}px`);
          expect(styleAt(html, text.children[1]!)).toContain("width:100%");
        }
      }
    },
  );
});
const actionCases = presets.flatMap(({ id: preset }) =>
  (["light", "dark"] as const).flatMap((mode) =>
    (["primary", "secondary", "quiet", "danger"] as const).map((kind) => ({ preset, mode, kind })),
  ),
);
describe("neutral control skeletons and themed disabled actions", () => {
  it.each(actionCases)("retains the $kind frame and caption in $preset/$mode", ({ preset, mode, kind }) => {
    for (const label of [undefined, "Caller action"]) {
      for (const full of [false, true]) {
        const theme = { preset, mode, accent: "moss" } as const;
        const props = { label, kind, full };
        const filled = renderBase(createElement(KitAction, props), theme);
        const loading = renderBase(createElement(KitAction, props), theme, "loading");
        const skeleton = renderBase(createElement(KitSkeleton, { shape: "control", ...props }), theme);
        const disabled = renderBase(createElement(KitAction, { ...props, disabled: true }), theme);
        const frame = elementAt(filled, "home/c1/root");
        const frameCss = styleAt(filled, frame);
        if (label) {
          const hidden = descendants(elementAt(loading, "base")).find((node) => node.tag === "span")!;
          expect(styleAt(loading, hidden)).toContain("var(--text)");
          expect(loading).not.toContain('data-testid="home/c1/root_label"');
        }
        for (const html of [loading, skeleton, disabled]) {
          const node = elementAt(html, "base").children[0]!;
          const css = styleAt(html, node);
          for (const property of [
            "min-height",
            "min-width",
            "padding-left",
            "border-top-left-radius",
            "align-self",
          ]) {
            const rule = new RegExp(`${property}:[^;]+`);
            expect(css.match(rule)?.[0]).toBe(frameCss.match(rule)?.[0]);
          }
          expect(css).not.toContain("opacity:0.5");
          if (html !== disabled) {
            if (html === skeleton) expectControlBar(html, node, kind);
            else expect(css).toContain(kind === "quiet" ? "transparent" : "var(--line)");
            if (kind === "quiet" && label)
              expect(descendants(node).some((child) => styleAt(html, child).includes("var(--line)"))).toBe(
                true,
              );
            expect(node.attributes).not.toContain('role="button"');
            expect(html).toContain('aria-busy="true"');
          }
        }
        const caption = label ? elementAt(disabled, "home/c1/root_label") : undefined;
        if (caption)
          expect(styleAt(disabled, caption)).toContain(
            `var(--${kind === "danger" ? "bad" : kind === "primary" ? "text" : "muted"})`,
          );
        expect(elementAt(disabled, "home/c1/root").attributes).toContain('aria-disabled="true"');
      }
    }
  });
});
describe("media-only skeleton and short strips", () => {
  it("does not mount content or a gap for an explicitly avatar-only skeleton", () => {
    const html = renderBase(
      createElement(KitSkeleton, {
        shape: "media",
        aspect: "avatar",
        lines: [],
        inset: "none",
      }),
      { preset: "calm", mode: "dark", accent: "moss" },
    );
    const node = elementAt(html, "base").children[0]!;
    expect(node.children).toHaveLength(1);
    expect(styleAt(html, node)).toContain("gap:0px");
    expect(styleAt(html, node.children[0]!)).toContain(`width:${size.avatar.lg}px`);
  });
  it.each([1, 2, 6])(
    "centres %s fitting cells with auto margins, without shrinking scrolling cells",
    (count) => {
      for (const pages of [false, true]) {
        const html = renderBase(
          createElement(KitStrip, {
            pages,
            children: Array.from({ length: count }, (_, index) =>
              createElement("span", { key: index }, "Caller item"),
            ),
          }),
          { preset: "calm", mode: "dark", accent: "moss" },
        );
        const nodes = descendants(elementAt(html, "base"));
        const group = nodes.find((node) => styleAt(html, node).includes("margin-left:auto"))!;
        expect(nodes.some((node) => styleAt(html, node).includes("flex-grow:1"))).toBe(true);
        expect(styleAt(html, group)).toContain("margin-left:auto");
        expect(styleAt(html, group)).toContain("margin-right:auto");
        expect(styleAt(html, group)).toContain("flex-shrink:0");
        expect(group.children).toHaveLength(count);
      }
    },
  );
});

function descendants(node: ReturnType<typeof elementAt>): ReturnType<typeof elementAt>[] {
  return [node, ...node.children.flatMap(descendants)];
}

function expectControlBar(html: string, node: ReturnType<typeof elementAt>, kind: string) {
  const css = styleAt(html, node);
  expect(css).toContain("background-color:transparent");
  const bars = descendants(node).slice(1);
  expect(bars.some((child) => styleAt(html, child).includes("var(--line)"))).toBe(true);
  if (kind === "quiet") return;
  const bar = node.children[0]!;
  expect(styleAt(html, bar)).toContain("position:absolute");
  for (const edge of ["top", "bottom", "left", "right"]) expect(styleAt(html, bar)).toContain(`${edge}:0px`);
  const radius = css.match(/border-top-left-radius:[^;]+/)![0];
  expect(styleAt(html, bar)).toContain(radius);
}
