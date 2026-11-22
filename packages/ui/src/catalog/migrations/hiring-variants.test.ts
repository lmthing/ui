import { expect, it } from "vitest";
import { components, migrateLine, stampItemIds } from "@lmthing/ui/catalog";

const { ApplicantPipeline } = components;

it.each([
  ["columns", "strip"],
  ["stack", "rows"],
] as const)("migrates an ApplicantPipeline saved as %s to %s", (style, arrange) => {
  const original = {
    ...ApplicantPipeline.examples[0]!,
    c: "ApplicantPipeline",
    id: "pipeline",
    style,
    density: "compact",
  };
  const { c, id, ...input } = migrateLine(original);
  expect({ c, id }).toEqual({ c: "ApplicantPipeline", id: "pipeline" });
  expect(input).not.toHaveProperty("style");
  expect(input).not.toHaveProperty("density");
  const parsed = stampItemIds(ApplicantPipeline.meta, ApplicantPipeline.props.parse(input));
  expect(parsed).toMatchObject({
    arrange,
    applicants: original.applicants.map((row, index) => ({ ...row, id: `r${index + 1}` })),
  });
  expect(migrateLine({ ...original, arrange: "rows" })).toHaveProperty("arrange", "rows");
});
