import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it } from "vitest";
import { presets, themeName } from "@lmthing/ui/catalog";
import { KitCheck, KitInput, KitProvider, KitSetRow, KitText, PartScope } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

const input = {
  item: "r1",
  label: "Set 1",
  fields: ["count", "weight"].map((id) => ({
    id,
    label: id,
    control: createElement(KitInput, { part: id, hint: id, kind: "number", value: "12", compact: true }),
  })),
  done: createElement(KitCheck, { done: false, part: "done" }),
  detail: createElement(KitText, { part: "detail", role: "caption", children: "00:30" }),
};
function render(props: Parameters<typeof KitSetRow>[0], preset = "calm", mode = "light") {
  const theme = { preset, mode, accent: "moss" } as Parameters<typeof KitProvider>[0]["theme"];
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
          createElement(KitSetRow, props),
        ),
      ),
    ),
  );
}
describe("KitSetRow", () => {
  it.each(presets)("addresses the caller's set fields, labels and completion in $id", ({ id }) => {
    for (const mode of ["light", "dark"]) {
      const html = render(input, id, mode);
      expect(elementAt(html, "home/c1/r1/root").children).toHaveLength(3);
      for (const part of ["label", "count_label", "weight_label", "count", "weight", "done", "detail"])
        expect(html.match(new RegExp(`data-testid="home/c1/r1/${part}"`, "g"))).toHaveLength(1);
      expect(elementAt(html, "home/c1/r1/done").attributes).toContain('role="checkbox"');
      expect(styleAt(html, elementAt(html, "home/c1/r1/root").children[1]!)).toContain("flex-wrap:wrap");
    }
  });
  it("supports no fields, omitted detail, completed and disabled caller controls", () => {
    const empty = render({ ...input, fields: [], detail: null, done: null });
    expect(elementAt(empty, "home/c1/r1/root").children).toHaveLength(1);
    const html = render({
      ...input,
      done: createElement(KitCheck, { done: true, disabled: true, part: "done" }),
    });
    expect(elementAt(html, "home/c1/r1/done").attributes).toContain('aria-checked="true"');
    expect(elementAt(html, "home/c1/r1/done").attributes).toContain('aria-disabled="true"');
    expect(render({ ...input, part: "set" })).toContain('data-testid="home/c1/r1/set"');
  });
  it("indexes the label address or leaves visible text unaddressed", () => {
    const indexed = render({ ...input, part: "set_1", labelPart: "label_1" });
    expect(indexed).toContain('data-testid="home/c1/r1/set_1"');
    expect(indexed).toContain('data-testid="home/c1/r1/label_1"');
    expect(indexed).not.toContain('data-testid="home/c1/r1/label"');
    const unaddressed = render({ ...input, labelPart: null });
    expect(unaddressed).toContain("Set 1");
    expect(unaddressed).not.toContain('data-testid="home/c1/r1/label');
    expect(render({ ...input, loading: true, labelPart: "label_1" })).not.toContain(
      'data-testid="home/c1/r1/label_1"',
    );
  });
  it("retains field and optional detail geometry in inert loading slots", () => {
    const html = render({ ...input, loading: true });
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('inert=""');
    expect(styleAt(html, "home/c1/r1/count")).toContain("opacity:0");
    expect(elementAt(html, "home/c1/r1/root").children).toHaveLength(3);
    expect(html).not.toContain('data-testid="home/c1/r1/count_label"');
  });
});
