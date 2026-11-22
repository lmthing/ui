import { expect, it, vi } from "vitest";
import { components, readComponent } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const extras = {
  video: "lib:dog",
  quote: "Use the riverside path.",
  vote: "up",
  reposts: 1,
  reposted: true,
  saved: false,
  tags: ["Walks", "Trail news"],
  radiusKm: 3,
  alertTag: "Trail closure",
} as const;
const seed = {
  Feed: components.Feed.examples[0]!,
  Post: components.Post.examples[0]!,
};

function postInput(id: "Feed" | "Post", extra: object) {
  return id === "Feed" ? { posts: [{ ...seed.Feed.posts[0], ...extra }] } : { ...seed.Post, ...extra };
}

it.each(["Feed", "Post"] as const)("%s draws and reads only the authored extras", (id) => {
  const input = postInput(id, extras);
  const prefix = id === "Feed" ? "home/c1/r1" : "home/c1";
  const draw = (value: unknown, state: "filled" | "loading" = "filled") =>
    addressedElements(renderInstance(id, value, state, theme));
  const parts = draw(input);
  for (const part of [
    "video",
    "video_poster",
    "quote",
    "vote",
    "reposts",
    "repost",
    "save",
    "tags",
    "radius",
    "alert_tag",
  ]) {
    expect(parts.has(`${prefix}/${part}`)).toBe(true);
    expect(draw(seed[id]).has(`${prefix}/${part}`)).toBe(false);
    expect(draw(input, "loading").has(`${prefix}/${part}`)).toBe(false);
  }
  const hidden = { ...input, media: "none" };
  expect(draw(hidden).has(`${prefix}/video`)).toBe(false);
  expect(draw(hidden).has(`${prefix}/quote`)).toBe(true);
  const read = (value: unknown) => readComponent(components[id], value, "c1").join("\n");
  for (const line of [
    "1 repost",
    "Upvoted",
    "Within 3 km",
    "Alert: Trail closure",
    "Walks · Trail news",
    extras.quote,
  ])
    expect(read(input)).toContain(line);
  expect(read(hidden)).not.toContain("Video preview");
  expect(read(hidden)).not.toMatch(/\/video (play|pause)/);
  expect(read(seed[id])).not.toMatch(/\/(?:repost|save) toggle/);
});

it.each(["Feed", "Post"] as const)("%s keeps addressed toggles and video separate from navigation", (id) => {
  const session = { play: vi.fn(), pause: vi.fn(), seek: vi.fn(), dispose: vi.fn() };
  const open = vi.fn(() => session);
  const onLink = vi.fn();
  const stem = id === "Feed" ? "c1/r1" : "c1";
  const runtime = createScreenController({
    screen: { id: "home", components: [{ c: id, id: "c1", ...postInput(id, extras) }] },
    defs: components,
    resolvePlayback: (address) => (address === `home/${stem}/video` ? "clip_1" : undefined),
    media: { open },
    onLink,
  });
  try {
    for (const part of ["save", "repost"]) {
      expect(runtime.act({ address: `${stem}/${part}`, action: "toggle" }).ok).toBe(true);
      expect(runtime.act({ address: `${stem}/${part}`, action: "toggle" }).ok).toBe(true);
    }
    expect(runtime.act({ address: `${stem}/video`, action: "play" }).ok).toBe(true);
    expect(open).toHaveBeenCalledWith("clip_1", expect.objectContaining({ video: true }));
    expect(session.play).toHaveBeenCalledOnce();
    expect(runtime.act({ address: `${stem}/video`, action: "pause" }).ok).toBe(true);
    expect(session.pause).toHaveBeenCalledOnce();
    expect(onLink).not.toHaveBeenCalled();
    if (id === "Feed") {
      expect(runtime.press(stem).ok).toBe(true);
      expect(onLink).toHaveBeenCalledWith("fern_post", expect.anything());
    }
  } finally {
    runtime.dispose();
  }
});

it.each(["Feed", "Post"] as const)("%s keeps optional data bounded and grid addresses stable", (id) => {
  for (const invalid of [
    { video: "https://example.org/video" },
    { reposts: -1 },
    { reposted: "true" },
    { saved: 0 },
    { quote: "x".repeat(161) },
    { vote: "great" },
    { tags: Array(4).fill("Tag") },
    { radiusKm: 101 },
    { alertTag: "x".repeat(21) },
  ])
    expect(components[id].props.safeParse(postInput(id, invalid)).success).toBe(false);
  const parts = (input: unknown) =>
    [...addressedElements(renderInstance(id, input, "filled", theme)).keys()].sort();
  expect(parts({ ...seed[id], arrange: "grid" })).toEqual(parts(seed[id]));
});

it("opens a note with its existing address and preserves brief caption behavior", () => {
  const def = components.Stories;
  const input = def.examples[2]!;
  const filled = addressedElements(renderInstance("Stories", { ...input, detail: "brief" }, "filled", theme));
  expect(filled.get("home/c1/r1/note")?.children[0]?.attributes).toBeDefined();
  expect(filled.has("home/c1/r1/name")).toBe(false);
  expect(filled.get("home/c1/r2/root")?.attributes).toContain('role="link"');
  const read = readComponent(def, input, "c1").join("\n");
  expect(read).toContain("Maya: new note · Cuttings are ready!");
  expect(read).toContain("c1/r2 press→basil_story");
  expect(def.props.safeParse({ ...input, style: "stories" }).success).toBe(false);
  expect(def.props.safeParse({ ...def.examples[0], style: "notes" }).success).toBe(false);
  expect(renderInstance("Stories", input, "empty", theme)).toContain("No notes yet");
});

it("lists curated starter pack members without replacing the invite actions", () => {
  const def = components.Invite;
  const input = def.examples[2]!;
  const drawn = addressedElements(renderInstance("Invite", input, "filled", theme));
  expect(drawn.get("home/c1/r1/name")?.text).toEqual(["Maya"]);
  expect(drawn.get("home/c1/r2/name")?.text).toEqual(["Sam"]);
  expect(drawn.has("home/c1/r2/photo")).toBe(false);
  const read = readComponent(def, input, "c1").join("\n");
  expect(read).toContain("People to discover");
  expect(read).toContain("Sam");
  expect(read.match(/ press\b/g)).toHaveLength(2);
  expect(def.props.safeParse({ ...input, members: [] }).success).toBe(false);
  expect(def.props.safeParse({ ...input, style: "code" }).success).toBe(false);
});
