import { describe, expect, it } from "vitest";
import {
  components,
  packOf,
  readComponent,
  scoreWrite,
  writerFormatFor,
  type CastLike,
} from "@lmthing/ui/catalog";

const invalid = {
  Lesson: [
    { title: "x".repeat(41) },
    { text: "x".repeat(401) },
    { example: "x".repeat(161) },
    { photo: "https://example.com" },
  ],
  Quiz: [
    { questions: [] },
    {
      questions: Array.from({ length: 7 }, () => ({
        question: "Which one?",
        kind: "truefalse",
        answer: false,
      })),
    },
    { questions: [{ kind: "choice", question: "Which one?", options: ["One", "Two"], answer: 2 }] },
    { questions: [{ kind: "type", question: "Which one?", answer: true }] },
    { questions: [{ kind: "truefalse", question: "Which one?", answer: "true" }] },
    { questions: [{ kind: "match", question: "Which one?", pairs: [{ left: "One", right: "First" }] }] },
  ],
  Flashcard: [
    { cards: [] },
    {
      cards: [
        { front: "A", back: "B" },
        { front: "A", back: "B", due: "2026-11-22" },
      ],
    },
  ],
  Path: [{ units: [] }, { milestones: [3] }, { milestones: [1, 1] }],
  Result: [{ right: 11 }, { of: 0 }, { seconds: -1 }, { right: 10 }],
  Achievements: [
    { badges: [] },
    {
      badges: [
        { title: "A", icon: "star" },
        { title: "B", icon: "star", earned: "2026-02-30" },
      ],
    },
  ],
  Timetable: [
    { days: [] },
    { days: [{ day: "mon", periods: [{ time: "24:00", subject: "Theory" }] }] },
    { days: [{ day: "mon", periods: [] }] },
  ],
  Assignments: [
    { items: [] },
    { items: [{ title: "A", subject: "B", status: "todo", due: "2026-02-30", goto: "detail" }] },
    { items: [{ title: "A", subject: "B", status: "todo", due: "2026-11-25", grade: "A", goto: "detail" }] },
  ],
};
const casts: CastLike[] = [
  { things: [], items: [] },
  {
    things: [{ type: "record", fields: ["label", "summary"] }],
    items: [{ id: "one", type: "record", sample: true, label: "Record one", summary: "A detail" }],
  },
  {
    things: [{ type: "record", fields: ["label", "summary"] }],
    items: [{ id: "one", type: "record", sample: true, label: "   ", summary: 10 }],
  },
];
const ids = Object.keys(invalid) as (keyof typeof invalid)[];

describe.each(ids)("%s draft contract", (id) => {
  const def = components[id];

  it("accepts domain examples, but not out-of-bounds, unrecognised or presentational fields", () => {
    expect(def.examples.length).toBeGreaterThanOrEqual(2);
    for (const example of def.examples) expect(def.props.safeParse(example).success).toBe(true);
    for (const patch of [...invalid[id], { color: "#111" }])
      expect(def.props.safeParse({ ...def.examples[0], ...patch }).success).toBe(false);
  });

  it("builds valid fallback props for empty, populated and malformed casts", () => {
    for (const cast of casts) expect(def.props.safeParse(def.fallback({ cast })).success).toBe(true);
    if (id !== "Result") {
      expect(JSON.stringify(def.fallback({ cast: casts[0]! }))).toContain("Item one");
      expect(JSON.stringify(def.fallback({ cast: casts[1]! }))).toContain("Record one");
    }
  });

  it("declares addressed parts and exposes its tested read action", () => {
    expect(def.meta.purpose.trim().split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(def.meta.realPath).not.toBe("");
    expect(def.meta.tier).toBe("phone");
    const partNames = [
      ...("parts" in def.meta ? def.meta.parts : []),
      ...("items" in def.meta ? def.meta.items.parts : []),
    ];
    for (const part of partNames) expect(part).toMatch(/^[a-z][a-z0-9_]*$/);
    expect(def.probes.some((probe) => probe.kind === "choose" && probe.expect === id)).toBe(true);
    expect(
      def.probes.some((probe) => probe.kind === "choose" && probe.expect !== id && !(probe.expect in packOf)),
    ).toBe(true);
    expect(def.probes.some((probe) => probe.kind === "write" && probe.expect === id)).toBe(true);
    const read = def.probes.find((probe) => probe.kind === "read");
    expect(read).toBeDefined();
    if (read?.kind === "read") {
      const instance = read.expect.address.split("/")[0]!;
      expect(readComponent(def, def.examples[read.screen], instance).join("\n")).toContain(
        `[${read.expect.address} ${read.expect.action}`,
      );
    }
  });
});

it("does not reveal quiz solutions or future questions, or a flashcard's back before flipping", () => {
  const quiz = readComponent(components.Quiz, components.Quiz.examples[0], "q1").join("\n");
  expect(quiz).toContain("mizu");
  expect(quiz).not.toContain("Mizu is the common reading");
  expect(quiz).not.toContain("Type the reading");
  expect(quiz).not.toContain("[q1/next press]");
  const typed = readComponent(
    components.Quiz,
    { questions: [{ kind: "type", question: "Name the note", answer: "F sharp" }] },
    "q1",
  ).join("\n");
  expect(typed).toContain("[q1/field type]");
  expect(typed).not.toContain("F sharp");
  expect(typed).not.toContain("[q1 select");
  const card = readComponent(components.Flashcard, components.Flashcard.examples[0], "f1").join("\n");
  expect(card).toContain("[f1/card flip]");
  expect(card).not.toContain("mizu");
  expect(card).not.toContain("[f1/good press]");
});

it("opens only unlocked course units", () => {
  const path = readComponent(components.Path, components.Path.examples[0], "p1").join("\n");
  expect(path).toContain("[p1/r1 press");
  expect(path).toContain("[p1/r2 press");
  expect(path).not.toContain("[p1/r3 press");
});

it("keeps each question a strict Writer object and decodes its unused nullable fields", () => {
  const quiz = components.Quiz;
  const question = writerFormatFor(quiz).json_schema.schema.properties?.questions?.items;
  expect(question?.additionalProperties).toBe(false);
  expect(question?.required).toEqual(["question", "kind", "explain", "photo", "options", "answer", "pairs"]);
  const questions = [...quiz.examples[0]!.questions, ...quiz.examples[1]!.questions].map((question) => ({
    options: null,
    answer: null,
    pairs: null,
    explain: null,
    photo: null,
    ...question,
  }));
  const reply = {
    c: "Quiz",
    density: null,
    surface: null,
    selected_option: null,
    selected_left: null,
    selected_right: null,
    questions,
  };
  expect(scoreWrite(JSON.stringify(reply), quiz).pass).toBe(true);
});
