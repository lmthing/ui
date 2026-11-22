import { expect, it, vi } from "vitest";
import type { z } from "zod";
import { createRegistry, packReady, type CommandRequest, type DeviceData } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderExample } from "../../../../../test/render";
import { AudioMatch } from "../../components";

const { examples, fallback, meta, probes, props } = AudioMatch;
const first = examples[0]!;
const second = examples[1]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const makeScreen = (input: z.input<typeof props> = first) => ({
  id: "home",
  components: [{ id: "a1", c: "AudioMatch", ...input }],
});
const defs = { AudioMatch };
const data = (recognition: object): DeviceData => ({ audioRecognition: [{ instance: "a1", recognition }] });

const cast = { things: [], items: [] };
const valid = fallback({ cast });
const invalid: unknown[] = [
  { ...valid, unknown: "invalid" },
  { ...valid, match: "not-a-choice!" },
  { ...valid, history: Array.from({ length: 7 }, () => ({ title: "x", artist: "x", matchedAt: "x" })) },
  { ...valid, style: "not-a-choice!" },
  { ...valid, media: "photo" },
  { ...valid, color: "red" },
  { ...valid, listening: 1 },
  { ...second, match: { ...second.match, title: "x".repeat(41) } },
  { ...second, match: { ...second.match, artist: "x".repeat(33) } },
  { ...second, match: { ...second.match, url: "http://example.com" } },
  { ...valid, history: [{ ...first.history[0], matchedAt: "x".repeat(13) }] },
  { ...valid, history: [{ ...first.history[0], goto: "https://example.com" }] },
];

it.each(examples)("accepts a domain example", (example) => {
  expect(props.safeParse(example).success).toBe(true);
});

it.each(invalid)("rejects invalid input", (input) => {
  expect(props.safeParse(input).success).toBe(false);
});

it("validates the fallback for empty and populated casts", () => {
  expect(props.safeParse(fallback({ cast })).success).toBe(true);
  const things = [{ type: "item", fields: ["name"] }];
  const items = [{ id: "one", type: "item", name: "Sample", sample: true }];
  for (const name of ["Sample", 42]) {
    expect(
      props.safeParse(fallback({ cast: { things, items: items.map((item) => ({ ...item, name })) } }))
        .success,
    ).toBe(true);
  }
});

it("declares the permission tiers, pack gate and core-first probes", () => {
  expect(meta.partTiers).toEqual({ listen: "service", open: "service" });
  expect(createRegistry({ packs: ["media"] }).ids.includes(meta.id)).toBe(packReady("media"));
  expect(probes.map(({ kind }) => kind)).toEqual(["choose", "choose", "write", "write", "read"]);
  expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Player" }));
});

it("renders states and the result, retaining recent links on error and the same addresses without photos", () => {
  const parts = (input: unknown, state: "filled" | "empty" | "loading" | "success" | "error") =>
    addressedElements(renderExample("AudioMatch", input, state, theme).html);
  expect(parts({ history: [] }, "empty").get("home/c1/status")?.text).toContain(
    "Listen to identify music playing nearby",
  );
  expect(parts(first, "loading").get("home/c1/listen")?.attributes).toContain(
    'aria-label="Stop and identify"',
  );
  expect(parts(first, "error").get("home/c1/status")?.text).toContain("Could not identify the track");
  expect(parts(first, "error").get("home/c1/r1/root")?.attributes).toContain('role="link"');
  expect(parts(second, "success").get("home/c1/title")?.text).toContain("Meet Me at the Gate");
  const full = [...parts(second, "filled").keys()],
    brief = [...parts({ ...second, media: "none" }, "filled").keys()];
  expect(full.filter((part) => part !== "home/c1/artwork")).toEqual(brief);
});

it("only offers linked history without a host and ignores a supplied wire match and listening flag", () => {
  const runtime = createScreenController({
    screen: makeScreen({ ...first, match: second.match, listening: true }),
    defs,
  });
  try {
    expect(runtime.read()).toContain("[a1/r1 press");
    expect(runtime.read()).not.toMatch(/a1\/(?:listen|open|r2) (?:press|start|stop)/);
    expect(runtime.read()).not.toContain(second.match!.title);
    expect(runtime.press("a1/r1").ok).toBe(true);
    expect(runtime.act({ address: "a1/listen", action: "start" }).ok).toBe(false);
    expect(runtime.press("a1/open").ok).toBe(false);
  } finally {
    runtime.dispose();
  }
});

it("accepts start and stop only in their host phases, then retries without clearing recent tracks", async () => {
  const run = vi.fn((_: CommandRequest) => ({ status: "accepted" as const }));
  const adapter = { allows: () => true, run };
  const options = {
    screen: makeScreen(),
    defs,
    deviceData: data({ phase: "error" }),
    hostCommands: { commands: { "audioMatch.start": adapter, "audioMatch.stop": adapter } },
  };
  const runtime = createScreenController(options);
  try {
    expect(runtime.read()).toContain("Could not identify the track");
    expect(runtime.read()).toContain("Glasshouse");
    expect(runtime.act({ address: "a1/listen", action: "stop" }).ok).toBe(false);
    expect(runtime.act({ address: "a1/listen", action: "start" }).ok).toBe(true);
    await vi.waitFor(() => expect(runtime.hostOperations("a1")[0]?.status).toBe("accepted"));
    options.deviceData = data({ phase: "listening" });
    expect(runtime.act({ address: "a1/listen", action: "start" }).ok).toBe(false);
    expect(runtime.act({ address: "a1/listen", action: "stop" }).ok).toBe(true);
    expect(run.mock.calls.map(([request]) => [request.name, request.tier])).toEqual([
      ["audioMatch.start", "service"],
      ["audioMatch.stop", "service"],
    ]);
  } finally {
    runtime.dispose();
  }
});

it("requires a mounted human confirmation to open the host track and never reads its URL", () => {
  const run = vi.fn(() => ({ status: "accepted" as const }));
  const runtime = createScreenController({
    screen: makeScreen(second),
    defs,
    deviceData: data({ phase: "matched", track: second.match }),
    hostCommands: { external: { allows: () => true, run } },
  });
  try {
    expect(runtime.read()).toContain("Meet Me at the Gate");
    expect(runtime.read()).not.toContain(second.match!.url);
    expect(runtime.press("a1/open").ok).toBe(false);
    runtime.registerPart("a1/open");
    expect(runtime.press("a1/open").ok).toBe(true);
    expect(run).not.toHaveBeenCalled();
    expect(runtime.read()).toContain("user confirmation required");
    runtime.registerPart("confirm/confirm");
    expect(runtime.press("confirm/confirm").ok).toBe(true);
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({ uri: second.match?.url, tier: "service" }),
      expect.anything(),
    );
  } finally {
    runtime.dispose();
  }
});
