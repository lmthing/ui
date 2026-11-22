import { describe, expect, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { hiringWordsFor } from "../../lang";

const { JobFeed } = components;
const { meta, props, examples, fallback, probes } = JobFeed;
const full = examples[0]!;
const first = full.jobs[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const prefix = "home/j1/r1";
const words = hiringWordsFor().jobFeed;
const parts = (input = full, state: StateName = "filled") =>
  addressedElements(renderInstance("JobFeed", input, state, theme, { component: "j1" }));

describe("JobFeed contract and bounds", () => {
  it("accepts both example structures and gates registry inclusion on pack readiness", () => {
    for (const example of examples) expect(props.safeParse(example).success).toBe(true);
    expect(createRegistry({ packs: ["hiring"] }).ids.includes(meta.id)).toBe(packReady("hiring"));
    expect(meta.partTiers).toEqual({ apply: "service" });
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "List" }));
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
    );
  });

  it("accepts six unique jobs and the exact text bounds", () => {
    const jobs = Array.from({ length: 6 }, (_, i) => ({
      ...first,
      jobId: `${i}${"x".repeat(31)}`,
      title: "x".repeat(32),
      employer: "x".repeat(32),
      place: "x".repeat(28),
    }));
    expect(props.safeParse({ jobs }).success).toBe(true);
    for (const invalid of [[], [...jobs, first], [first, first]]) {
      expect(props.safeParse({ jobs: invalid }).success).toBe(false);
    }
  });

  it.each([
    { title: "x".repeat(33) },
    { jobId: "x".repeat(33) },
    { employer: "x".repeat(33) },
    { place: "x".repeat(29) },
    { workplace: "field" },
    { posted: "2026-02-30" },
    { goto: "Not a destination" },
    { pay: { min: -1, max: 22, per: "hour" } },
    { pay: { min: 22, max: 18, per: "hour" } },
    { pay: { min: 18, max: Infinity, per: "hour" } },
    { pay: { min: 18, max: 22, per: "day" } },
    { pay: { min: 18, max: 22, per: "hour", currency: "EUR" } },
  ])("rejects invalid job data %j", (changes) =>
    expect(props.safeParse({ jobs: [{ ...first, ...changes }] }).success).toBe(false),
  );

  it("seeds from a cast and uses neutral placeholders with an empty cast", () => {
    const empty = { things: [], items: [] };
    const cast = {
      things: [{ type: "job", fields: ["name", "detail"] }],
      items: [{ id: "a", type: "job", sample: true, name: "Proofreader", detail: "Press" }],
    };
    expect(props.parse(fallback({ cast })).jobs[0]).toMatchObject({
      title: "Proofreader",
      employer: "Press",
    });
    expect(props.parse(fallback({ cast: empty })).jobs[0]).toMatchObject({
      title: placeholderTitle(0),
      easyApply: false,
      saved: false,
    });
  });
});

describe("JobFeed parts and states", () => {
  it("hides only location and posting age in brief", () => {
    const ready = parts();
    const brief = { ...full, detail: "brief" as const };
    expect([...parts(brief).keys()]).toEqual(
      [...ready.keys()].filter((key) => !/\/(posted|place)$/.test(key)),
    );
    for (const part of [
      "title",
      "employer",
      "place",
      "posted",
      "pay",
      "workplace",
      "easy_apply",
      "save",
      "apply",
    ]) {
      expect(ready.has(`${prefix}/${part}`)).toBe(true);
    }
    expect(ready.has("home/j1/r2/apply")).toBe(false);
    expect(ready.has("home/j1/r2/pay")).toBe(false);
    expect(parts(examples[1]).has(`${prefix}/card`)).toBe(true);
    expect(props.parse(brief).jobs[0]?.posted).toBe(first.posted);
    const read = readComponent(JobFeed, brief, "j1").join("\n");
    expect(read).not.toContain("North Park");
    expect(read).not.toContain("Posted");
    expect(read).toContain("$18–$22 / hr");
  });

  it("draws an inert shaped load, standalone empty and error, and inline bookmark feedback", () => {
    const loading = parts(full, "loading");
    for (const part of ["root", "title", "save", "apply"])
      expect(loading.has(`${prefix}/${part}`)).toBe(false);
    for (const state of ["empty", "error", "success"] as const) {
      const drawn = parts(full, state);
      expect(drawn.get(`home/j1/${state}`)?.text).toContain(words[state]);
      expect(drawn.has(`${prefix}/save`)).toBe(state === "success");
      expect(readComponent(JobFeed, full, "j1", state).join("\n").includes("[j1/r1/save")).toBe(
        state === "success",
      );
    }
  });
});

it("toggles only the addressed job and routes details separately from eligible external apply", () => {
  const onLink = vi.fn();
  const onAction = vi.fn();
  const current = createScreenController({
    screen: { id: "home", components: [{ ...full, id: "j1", c: "JobFeed" }] },
    defs: { JobFeed },
    onLink,
    onAction,
    currency: "GBP",
  });
  try {
    expect(current.read()).toContain("£18–£22 / hr");
    expect(current.read()).toContain("[j1/r1/save toggle:off]");
    expect(current.press("j1/r1/save").ok).toBe(true);
    expect(current.read()).toContain("[j1/r1/save toggle:on]");
    expect(current.read()).toContain("[j1/r2/save toggle:on]");
    expect(current.press("j1/r1/save").ok).toBe(true);
    expect(current.read()).toContain("[j1/r1/save toggle:off]");
    expect(current.press("j1/r2/apply").ok).toBe(false);
    expect(current.read()).toContain("[j1/r1/apply press !needs-service]");
    expect(current.press("j1/r1/apply").ok).toBe(true);
    expect(onAction).toHaveBeenLastCalledWith({ address: `${prefix}/apply`, action: "press" });
    expect(onLink).not.toHaveBeenCalled();
    expect(current.press("j1/r1/root").ok).toBe(true);
    expect(onLink).toHaveBeenCalledExactlyOnceWith(first.goto, prefix);
  } finally {
    current.dispose();
  }
});
