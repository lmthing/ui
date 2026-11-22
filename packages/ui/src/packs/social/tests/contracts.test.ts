import { describe, expect, it } from "vitest";
import { components, planAct, readComponent, readScreen, type CastLike } from "@lmthing/ui/catalog";

const core = {
  Feed: "List",
  Post: "Card",
  Comments: "Bubbles",
  Poll: "Choice",
  Stories: "People",
  EventCard: "Card",
  Challenge: "Progress",
  Invite: "People",
} as const;
const ids = Object.keys(core) as (keyof typeof core)[];
const casts: CastLike[] = [
  { things: [], items: [] },
  {
    things: [{ type: "entry", fields: ["name", "detail"] }],
    items: [{ id: "one", type: "entry", sample: true, name: "Jordan", detail: "A useful detail" }],
  },
  {
    things: [{ type: "entry", fields: ["name", "detail"] }],
    items: [{ id: "Bad ID", type: "entry", sample: true, name: 9, detail: "x".repeat(1200) }],
  },
];
const { Feed, Post, Comments, Poll, Stories, EventCard, Challenge, Invite } = components;
const repeat = <T>(length: number, value: T) => Array.from({ length }, () => value);
const invalid = {
  Feed: [
    { posts: [] },
    { posts: repeat(7, Feed.examples[0]!.posts[0]) },
    { posts: [{ ...Feed.examples[0]!.posts[0], name: "x".repeat(25) }] },
    { posts: [{ ...Feed.examples[0]!.posts[0], likes: -1 }] },
    { posts: [{ ...Feed.examples[0]!.posts[0], goto: "Bad ID" }] },
  ],
  Post: [
    { ...Post.examples[0], text: "x".repeat(1001) },
    { ...Post.examples[0], images: repeat(5, "lib:fern") },
    { ...Post.examples[0], photo: "https://example.org/avatar.png" },
  ],
  Comments: [
    { comments: [] },
    { comments: repeat(7, Comments.examples[0]!.comments[0]) },
    { comments: [{ ...Comments.examples[0]!.comments[0], text: "x".repeat(241) }] },
    { comments: [{ ...Comments.examples[0]!.comments[0], reply: true }] },
  ],
  Poll: [
    { ...Poll.examples[0], options: [] },
    { ...Poll.examples[0], options: repeat(6, { label: "One", votes: 1 }) },
    { ...Poll.examples[0], voted: 2 },
    { ...Poll.examples[0], closes: "2026-02-30" },
    { ...Poll.examples[0], total: 7 },
  ],
  Stories: [
    { people: [], mine: true },
    { people: repeat(11, Stories.examples[0]!.people[0]), mine: false },
    { people: [{ ...Stories.examples[0]!.people[0], name: "x".repeat(13) }], mine: false },
  ],
  EventCard: [
    { ...EventCard.examples[0], attendees: repeat(6, "Sam") },
    { ...EventCard.examples[0], attendees: ["Maya"], going: 0 },
    { ...EventCard.examples[0], status: "maybe" },
    { ...EventCard.examples[0], time: "24:00" },
  ],
  Challenge: [
    { ...Challenge.examples[0], goal: 0 },
    { ...Challenge.examples[0], top: repeat(4, { name: "Sam", value: 3 }) },
    { ...Challenge.examples[0], days_left: 3 },
  ],
  Invite: [
    { ...Invite.examples[0], code: "x".repeat(13) },
    { ...Invite.examples[0], joined: 1.5 },
    { ...Invite.examples[0], qr: "yes" },
  ],
};

describe.each(ids)("%s contract", (id) => {
  const { meta, props, examples, fallback, probes } = components[id];
  it("validates its examples and fallbacks", () => {
    expect(examples.length).toBeGreaterThanOrEqual(2);
    for (const example of examples) expect(props.safeParse(example).success).toBe(true);
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(JSON.stringify(fallback({ cast: casts[1]! }))).toContain("Jordan");
  });
  it("rejects out-of-contract props", () => {
    for (const input of [
      ...invalid[id],
      { ...examples[0], color: "#abc" },
      { ...examples[0], density: "tiny" },
    ])
      expect(props.safeParse(input).success, JSON.stringify(input)).toBe(false);
  });
  it("keeps the shared-app metadata and positive, core-first, write and read probes", () => {
    expect(meta.tier).toBe("people");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain(core[id]);
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: id }),
        expect.objectContaining({ kind: "choose", expect: core[id] }),
        expect.objectContaining({ kind: "write", expect: id }),
        expect.objectContaining({ kind: "read" }),
      ]),
    );
  });
});

it("reads poll results without offering another vote", () => {
  const open = readComponent(Poll, Poll.examples[0], "p1").join("\n");
  const results = readComponent(Poll, Poll.examples[1], "p1", "success").join("\n");
  expect(open).toContain("[p1/r2 select");
  expect(results).toContain("75%");
  expect(results).not.toContain(" select");
});

it("closes the vote affordances after a projected selection", () => {
  const screen = { id: "home", components: [{ ...Poll.examples[0]!, id: "p1", c: "Poll" }] };
  const defs = { Poll };
  const step = { address: "p1/r2", action: "select", value: 1 };
  const result = planAct(screen, defs, {}, [step]);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const reading = readScreen(screen, defs, result.values);
  expect(reading).toContain("Total 8");
  expect(reading).toContain("Basil · 50%");
  expect(reading).not.toContain(" select");
  expect(planAct(screen, defs, result.values, [step])).toMatchObject({ ok: false, code: "not_actionable" });
});

it("does not mistake an indented reply for a liked comment", () => {
  expect(readComponent(Comments, Comments.examples[0], "c1").join("\n")).toContain(
    "[c1/r2/like toggle:off !needs-people]",
  );
});

it("does not read variant-hidden attachments or timestamps", () => {
  const feed = readComponent(Feed, Feed.examples[1], "f1").join("\n");
  const event = readComponent(EventCard, EventCard.examples[1], "e1").join("\n");
  const comments = readComponent(Comments, Comments.examples[1], "c1").join("\n");
  expect(feed).toContain("photo:people");
  expect(feed).not.toContain("photo:dog");
  expect(event).not.toContain("photo:dog");
  expect(comments).toContain("Around eight");
  expect(comments).not.toContain("15 min ago");
});

it("offers the camera at OK tier and points only the intended press actions at their destinations", () => {
  expect(Stories.meta.partTiers.add).toBe("ok");
  expect(readComponent(Stories, Stories.examples[0], "s1", "empty").join("\n")).toContain("[s1/add press");
  expect(readComponent(Stories, Stories.examples[1], "s1").join("\n")).not.toContain("s1/add");
  const event = readComponent(EventCard, EventCard.examples[0], "e1").join("\n");
  expect(event).toMatch(/(?:28 Nov|Nov 28)/);
  expect(event).toContain("14:00");
  expect(event).toContain(" — 14 — ");
  expect(event).toContain("[e1 press→swap_meet !needs-people]");
  expect(event).toContain("[e1/going press !needs-people]");
  const challenge = readComponent(Challenge, Challenge.examples[0], "c1").join("\n");
  expect(challenge).toContain("[c1/log press→log_cuttings !needs-people]");
  expect(challenge).not.toContain("c1/join");
});
