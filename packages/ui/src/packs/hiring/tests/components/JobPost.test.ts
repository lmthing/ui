import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  themeName,
  wordsFor,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController, KitProvider, renderers, Screen } from "@lmthing/ui/kit";
import { addressedElements, config, renderInstance } from "../../../../../test/render";

const { JobPost } = components;
const { props, meta, examples, fallback, probes } = JobPost;
const full: ReturnType<typeof fallback> = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const parts = (input = full, state: StateName = "filled") =>
  addressedElements(renderInstance("JobPost", input, state, theme, { component: "j1" }));
const read = (input = full, state: StateName = "filled") =>
  readComponent(JobPost, input, "j1", state).join("\n");
const controller = (input = full, options?: Partial<Parameters<typeof createScreenController>[0]>) =>
  createScreenController({
    screen: { id: "home", components: [{ ...input, id: "j1", c: "JobPost" }] },
    defs: { JobPost },
    ...options,
  });

describe("JobPost contract", () => {
  it.each(examples)("parses a hiring example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("preserves its pack gate, service tier, and core near miss", () => {
    expect(createRegistry({ packs: ["hiring"] }).ids.includes(meta.id)).toBe(packReady("hiring"));
    expect(meta.tier).toBe("phone");
    expect(meta.partTiers).toEqual({ publish: "service" });
    expect(meta.pick).toContain("Card");
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "JobPost" }),
        expect.objectContaining({ kind: "choose", expect: "Card" }),
        expect.objectContaining({ kind: "write", expect: "JobPost" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "j1/save", action: "toggle" } }),
      ]),
    );
  });
});

describe("JobPost bounds and fallback", () => {
  it("accepts the exact text and requirement limits", () => {
    const atLimit = "x".repeat(32);
    expect(
      props.safeParse({
        ...full,
        title: atLimit,
        employer: atLimit,
        jobId: atLimit,
        place: "x".repeat(36),
        about: "x".repeat(400),
        requirements: Array(6).fill("x".repeat(80)),
      }).success,
    ).toBe(true);
  });
  it.each([
    { title: "x".repeat(33) },
    { about: "x".repeat(401) },
    { requirements: [] },
    { requirements: Array(7).fill("Sample") },
    { requirements: ["x".repeat(81)] },
    { contract: "salary" },
    { closes: "2027-02-29" },
    { goto: "Not a screen" },
    { pay: { min: -1, max: 10, per: "hour" } },
    { pay: { min: 19, max: 18, per: "hour" } },
    { pay: { min: 0, max: Infinity, per: "hour" } },
    { pay: { min: 0, max: 2, per: "week" } },
    { pay: { min: 18, max: 20, per: "hour", currency: "EUR" } },
    { acceptingApplications: true },
    { color: "green" },
  ])("rejects invalid input %j", (changes) =>
    expect(props.safeParse({ ...full, ...changes }).success).toBe(false),
  );
  it("uses the cast and neutral placeholders with no usable content", () => {
    const things = [{ type: "record", fields: ["first", "second"] }];
    for (const values of [{ first: "Opening", second: "Local details" }, { first: 5 }, undefined]) {
      const items = values ? [{ id: "a", type: "record", sample: true, ...values }] : [];
      const input = props.parse(fallback({ cast: { things, items }, lang: "en-GB" }));
      const detail = values?.second ?? wordsFor("en-GB").placeholderDetail;
      expect(input).toMatchObject({
        title: typeof values?.first === "string" ? values.first : placeholderTitle(0, "en-GB"),
        employer: detail,
        about: detail,
        requirements: [detail],
        saved: false,
      });
    }
  });
});

