import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  partTierAt,
  placeholderTitle,
  planAct,
  readScreen,
  stampItemIds,
  themeName,
  type StateName,
} from "@lmthing/ui/catalog";
import { KitProvider, PartScope } from "@lmthing/ui/kit";
import { addressedElements, config } from "../../../../../test/render";
import { CannedReplies } from "../../components";
import { allReplyCategories } from "../../copy";

const def = components.CannedReplies;
const thread = components.RequestThread;
const [example, brief] = def.examples;
const [first, second] = example!.templates;
const page = (input = example!, state: StateName = "filled") => ({
  id: "home",
  components: [
    { ...input, id: "replies", c: "CannedReplies", state },
    { id: "thread", c: "RequestThread", number: "LG-41", entries: [], draft: "Old draft" },
  ],
});
const defs = { CannedReplies: def, RequestThread: thread };
const typeableThread = {
  ...thread,
  meta: { ...thread.meta, partTiers: { ...thread.meta.partTiers, field: "phone" as const } },
};
const select = (value: string) => ({ address: "replies/category", action: "select", value });
const preview = (item: string) => ({ address: `replies/${item}`, action: "press" });
const insert = (item: string) => ({ address: `replies/${item}/insert`, action: "press" });
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

function draw(input = example!, state: StateName = "filled") {
  const props = stampItemIds(def.meta, def.props.parse(input)) as Parameters<
    typeof CannedReplies.CannedReplies
  >[0];
  const content = createElement(CannedReplies.CannedReplies, props);
  const scope = createElement(PartScope, {
    screen: "home",
    component: "replies",
    rev: 1,
    state,
    children: content,
  });
  const kit = createElement(KitProvider, { theme, interactive: false, children: scope });
  return renderToStaticMarkup(
    createElement(TamaguiProvider, { config, defaultTheme: themeName(theme) }, kit),
  );
}

describe("CannedReplies contract", () => {
  it.each(def.examples)("accepts a domain example", (input) => {
    expect(def.props.safeParse(input).success).toBe(true);
  });
  it("uses all twelve template slots but does not add a live component until its pack is ready", () => {
    expect(def.props.safeParse({ ...example, templates: Array(12).fill(first) }).success).toBe(true);
    expect(createRegistry({ packs: ["requests"] }).ids.includes(def.meta.id)).toBe(packReady("requests"));
  });
  it.each([
    { categories: Array(6).fill("Diagnosis") },
    { categories: ["Diagnosis", "Diagnosis"] },
    { categories: [allReplyCategories()] },
    { categories: ["x".repeat(17)] },
    { activeCategory: "Missing" },
    { categories: [] },
    { templates: [] },
    { templates: Array(13).fill(first) },
    { templates: [{ ...first, title: "x".repeat(29) }] },
    { templates: [{ ...first, body: "x".repeat(241) }] },
    { templates: [{ ...first, id: "r2" }] },
    { detail: "compact" },
    { preview: "r1" },
  ])("rejects invalid or calculated input %j", (change) => {
    expect(def.props.safeParse({ ...example, ...change }).success).toBe(false);
  });
  it("uses cast text and neutral fallback words", () => {
    const cast = {
      things: [{ type: "reply", fields: ["title"] }],
      items: [{ id: "r", type: "reply", title: "Confirm the visit", sample: true }],
    };
    expect(def.props.parse(def.fallback({ cast })).templates[0]?.title).toBe("Confirm the visit");
    expect(def.props.parse(def.fallback({ cast: { things: [], items: [] } })).templates[0]?.title).toBe(
      placeholderTitle(0),
    );
  });
});

