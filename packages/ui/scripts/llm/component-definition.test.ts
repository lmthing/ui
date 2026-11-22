import { expect, it } from "vitest";
import { definitionSource } from "./component-definition";

const source = `
const rowProps = z.object({ seconds: z.number() }).refine(({ seconds }) => seconds < 600);
export const props = z.object({ rows: z.array(rowProps) });
export const meta = { purpose: "Play sound", status: "draft" } as const satisfies Meta;
export const examples = [{ rows: [{ seconds: 4 }] }];
export const probes = [choose("Play a track")];
export function Player() { return <Track />; }
`;

it("includes the code of refinements on nested props", () => {
  const original = definitionSource(source);
  expect(original).toContain("seconds < 600");
  expect(definitionSource(source.replace("seconds < 600", "seconds < 90"))).not.toBe(original);
});

it("excludes the renderer, lifecycle status, and unused preview and probe data", () => {
  expect(definitionSource(source.replace("<Track />", "<PlayerControls />"))).toBe(definitionSource(source));
  expect(definitionSource(source.replace('"draft"', '"ready"'))).toBe(definitionSource(source));
  expect(definitionSource(source.replace('"Play a track"', '"Play a song"'))).toBe(definitionSource(source));
  expect(definitionSource(source.replace("seconds: 4", "seconds: 8"))).toBe(definitionSource(source));
});