describe("JobPost states, parts and reading", () => {
  it("keeps finish addresses and only hides the description in brief view and reading", () => {
    const drawn = parts();
    expect([...drawn.keys()]).toEqual(
      meta.parts.filter((part) => part !== "success" && part !== "error").map((part) => `home/j1/${part}`),
    );
    expect([...parts({ ...full, surface: "outlined", density: "compact" }).keys()]).toEqual([
      ...drawn.keys(),
    ]);
    const brief = { ...full, detail: "brief" as const };
    expect(props.parse(brief).about).toBe(full.about);
    expect([...parts(brief).keys()]).toEqual(
      [...drawn.keys()].filter((address) => address !== "home/j1/about"),
    );
    expect(read(brief)).not.toContain(full.about);
    for (const requirement of full.requirements) expect(read(brief)).toContain(requirement);
  });
  it.each(["loading", "success", "error"] as const)("has no controls in %s", (state) => {
    const drawn = parts(full, state);
    expect([...drawn.keys()]).toEqual(["home/j1/root", `home/j1/${state === "loading" ? "save" : state}`]);
    expect(drawn.get("home/j1/save")?.attributes ?? "").not.toContain('role="switch"');
    expect(read(full, state)).not.toContain("[j1/");
  });
  it("omits absent optional fields without removing the application action", () => {
    const input = { ...full, place: undefined, pay: undefined, closes: undefined };
    const drawn = parts(input);
    for (const part of ["place", "pay", "closes"]) expect(drawn.has(`home/j1/${part}`)).toBe(false);
    expect(drawn.has("home/j1/apply")).toBe(true);
    expect(read(input)).toContain("[j1/apply press→apply]");
  });
  it("uses the same non-default host currency on screen and in the controller read", () => {
    const lang = "en-GB",
      currency = "GBP",
      current = controller(full, { lang, currency, interactive: false });
    try {
      const body = createElement(KitProvider, {
        theme,
        lang,
        controller: current,
        children: createElement(Screen, { controller: current, renderers }),
      });
      const html = renderToStaticMarkup(
        createElement(TamaguiProvider, { config, defaultTheme: themeName(theme) }, body),
      );
      expect(addressedElements(html).get("home/j1/pay")?.text).toEqual(["£18–£22 / hr"]);
      expect(current.read()).toContain("£18–£22 / hr");
    } finally {
      current.dispose();
    }
  });
});

describe("JobPost actions", () => {
  it("toggles an initially saved job off and back on without navigating", () => {
    const input = { ...full, saved: true };
    expect(parts(input).get("home/j1/save")?.attributes).toContain('aria-checked="true"');
    const onLink = vi.fn(),
      current = controller(input, { onLink });
    try {
      expect(current.read()).toContain("[j1/save toggle:on]");
      expect(current.press("j1/save").ok).toBe(true);
      expect(current.read()).toContain("[j1/save toggle:off]");
      expect(current.press("j1/save").ok).toBe(true);
      expect(current.read()).toContain("[j1/save toggle:on]");
      expect(onLink).not.toHaveBeenCalled();
    } finally {
      current.dispose();
    }
  });
  it("offers Apply through the closing day, then only saves or publishes", () => {
    vi.useFakeTimers();
    const onLink = vi.fn(),
      onAction = vi.fn();
    const current = controller(full, { onLink, onAction });
    try {
      vi.setSystemTime(new Date(2027, 3, 30, 23, 59, 59, 999));
      expect(parts().has("home/j1/apply")).toBe(true);
      expect(current.read()).toContain("[j1/apply press→apply]");
      expect(current.press("j1/apply").ok).toBe(true);
      expect(onLink).toHaveBeenCalledExactlyOnceWith("apply", "home/j1/apply");
      vi.setSystemTime(new Date(2027, 4, 1));
      expect(parts().has("home/j1/apply")).toBe(false);
      expect(current.read()).toContain("Applications closed");
      expect(current.read()).not.toContain("[j1/apply ");
      expect(current.press("j1/apply").ok).toBe(false);
      expect(current.press("j1/save").ok).toBe(true);
      expect(current.read()).toContain("[j1/publish press !needs-service]");
      expect(current.press("j1/publish").ok).toBe(true);
      expect(onLink).toHaveBeenCalledTimes(1);
      expect(onAction).toHaveBeenLastCalledWith({ address: "home/j1/publish", action: "press" });
    } finally {
      current.dispose();
      vi.useRealTimers();
    }
  });
});
