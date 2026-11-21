import { describe, expect, it, vi } from "vitest";
import {
  components,
  packOf,
  placeholderTitle,
  readComponent,
  type CastLike,
  type Definition,
} from "@lmthing/ui/catalog";

const { JobPost, ApplicantPipeline, Candidate, Interview, Offer, Applications } = components;
const drafts: readonly Definition[] = [JobPost, ApplicantPipeline, Candidate, Interview, Offer, Applications];
const empty: CastLike = { things: [], items: [] };
const full: CastLike = {
  things: [{ type: "record", fields: ["first", "second"] }],
  items: [{ id: "one", type: "record", sample: true, first: "Example title", second: "Example detail" }],
};
const malformed: CastLike = {
  things: [{ type: "record", fields: ["first"] }],
  items: [{ id: "one", type: "record", sample: true, first: 5 }],
};

describe("hiring draft examples and probes", () => {
  it.each(drafts)("validates examples and cast fallbacks for $meta.id", (def) => {
    expect(def.examples.length).toBeGreaterThanOrEqual(2);
    for (const example of def.examples) expect(def.props.safeParse(example).success).toBe(true);
    for (const cast of [empty, full, malformed]) {
      const fallback = def.fallback({ cast });
      expect(def.props.safeParse(fallback).success).toBe(true);
      expect(JSON.stringify(fallback)).toContain(cast === full ? "Example title" : placeholderTitle(0));
    }
    expect(def.props.safeParse({ ...def.props.parse(def.examples[0]), color: "red" }).success).toBe(false);
    if (def.meta.status === "draft") {
      expect(def.meta.tier).toBe("phone");
      expect(def.meta.realPath).not.toBe("");
      expect(def.meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
      expect(def.meta.variants).toBeDefined();
    }
  });

  it.each(drafts)("has a positive choose, core near miss, write and offered read for $meta.id", (def) => {
    const { id } = def.meta;
    expect(def.probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: id }));
    expect(def.probes).toContainEqual(expect.objectContaining({ kind: "write", expect: id }));
    const miss = def.probes.find(
      (probe) => probe.kind === "choose" && probe.expect !== id && !(probe.expect in packOf),
    );
    expect(miss).toBeDefined();
    if (miss?.kind === "choose") expect(def.meta.pick).toContain(miss.expect);
    const reads = def.probes.filter((probe) => probe.kind === "read");
    expect(reads.length).toBeGreaterThan(0);
    for (const {
      expect: { address, action },
      screen,
    } of reads) {
      const reading = readComponent(def, def.examples[screen], address.split("/")[0]!).join("\n");
      expect(reading).toContain(`[${address} ${action}`);
    }
  });
});

describe("hiring draft bounds", () => {
  it("rejects invalid openings, applicants and criteria", () => {
    const job = JobPost.examples[0]!;
    const pipe = ApplicantPipeline.examples[0]!;
    const candidate = Candidate.examples[0]!;
    const invalid = [
      [
        JobPost,
        [
          { ...job, title: "x".repeat(33) },
          { ...job, pay: { min: 22, max: 18, per: "hour" } },
          { ...job, pay: { min: 18, max: 22, per: "hour", currency: "USD" } },
          { ...job, requirements: [] },
        ],
      ],
      [
        ApplicantPipeline,
        [
          { ...pipe, applicants: [] },
          {
            ...pipe,
            applicants: Array.from({ length: 21 }, (_, i) => ({
              ...pipe.applicants[0],
              applicationId: String(i),
            })),
          },
          { ...pipe, applicants: [pipe.applicants[0], pipe.applicants[0]] },
          { ...pipe, applicants: [{ ...pipe.applicants[0], stage: "hired" }] },
        ],
      ],
      [
        Candidate,
        [
          { ...candidate, criteria: [{ label: "Criterion", finding: "automatic" }] },
          { ...candidate, criteria: [] },
          { ...candidate, photo: "https://example.org/photo" },
        ],
      ],
    ] as const;
    for (const [def, inputs] of invalid)
      for (const input of inputs) expect(def.props.safeParse(input).success).toBe(false);
  });
});

it("rejects invalid interviews, offers and follow-ups", () => {
  const interview = Interview.examples[0];
  const offer = Offer.examples[0];
  const tracker = Applications.examples[0]!;
  const invalid = [
    [
      Interview,
      [
        { ...interview, date: "2027-02-30" },
        { ...interview, time: "24:00" },
        { ...interview, minutes: 241 },
        { ...interview, link: "http://example.org/meeting" },
        { ...interview, link: `https://example.org/${"x".repeat(200)}` },
      ],
    ],
    [
      Offer,
      [
        { ...offer, hoursPerWeek: 0 },
        { ...offer, hoursPerWeek: 81 },
        { ...offer, pay: -1 },
        { ...offer, conditions: ["x".repeat(101)] },
      ],
    ],
    [
      Applications,
      [
        { ...tracker, applications: [{ ...tracker.applications[0], next: undefined }] },
        { ...tracker, applications: [{ ...tracker.applications[1], applied: "2027-04-06" }] },
        {
          ...tracker,
          applications: Array.from({ length: 7 }, (_, i) => ({
            ...tracker.applications[0],
            applicationId: String(i),
          })),
        },
      ],
    ],
  ] as const;
  for (const [def, inputs] of invalid)
    for (const input of inputs) expect(def.props.safeParse(input).success).toBe(false);
});

it("does not offer terminal, missing-link or non-navigation actions as available links", () => {
  const pipeline = readComponent(ApplicantPipeline, ApplicantPipeline.examples[0], "p1").join("\n");
  expect(pipeline).toContain("[p1/r1 move]");
  expect(pipeline).not.toContain("[p1/r2");
  const candidate = readComponent(Candidate, Candidate.examples[0], "c1").join("\n");
  expect(candidate).toContain("[c1/interview press→sam_interview]");
  const terminal = readComponent(Candidate, Candidate.examples[1], "c1").join("\n");
  expect(terminal).not.toContain("[c1/hire ");
  expect(terminal).not.toContain("[c1/r1/evidence ");
  const appointment = readComponent(Interview, Interview.examples[0], "i1").join("\n");
  expect(appointment).not.toContain("[i1/join ");
  expect(appointment).toContain("[i1/complete press]");
  const offer = readComponent(Offer, Offer.examples[1], "o1").join("\n");
  expect(offer).not.toContain("[o1/withdraw ");
  const tracker = readComponent(Applications, Applications.examples[0], "a1").join("\n");
  expect(tracker).toContain("[a1/r1/withdraw press]");
  expect(tracker).not.toContain("[a1/r2/followup ");
});

it("offers Apply through the local closing date, but not after it", () => {
  const job = { ...JobPost.examples[0], closes: "2027-04-30" };
  vi.useFakeTimers();
  try {
    vi.setSystemTime(new Date(2027, 3, 30, 23, 59));
    expect(readComponent(JobPost, job, "j1").join("\n")).toContain("[j1/apply press→apply]");
    vi.setSystemTime(new Date(2027, 4, 1, 0, 0));
    const closed = readComponent(JobPost, job, "j1").join("\n");
    expect(closed).not.toContain("[j1/apply ");
    expect(closed).toContain("[j1/save toggle");
    expect(readComponent(JobPost, { ...job, closes: undefined }, "j1").join("\n")).toContain(
      "[j1/apply press→apply]",
    );
  } finally {
    vi.useRealTimers();
  }
});
