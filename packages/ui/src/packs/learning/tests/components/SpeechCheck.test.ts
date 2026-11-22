import {
  createRegistry,
  packReady,
  readComponent,
  type DeviceData,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { expect, it, vi } from "vitest";
import { SpeechCheck } from "../../components";
import { speechAttempts } from "../../copy";
import { addressedElements, renderInstance } from "../../../../../test/render";

const { examples, fallback, meta, probes, props } = SpeechCheck;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const listen = examples[1]!;
const defs = { SpeechCheck };
const screen = { id: "home", components: [{ ...listen, id: "s1", c: "SpeechCheck" }] };
const address = (part: string) => `home/s1/${part}`;

const cast = { things: [], items: [] };
const valid = fallback({ cast });
const invalid: unknown[] = [
  { ...valid, unknown: "invalid" },
  { ...valid, phrase: "x".repeat(121) },
  { ...valid, phonetic: "x".repeat(121) },
  { ...valid, translation: "x".repeat(121) },
  { ...valid, referenceAudio: "x".repeat(121) },
  { ...valid, words: [] },
  { ...valid, words: Array.from({ length: 17 }, () => ({ text: "x" })) },
  { ...valid, words: [{ text: "x".repeat(25) }] },
  { ...valid, words: [{ text: "one", status: "other" }] },
  { ...valid, words: [{ text: "one", id: "r1" }] },
  { ...valid, audioBytes: "x" },
  { ...valid, color: "red" },
  { ...valid, fluencyScore: -0.5 },
  { ...valid, fluencyScore: 100.5 },
  { ...valid, style: "not-a-choice!" },
  { ...valid, style: "listen" },
];

it.each(examples)("accepts a real example", (example) => {
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

it("accepts exact limits and defaults", () => {
  const max = "x".repeat(120);
  const words = Array.from({ length: 16 }, () => ({ text: "x".repeat(24) }));
  expect(
    props.parse({
      phrase: max,
      phonetic: max,
      translation: max,
      referenceAudio: max,
      words,
      fluencyScore: 100,
    }),
  ).toMatchObject({ style: "phrase", detail: "full", words, fluencyScore: 100 });
  expect(props.parse({ ...valid, fluencyScore: 0 }).fluencyScore).toBe(0);
  expect(valid).toEqual({ phrase: "Item one", words: [{ text: "Item one" }] });
});

it("declares the core near miss, finish axes and guarded service action", () => {
  expect(probes.map(({ kind }) => kind)).toEqual(["choose", "choose", "write", "write", "read"]);
  expect(probes[1]).toMatchObject({ expect: "Player" });
  expect(probes[3]).toMatchObject({ variant: { axis: "detail", value: "brief" } });
  expect(meta.partTiers.evaluate).toBe("service");
  expect(meta.confirmParts).toEqual(["evaluate", "retry"]);
  expect(createRegistry({ packs: ["learning"] }).ids.includes("SpeechCheck")).toBe(packReady("learning"));
});

it("draws addressed prompt, reference and word feedback; detail brief hides hints only", () => {
  const draw = (input: unknown) => addressedElements(renderInstance("SpeechCheck", input, "filled", theme));
  const full = draw(examples[0]);
  const brief = draw({ ...examples[0], detail: "brief" });
  for (const part of ["phrase", "listen", "score", "matched", "r1/root", "r2/root", "r3/root"])
    for (const view of [full, brief]) expect(view.has(`home/c1/${part}`), part).toBe(true);
  for (const part of ["phonetic", "translation"]) {
    expect(full.has(`home/c1/${part}`)).toBe(true);
    expect(brief.has(`home/c1/${part}`)).toBe(false);
  }
  const read = readComponent(SpeechCheck, { ...examples[0], detail: "brief" }, "c1").join("\n");
  expect(read).toContain("2 of 3 words matched");
  expect(read).toContain("Fluency 78%");
  expect(read).not.toContain("ah-roh-zay");
  expect(read).not.toContain("lib:water-the-fern");
});

it.each(["loading", "success", "error"] satisfies StateName[])("renders %s safely", (state) => {
  const html = renderInstance("SpeechCheck", examples[0], state as StateName, theme);
  if (state === "loading") expect(html).toContain('aria-busy="true"');
  if (state === "success") expect(html).toContain("Pronunciation passed");
  if (state === "error") expect(html).toContain("Could not check this attempt");
});

it("hides the target from both readers until reveal or a completed recording", () => {
  const controller = createScreenController({ screen, defs });
  try {
    const html = renderInstance("SpeechCheck", listen, "filled", theme);
    expect(html).not.toContain(listen.phrase);
    expect(html).not.toContain(listen.phonetic);
    expect(controller.read()).not.toContain(listen.phrase);
    expect(controller.read()).not.toContain(listen.referenceAudio);
    expect(controller.actionsAt(address("reveal"))).toEqual(["press"]);
    expect(controller.act({ address: address("reveal"), action: "press" }).ok).toBe(true);
    expect(controller.read()).toContain(listen.phrase);
    expect(controller.actionsAt(address("reveal"))).toEqual([]);
    expect(controller.snapshotScreen()).toEqual(screen);
  } finally {
    controller.dispose();
  }
});

it("plays and pauses only the host-resolved reference clip", () => {
  const play = vi.fn(),
    pause = vi.fn();
  const open = vi.fn(() => ({ play, pause, seek: vi.fn(), dispose: vi.fn() }));
  const resolvePlayback = vi.fn((key: string) => (key === address("listen") ? "host_reference" : undefined));
  const controller = createScreenController({ screen, defs, media: { open }, resolvePlayback });
  try {
    expect(controller.act({ address: address("listen"), action: "play" }).ok).toBe(true);
    expect(open).toHaveBeenCalledWith("host_reference", expect.objectContaining({ video: false }));
    expect(play).toHaveBeenCalledOnce();
    expect(controller.read()).toContain("[s1/listen pause:playing");
    expect(controller.act({ address: address("listen"), action: "pause" }).ok).toBe(true);
    expect(pause).toHaveBeenCalledOnce();
  } finally {
    controller.dispose();
  }
});

function createSpeechHost() {
  const sample = { instance: "s1", phrase: listen.phrase };
  let deviceData: DeviceData = {};
  let resolve!: (value: { status: "accepted" }) => void;
  const evaluate = vi.fn(
    () =>
      new Promise<{ status: "accepted" }>((done) => {
        resolve = done;
      }),
  );
  const retry = vi.fn(() => {
    deviceData = { [speechAttempts]: [{ ...sample, phase: "idle" }] };
    return { status: "accepted" as const };
  });
  const close = vi.fn((reason: "stop" | "cancel") => {
    if (reason === "stop") deviceData = { [speechAttempts]: [{ ...sample, phase: "recorded" }] };
  });
  const controller = createScreenController({
    screen,
    defs,
    get deviceData() {
      return deviceData;
    },
    micCapture: { open: () => ({ close }) },
    hostCommands: {
      commands: {
        evaluateSpeech: { allows: () => true, run: evaluate },
        retrySpeech: { allows: () => true, run: retry },
      },
    },
  });
  return {
    controller,
    evaluate,
    retry,
    close,
    finish() {
      deviceData = {
        [speechAttempts]: [
          { ...sample, phase: "scored", score: 100, statuses: Array(4).fill("correct"), passed: true },
        ],
      };
      resolve({ status: "accepted" });
    },
  };
}

it("submits only an admitted take after confirmation and retries without leaking audio", async () => {
  const { controller, evaluate, retry, close, finish } = createSpeechHost();
  try {
    expect(controller.actionsAt(address("evaluate"))).toEqual([]);
    await controller.startMicCapture(address("mic"));
    expect(controller.micCapturePhase(address("mic"))).toBe("recording");
    controller.stopMicCapture(address("mic"));
    expect(close).toHaveBeenCalledExactlyOnceWith("stop");
    expect(controller.read()).toContain(listen.phrase);
    expect(controller.press(address("evaluate")).ok).toBe(true);
    expect(evaluate).not.toHaveBeenCalled();
    expect(controller.press("confirm/confirm").ok).toBe(true);
    expect(evaluate).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        address: address("evaluate"),
        tier: "service",
        input: { phrase: listen.phrase },
      }),
      expect.anything(),
    );
    expect(controller.read()).toContain("evaluateSpeech pending");
    expect(controller.actionsAt(address("evaluate"))).toEqual([]);
    finish();
    await Promise.resolve();
    expect(controller.read()).toContain("Pronunciation passed");
    expect(controller.read()).toContain("4 of 4 words matched");
    expect(controller.press(address("retry")).ok).toBe(true);
    expect(retry).not.toHaveBeenCalled();
    expect(controller.act({ address: "confirm/cancel", action: "dismiss" }).ok).toBe(true);
    expect(controller.read()).toContain("Fluency 100%");
    expect(controller.press(address("retry")).ok).toBe(true);
    expect(controller.press("confirm/confirm").ok).toBe(true);
    expect(retry).toHaveBeenCalledOnce();
    expect(controller.read()).not.toContain(listen.phrase);
    expect(controller.snapshotScreen()).toEqual(screen);
  } finally {
    controller.dispose();
  }
});
