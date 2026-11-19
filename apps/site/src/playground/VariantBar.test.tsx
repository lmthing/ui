import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { axesOf, VariantBar } from "./VariantBar";

const meta = {
  variants: { density: ["comfortable", "compact"], emphasis: ["normal", "hero"], arrange: ["rows", "grid"] },
  items: { variants: { tone: ["neutral", "good"] } },
};

describe("VariantBar", () => {
  it("lists the declared axes", () => {
    expect(axesOf(meta)).toEqual(["density", "emphasis", "arrange"]);
    expect(axesOf({})).toEqual([]);
  });
  it("draws one segmented control per axis, grouped by kind, with the current value checked", () => {
    const html = renderToStaticMarkup(
      <VariantBar meta={meta} props={{ emphasis: "hero" }} onChange={() => undefined} />,
    );
    expect(html).toContain("finish");
    expect(html).toContain("collection");
    expect(html).toMatch(/aria-checked="true"[^>]*>hero</);
    expect(html).toMatch(/aria-checked="true"[^>]*>comfortable</);
    expect(html).toContain("Item axes");
  });
  it("says so when a component declares none", () => {
    expect(renderToStaticMarkup(<VariantBar meta={{}} props={{}} onChange={() => undefined} />)).toContain(
      "No shared variant axes",
    );
  });
});