describe("CannedReplies read and act", () => {
  it("filters locally and resets to All without renumbering templates", () => {
    const scene = page();
    const result = planAct(scene, defs, {}, [select("Update")]);
    if (!result.ok) throw new Error(result.code);
    const filtered = readScreen(scene, defs, result.values);
    expect(filtered).not.toContain(first!.title);
    expect(filtered).toContain(`r2 "${second!.title}" [replies/r2 press]`);
    expect(planAct(scene, defs, result.values, [preview("r1")]).ok).toBe(false);
    const reset = planAct(scene, defs, result.values, [select(allReplyCategories())]);
    if (!reset.ok) throw new Error(reset.code);
    expect(readScreen(scene, defs, reset.values)).toContain(first!.title);
  });
  it("previews and closes exact full text, without editing the reply draft", () => {
    const scene = page();
    expect(readScreen(scene, defs)).not.toContain(first!.body);
    const opened = planAct(scene, defs, {}, [preview("r1")]);
    if (!opened.ok) throw new Error(opened.code);
    expect(readScreen(scene, defs, opened.values)).toContain(first!.body);
    expect(opened.values["home/thread/$type/field"]).toBeUndefined();
    const closed = planAct(scene, defs, opened.values, [preview("r1")]);
    if (!closed.ok) throw new Error(closed.code);
    expect(readScreen(scene, defs, closed.values)).not.toContain(first!.body);
    expect(readScreen(page(brief), defs)).not.toContain("collect the spare key");
  });
  it.each(["empty", "loading"] as const)("withholds all actions while %s", (state) => {
    const scene = page(example, state);
    expect(planAct(scene, defs, {}, [select("Update")]).ok).toBe(false);
    expect(planAct(scene, defs, {}, [preview("r1")]).ok).toBe(false);
    expect(planAct(scene, defs, {}, [insert("r1")]).ok).toBe(false);
  });
  it("does not bypass a people-tier draft field and honors RequestThread's declared tier", () => {
    const peopleThread = {
      ...thread,
      meta: { ...thread.meta, partTiers: { ...thread.meta.partTiers, field: "people" as const } },
    };
    const people = { ...defs, RequestThread: peopleThread };
    expect(readScreen(page(), people)).not.toContain("replies/r1/insert");
    expect(planAct(page(), people, {}, [insert("r1")]).ok).toBe(false);
    expect(planAct(page(), defs, {}, [insert("r1")]).ok).toBe(
      partTierAt(thread.meta, {}, "field") === "phone",
    );
  });
  it("writes the full draft without sending when the host exposes a phone-tier draft field", () => {
    const future = { ...defs, RequestThread: typeableThread };
    const scene = page();
    const result = planAct(scene, future, {}, [insert("r1")]);
    if (!result.ok) throw new Error(result.code);
    expect(result.values["home/thread/$type/field"]).toBe(first!.body);
    expect(result.changed).toEqual([`thread/field type = ${JSON.stringify(first!.body)}`]);
    expect(result.links).toEqual([]);
    expect(scene.components[1]).toMatchObject({ draft: "Old draft", entries: [] });
    expect(planAct({ ...scene, components: [scene.components[0]!] }, future, {}, [insert("r1")]).ok).toBe(
      false,
    );
  });
});

describe("CannedReplies draft view", () => {
  it("stamps the category, preview and insert parts and hides snippets in compact mode", () => {
    const full = addressedElements(draw());
    for (const part of ["category", "r1/root", "r1/title", "r1/snippet", "r1/insert"])
      expect(full.has(`home/replies/${part}`)).toBe(true);
    const compact = addressedElements(draw(brief));
    expect(compact.has("home/replies/r1/title")).toBe(true);
    expect(compact.has("home/replies/r1/snippet")).toBe(false);
    expect(compact.has("home/replies/r3/root")).toBe(false);
  });

  it("shows intentional empty and loading treatments", () => {
    const empty = draw(example, "empty");
    expect(empty).toContain("No saved replies yet");
    expect(addressedElements(empty).has("home/replies/r1/root")).toBe(false);
    expect(draw(example, "loading")).toContain('aria-busy="true"');
  });
});
