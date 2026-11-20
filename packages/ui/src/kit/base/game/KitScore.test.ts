import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it } from "vitest";
import { size, themeName, type as typography } from "@lmthing/ui/catalog";
import { KitAction, KitProvider, KitScore, KitText, PartScope } from "@lmthing/ui/kit";
import { addressedElements, config, elementAt, styleAt } from "../../../../test/render";

type Props = Parameters<typeof KitScore>[0];
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
function render(props: Props) {
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
          createElement(KitScore, props),
        ),
      ),
    ),
  );
}

const center = createElement(KitText, { role: "label", part: "clock", children: "12:35" });
const sides = [
  {
    label: "North Shore",
    value: "0",
    controls: [
      createElement(KitAction, {
        key: "from",
        part: "home_less",
        icon: "minus",
        a11y: "Take a point from North Shore",
        action: "decrement",
      }),
      createElement(KitAction, {
        key: "to",
        part: "home_more",
        icon: "plus",
        a11y: "Give a point to North Shore",
        action: "increment",
      }),
    ],
  },
  {
    label: "Riverside",
    value: "120",
    controls: createElement(KitAction, {
      part: "away_more",
      icon: "plus",
      a11y: "Give a point to Riverside",
      action: "increment",
    }),
  },
] as const;

describe("KitScore filled and empty", () => {
  it("draws aligned caller scores and center at the requested root, without invented item parts", () => {
    const html = render({ part: "score", sides, center });
    const layout = elementAt(html, "home/c1/score").children[0]!.children[0]!;
    const [left, middle, right] = layout.children;
    for (const side of [left!, right!]) {
      const value = side.children[0]!;
      expect(styleAt(html, value)).toContain(`font-size:${typography.number.size}px`);
      expect(styleAt(html, value)).toContain("tabular-nums");
    }
    expect(middle!.children).toEqual([elementAt(html, "home/c1/clock")]);
    for (const value of [">0<", ">120<", "North Shore", "Riverside", "12:35"]) expect(html).toContain(value);
    expect([...addressedElements(html).keys()]).toEqual(["home/c1/score", "home/c1/clock"]);
  });

  it("keeps caller-owned control parts only in keeper mode and under their respective sides", () => {
    const html = render({ sides, center, style: "keeper" });
    const controls = elementAt(html, "home/c1/root").children[1]!.children;
    expect(controls[0]!.children).toEqual([
      elementAt(html, "home/c1/home_less"),
      elementAt(html, "home/c1/home_more"),
    ]);
    expect(controls[1]!.children).toEqual([elementAt(html, "home/c1/away_more")]);
    expect(elementAt(html, "home/c1/away_more").attributes).toContain('role="button"');
  });

  it("draws no-match empty state, and keeps an unscored match's labels and supplied status", () => {
    const blank = { label: "", value: "" };
    const empty = render({ sides: [blank, blank], center: null });
    expect(empty).toContain("<svg");
    expect(elementAt(empty, "home/c1/root").children[0]!.children).toHaveLength(1);
    const upcoming = render({
      sides: [
        { ...blank, label: "North Shore" },
        { ...blank, label: "Riverside" },
      ],
      center: "Upcoming",
    });
    expect(upcoming).toContain("Upcoming");
    expect(upcoming).toContain("North Shore");
    expect(upcoming).not.toContain(">0<");
  });
});

describe("KitScore loading", () => {
  it.each(["display", "keeper"] as const)(
    "keeps %s geometry in loading and does not mount caller content",
    (style) => {
      const filled = render({ sides, center, style });
      const html = render({ sides, center, style, loading: true });
      const root = elementAt(html, "home/c1/root");
      expect(root.attributes).toContain('aria-busy="true"');
      expect([...addressedElements(html).keys()]).toEqual(["home/c1/root"]);
      expect(html).not.toMatch(/12:35|role="button"/);
      expect(root.children).toHaveLength(elementAt(filled, "home/c1/root").children.length);
      const [values, labels] = root.children[0]!.children;
      expect(labels!.children[0]!.children[0]!.attributes).toContain('aria-hidden="true"');
      expect(styleAt(html, values!.children[1]!)).toContain(`width:${size.avatar.lg}px`);
      expect(styleAt(html, labels!.children[1]!)).toBe(styleAt(html, labels!.children[0]!));
      if (style === "keeper") {
        const [group, away] = root.children[1]!.children;
        expect(group!.children).toHaveLength(2);
        expect(away!.children).toHaveLength(1);
        expect(styleAt(html, group!)).toContain(`min-height:${size.control.md}px`);
        expect(styleAt(html, group!.children[0]!)).toContain(`width:${size.control.md}px`);
        expect(group!.children.every((slot) => slot.children.length === 0)).toBe(true);
      }
    },
  );
});
