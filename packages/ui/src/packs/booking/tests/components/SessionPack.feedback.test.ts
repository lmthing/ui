import { expect, it, vi } from "vitest";
import { components, readComponent, type ScreenLike } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderExample, renderInstance } from "../../../../../test/render";

const def = components.SessionPack;
const input = { ...def.examples[1]!, used: 9 };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

it("shows a post-redemption balance in the success preview without changing the wire input", () => {
  const { html, deviceData } = renderExample("SessionPack", input, "success", theme);
  const drawn = addressedElements(html);
  expect(drawn.get("home/c1/amount")?.text).toEqual(["0 of 10"]);
  expect(drawn.get("home/c1/feedback")?.text).toEqual(["Session redeemed"]);
  expect(drawn.has("home/c1/redeem")).toBe(false);
  expect(readComponent(def, input, "c1", "success", {}, undefined, deviceData).join("\n")).toContain(
    "0 of 10",
  );
  expect(
    addressedElements(renderInstance("SessionPack", input, "success", theme)).get("home/c1/amount")?.text,
  ).toEqual(["1 of 10"]);
});

it("offers the retry and renewal drawn below a recoverable error", () => {
  const drawn = addressedElements(renderInstance("SessionPack", input, "error", theme));
  expect(drawn.get("home/c1/feedback")?.text).toEqual(["Couldn’t redeem session"]);
  expect(drawn.get("home/c1/retry")?.attributes).toContain('role="button"');
  expect(drawn.get("home/c1/renew_error")?.attributes).toContain('role="button"');
  const read = (used: number) => readComponent(def, { ...input, used }, "c1", "error").join("\n");
  expect(read(9)).toContain("[c1/retry press]");
  expect(read(9)).toContain("[c1/renew_error press→renew !needs-service]");
  expect(read(10)).not.toContain("[c1/retry");
  expect(read(10)).toContain("[c1/renew_error");
});

it.each([
  [{ used: input.total }, "No credits left"],
  [{ expires: "2000-01-01" }, "This pack has expired"],
] as const)("keeps renewal available without offering a retry for %o", (overrides, feedback) => {
  const html = renderInstance("SessionPack", { ...input, ...overrides }, "error", theme);
  const drawn = addressedElements(html);
  expect(drawn.get("home/c1/feedback")?.text).toEqual([feedback]);
  expect(drawn.has("home/c1/retry")).toBe(false);
  expect(drawn.has("home/c1/renew_error")).toBe(true);
});

it("requires confirmation for a retry, updates the balance once, and leaves renewal available", () => {
  const onLink = vi.fn();
  const screen: ScreenLike = {
    id: "home",
    components: [{ ...input, id: "c1", c: "SessionPack", state: "error" }],
  };
  const ctl = createScreenController({ screen, defs: { SessionPack: def }, onLink });
  try {
    expect(ctl.press("c1/retry").ok).toBe(true);
    expect(ctl.confirmation).toBeDefined();
    expect(ctl.press("confirm/confirm").ok).toBe(true);
    expect(ctl.liveControls(def.meta, def.props.parse(input), "c1")).toMatchObject({
      remaining: 0,
      recovered: true,
    });
    expect(ctl.press("c1/retry").ok).toBe(false);
    expect(ctl.press("c1/renew_error").ok).toBe(true);
    expect(onLink).toHaveBeenCalledExactlyOnceWith("renew", "home/c1/renew_error");
  } finally {
    ctl.dispose();
  }
});
