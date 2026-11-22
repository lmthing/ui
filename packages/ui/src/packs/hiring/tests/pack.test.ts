import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { describe, expect, it } from "vitest";
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
  scoreComposition,
  writerFormat,
  type CastLike,
  type Definition,
} from "@lmthing/ui/catalog";
import { example } from "..";

const ids = [
  "JobFeed",
  "JobPost",
  "ApplicantPipeline",
  "Candidate",
  "Interview",
  "Offer",
  "Applications",
  "ResumeProfile",
] as const;
const cast: CastLike = { things: [], items: [] };

describe("hiring scaffold", () => {
  it("loads all eight generated entries only in a registry scoped to hiring", () => {
    const core = createRegistry();
    const hiring = createRegistry({ packs: ["hiring"], includeDrafts: true });
    const live = createRegistry({ packs: ["hiring"] });
    const ready = packReady("hiring");
    expect(
      Object.entries(packOf)
        .filter(([, owner]) => owner === "hiring")
        .map(([id]) => id)
        .sort(),
    ).toEqual([...ids].sort());
    if (!ready) expect(live.ids).toEqual(core.ids);
    const format = JSON.stringify(writerFormat(hiring));
    const coreFormat = JSON.stringify(writerFormat(core));
    for (const id of ids) {
      expect(hiring.schema(id)).toBe(components[id].props);
      expect(format).toContain(`"const":"${id}"`);
      expect(coreFormat).not.toContain(`"const":"${id}"`);
      expect(live.ids.includes(id)).toBe(ready);
    }
    expect(hiring.ids.filter((id) => id in packOf).sort()).toEqual([...ids].sort());
    expect(Object.hasOwn(live.archetypes, "hiring_openings")).toBe(ready);
    expect(core.archetypes).not.toHaveProperty("hiring_openings");
  });
});

describe("hiring recipes and worked example", () => {
  it("checks all ten recipes, neutral defaults and compose probes", () => {
    expect(checkPacks({ components, packs, packOf, packExamples, packArchetypes })).toEqual([]);
    expect(checkArchetypes({ components, packOf, packArchetypes, archetypes })).toEqual([]);
    const hiring = createRegistry({ packs: ["hiring"], includeDrafts: true });
    const defs: Record<string, Definition> = components;
    const keys = hiring.packComposeArchetypes.flatMap((meta) =>
      Object.keys(meta.layouts).map((layout) => `${meta.id}/${layout}`),
    );
    expect(keys).toHaveLength(10);
    expect(packComposeProbes.hiring.map(({ archetype, layout }) => `${archetype}/${layout}`).sort()).toEqual(
      [...keys].sort(),
    );
    for (const meta of hiring.packComposeArchetypes) {
      for (const layout of Object.keys(meta.layouts)) {
        const defaults = hiring.defaultLines(meta.id, layout, cast);
        expect(scoreComposition(JSON.stringify(defaults), meta, layout, defs).issues).toEqual([]);
      }
    }
    const listed: CastLike = {
      things: [{ type: "application", fields: ["role", "employer"] }],
      items: [
        { id: "one", type: "application", sample: true, role: "Proofreader", employer: "Harbour Press" },
        { id: "two", type: "application", sample: true, role: "Bookbinder", employer: "North Studio" },
      ],
    };
    const selected = hiring.defaultLines("hiring_job_hunt", "hiring_application", listed).components;
    const application = selected.find(({ c }) => c === "Applications");
    expect(application).toMatchObject({ surface: "card" });
    expect(application?.applications).toMatchObject([{ role: "Proofreader", employer: "Harbour Press" }]);
    expect(selected.at(-1)?.c).toBe("Note");
  });
});

it("validates each worked-example line and shares one consistent application record", () => {
  expect(example).toBe(readFileSync(new URL("../example.jsonl", import.meta.url), "utf8"));
  expect(example).toBe(packExamples.hiring);
  const defs: Record<string, Definition> = components;
  const lines = example
    .trimEnd()
    .split("\n")
    .map((line) => JSON.parse(line));
  expect(lines.map(({ c }) => c)).toEqual(["Header", ...ids]);
  for (const { c, id, ...props } of lines) {
    expect(id).toMatch(/^[a-z][a-z0-9_]*$/);
    expect(defs[c]!.props.safeParse(props).success).toBe(true);
  }
  const [, feed, job, pipeline, candidate, interview, offer, tracker, resume] = lines;
  expect(pipeline).toMatchObject({ jobId: job.jobId, title: job.title });
  expect(pipeline.applicants).toHaveLength(8);
  const { applicationId, name, role, applied, outcome, stage } = candidate;
  expect(candidate).toMatchObject({ jobId: job.jobId, role: job.title });
  expect(feed.jobs).toContainEqual(expect.objectContaining({ jobId: job.jobId, title: job.title }));
  expect(resume).toMatchObject({ name, openToWork: true });
  expect(pipeline.applicants).toContainEqual(
    expect.objectContaining({ applicationId, name, applied, outcome, stage }),
  );
  expect(interview).toMatchObject({ applicationId, candidate: name, role });
  expect(offer).toMatchObject({ applicationId, candidate: name, role, hoursPerWeek: 20 });
  expect(tracker.applications).toHaveLength(6);
  expect(tracker.applications).toContainEqual(
    expect.objectContaining({ applicationId, role, applied, outcome, stage }),
  );
});
