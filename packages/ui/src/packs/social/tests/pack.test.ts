import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { expect, it } from "vitest";
import {
  archetypes,
  checkArchetypes,
  checkPacks,
  components,
  createRegistry,
  packArchetypes,
  packComposeProbes,
  packExamples,
  packOf,
  packReady,
  packs,
  planAct,
  scoreComposition,
  writerFormat,
  type Definition,
} from "@lmthing/ui/catalog";

const ids = [
  "Feed",
  "Post",
  "Comments",
  "Poll",
  "Stories",
  "EventCard",
  "Challenge",
  "Invite",
  "StoryViewer",
] as const;
const scoped = createRegistry({ packs: ["social"], includeDrafts: true });
const empty = { things: [], items: [] };
const recipes = {
  "feed/posts": ["Header", "Stories", "Feed", "Button"],
  "feed/poll": ["Header", "Poll", "Feed"],
  "post/thread": ["Header", "Post", "Comments", "Composer", "Sheet"],
  "post/compose": ["Header", "Composer", "Field", "Button"],
  "event/event": ["Header", "EventCard", "Comments", "Composer"],
  "event/challenge": ["Header", "Challenge", "List"],
  "members/list": ["Header", "Search", "People"],
  "members/member": ["Header", "Profile", "Stats", "Button", "Feed"],
  "members/invite": ["Header", "Invite", "People"],
  "swap/deck": ["Header", "SwipeStack", "Button"],
};

it("isolates social from the default registry and gates opt-in on pack readiness", () => {
  const core = createRegistry();
  const live = createRegistry({ packs: ["social"] });
  const ready = packReady("social");
  expect(
    Object.entries(packOf)
      .filter(([, owner]) => owner === "social")
      .map(([id]) => id)
      .sort(),
  ).toEqual([...ids].sort());
  expect(scoped.ids.filter((id) => !core.ids.includes(id)).sort()).toEqual([...ids].sort());
  if (!ready) expect(live.ids).toEqual(core.ids);
  const draftFormat = JSON.stringify(writerFormat(scoped));
  const liveFormat = JSON.stringify(writerFormat(live));
  for (const id of ids) {
    expect(core.ids).not.toContain(id);
    expect(draftFormat).toContain(`"const":"${id}"`);
    expect(liveFormat.includes(`"const":"${id}"`)).toBe(ready);
  }
  for (const { id } of packArchetypes.social) {
    expect(core.archetypes).not.toHaveProperty(id);
    expect(scoped.archetypes).toHaveProperty(id);
    expect(Object.hasOwn(live.archetypes, id)).toBe(ready);
  }
});

it("uses inline stats and opens the thread moderation sheet from the post", () => {
  const member = scoped.defaultLines("members", "member", empty);
  expect(member.components.find(({ c }) => c === "Stats")).toMatchObject({ arrange: "rows" });
  const thread = scoped.defaultLines("post", "thread", empty);
  expect(thread.components.find(({ c }) => c === "Sheet")).toMatchObject({ style: "menu" });
  expect(planAct(thread, components, {}, [{ address: "p1/more", action: "press" }])).toMatchObject({
    ok: true,
    links: [{ goto: "sheet", address: `${thread.id}/p1/more` }],
  });
});

it("validates pack metadata, all worked example lines and the swap signature", () => {
  expect(checkPacks({ components, packs, packOf, packExamples, packArchetypes })).toEqual([]);
  expect(checkArchetypes({ components, packOf, packArchetypes, archetypes })).toEqual([]);
  const source = readFileSync(new URL("../example.jsonl", import.meta.url), "utf8");
  expect(packExamples.social).toBe(source);
  const lines = source
    .trimEnd()
    .split("\n")
    .map((line) => JSON.parse(line));
  expect(new Set(lines.map(({ id }) => id)).size).toBe(lines.length);
  for (const { c, id, ...props } of lines)
    expect(scoped.schema(c)?.safeParse(props).success, `${id}/${c}`).toBe(true);
  expect(lines.map(({ c }) => c)).toEqual(expect.arrayContaining([...ids]));
  const defs: Record<string, Definition> = components;
  expect(lines.flatMap(({ c }) => defs[c]?.meta.signature ?? [])).toEqual(["card_swipe"]);
  expect(lines.filter(({ c }) => c === "Sheet")).toMatchObject([{ style: "menu" }]);
  expect(
    planAct({ id: "fernpost", components: lines }, defs, {}, [{ address: "p2/more", action: "press" }]),
  ).toMatchObject({
    ok: true,
    links: [{ goto: "sheet", address: "fernpost/p2/more" }],
  });
});

it("completes the exact recipes from neutral defaults and covers every compose layout", () => {
  const defs = Object.fromEntries(scoped.defs.map((def) => [def.meta.id, def]));
  expect(packComposeProbes.social.map(({ archetype, layout }) => `${archetype}/${layout}`).sort()).toEqual(
    Object.keys(recipes).sort(),
  );
  for (const [path, order] of Object.entries(recipes)) {
    const [archetype, layout] = path.split("/") as [string, string];
    const screen = scoped.defaultLines(archetype, layout, empty);
    expect(
      screen.components.map(({ c }) => c),
      path,
    ).toEqual(order);
    expect(
      scoreComposition(JSON.stringify(screen), scoped.archetypes[archetype]!.meta, layout, defs).issues,
      path,
    ).toEqual([]);
  }
});
