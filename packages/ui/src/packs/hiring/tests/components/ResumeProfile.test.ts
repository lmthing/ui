import { describe, expect, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  wordsFor,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { hiringWordsFor } from "../../lang";

const { ResumeProfile } = components;
const { examples, fallback, meta, probes, props } = ResumeProfile;
const full = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const prefix = "home/r1/";
const words = hiringWordsFor().resumeProfile;
const markup = (input = full, state: StateName = "filled") =>
  renderInstance("ResumeProfile", input, state, theme, { component: "r1" });
const parts = (input = full, state: StateName = "filled") => addressedElements(markup(input, state));

const cast = { things: [], items: [] };
const valid = fallback({ cast });
const invalid: unknown[] = [
  { ...valid, unknown: "invalid" },
  { ...valid, name: "x".repeat(25) },
  { ...valid, headline: "x".repeat(61) },
  { ...valid, location: "x".repeat(29) },
  { ...valid, experience: Array.from({ length: 7 }, () => ({ role: "x", org: "x", start: "x" })) },
  { ...valid, education: Array.from({ length: 5 }, () => ({ credential: "x", school: "x" })) },
  { ...valid, skills: Array.from({ length: 13 }, () => "x") },
  { ...valid, cvLabel: "x".repeat(33) },
  { ...valid, detail: "not-a-choice!" },
];

it.each(examples)("accepts a résumé example", (example) => {
  expect(props.safeParse(example).success).toBe(true);
});

it.each(invalid)("rejects invalid input", (input) => {
  expect(props.safeParse(input).success).toBe(false);
});

it("validates the fallback for empty and populated casts", () => {
  expect(props.parse(fallback({ cast }))).toMatchObject({
    name: placeholderTitle(0),
    headline: wordsFor().placeholderDetail,
    openToWork: false,
    experience: [],
    education: [],
    skills: [],
  });
  const things = [{ type: "item", fields: ["name", "detail"] }];
  const items = [{ id: "one", type: "item", name: "Sample", detail: "Reviewer", sample: true }];
  expect(props.parse(fallback({ cast: { things, items } }))).toMatchObject({
    name: "Sample",
    headline: "Reviewer",
  });
});

it("declares its core near miss, probe shapes and service tier", () => {
  expect(probes.map(({ kind }) => kind)).toEqual(["choose", "choose", "write", "write", "read"]);
  expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Profile" }));
  expect(createRegistry({ packs: ["hiring"] }).ids.includes(meta.id)).toBe(packReady("hiring"));
  expect(meta.partTiers).toEqual({ share: "service" });
});

it("accepts every maximum length and rejects oversized nested fields", () => {
  const experience = {
    role: "x".repeat(32),
    org: "x".repeat(32),
    start: "x".repeat(10),
    end: "y".repeat(10),
    summary: "x".repeat(120),
  };
  const education = { credential: "x".repeat(36), school: "x".repeat(32), year: "x".repeat(8) };
  const input = {
    name: "x".repeat(24),
    headline: "x".repeat(60),
    location: "x".repeat(28),
    cvLabel: "x".repeat(32),
    openToWork: false,
    experience: Array(6).fill(experience),
    education: Array(4).fill(education),
    skills: Array(12).fill("x".repeat(20)),
  };
  expect(props.safeParse(input).success).toBe(true);
  for (const [key, row] of [
    ["experience", experience],
    ["education", education],
  ] as const) {
    for (const [field, value] of Object.entries(row))
      expect(props.safeParse({ ...input, [key]: [{ ...row, [field]: `${value}x` }] }).success).toBe(false);
  }
  expect(props.safeParse({ ...input, skills: ["x".repeat(21)] }).success).toBe(false);
  expect(props.safeParse({ ...input, editGoto: "Not a screen" }).success).toBe(false);
});

describe("ResumeProfile parts and states", () => {
  it("draws the full résumé and only removes declared parts in brief", () => {
    const filled = parts();
    const finishes = { ...full, surface: "outlined" as const, density: "compact" as const };
    expect([...parts(finishes).keys()]).toEqual([...filled.keys()]);
    const input = { ...full, experience: [...full.experience].reverse(), detail: "brief" as const };
    const brief = parts(input);
    const hidden = new Set<string>(meta.variantParts["detail.brief"].hides);
    expect([...brief.keys()]).toEqual(
      [...filled.keys()].filter((address) => !hidden.has(address.slice(prefix.length))),
    );
    expect(brief.get(`${prefix}experience_1`)?.text).toEqual(["Dog walker"]);
    expect(props.parse(input).experience).toHaveLength(2);
    const read = readComponent(ResumeProfile, input, "r1").join("\n");
    for (const value of [
      "Shelter volunteer",
      "North College",
      "Animal welfare",
      "North Park",
      "Sam Patel CV",
    ])
      expect(read).not.toContain(value);
    for (const value of ["Dog walker", "Group handling", "Trot", "Edit profile"])
      expect(read).toContain(value);
  });

  it("shows inert shaped loading and standalone or inline state feedback as declared", () => {
    const loading = markup(full, "loading");
    expect(loading).toContain('aria-busy="true"');
    expect(loading).not.toMatch(/role="(switch|button|link)"/);
    for (const state of ["empty", "success", "error"] as const) {
      const drawn = parts(full, state);
      expect(drawn.get(`${prefix}${state}`)?.text).toContain(words[state]);
      expect(drawn.has(`${prefix}open`)).toBe(state === "success");
      const read = readComponent(ResumeProfile, full, "r1", state).join("\n");
      expect(read.includes("[r1/open")).toBe(state === "success");
    }
  });
});

const mount = (input: typeof full) => {
  const onAction = vi.fn();
  const onLink = vi.fn();
  const controller = createScreenController({
    screen: { id: "home", components: [{ ...input, id: "r1", c: "ResumeProfile" }] },
    defs: { ResumeProfile },
    onAction,
    onLink,
  });
  return { controller, onAction, onLink };
};

it("changes availability locally and routes editing, CV preview and sharing to separate targets", () => {
  const { controller, onAction, onLink } = mount(full);
  try {
    expect(controller.read()).toContain("[r1/open toggle:on]");
    expect(controller.press("r1/open").ok).toBe(true);
    expect(controller.read()).toContain("[r1/open toggle:off]");
    expect(controller.read()).toContain(words.notOpen);
    expect(controller.press("r1/open").ok).toBe(true);
    expect(controller.read()).toContain("[r1/open toggle:on]");
    expect(controller.read()).toContain("[r1/edit press→resume_edit]");
    expect(controller.press("r1/edit").ok).toBe(true);
    expect(onLink).toHaveBeenCalledExactlyOnceWith("resume_edit", `${prefix}edit`);
    expect(controller.press("r1/cv").ok).toBe(true);
    expect(onAction).toHaveBeenLastCalledWith({ address: `${prefix}cv`, action: "press" });
    expect(controller.read()).toContain("[r1/share press !needs-service]");
    expect(controller.press("r1/share").ok).toBe(true);
    expect(onAction).toHaveBeenLastCalledWith({ address: `${prefix}share`, action: "press" });
    expect(onLink).toHaveBeenCalledTimes(1);
  } finally {
    controller.dispose();
  }
});

it.each([
  [{ ...valid, detail: "brief" as const }, ["edit", "cv", "share"]],
  [valid, ["edit", "cv"]],
  [{ ...full, detail: "brief" as const }, ["cv", "share"]],
] as const)("does not offer hidden or missing actions", (input, hidden) => {
  const { controller } = mount(input);
  try {
    for (const part of hidden) {
      expect(parts(input).has(`${prefix}${part}`)).toBe(false);
      expect(controller.read()).not.toContain(`[r1/${part} `);
      expect(controller.press(`r1/${part}`).ok).toBe(false);
    }
    expect(controller.press("r1/open").ok).toBe(true);
  } finally {
    controller.dispose();
  }
});
