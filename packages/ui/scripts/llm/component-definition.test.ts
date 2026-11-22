import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, it, vi } from "vitest";
import { splitPrompt } from "../codemods/split-prompts";
import * as definition from "./component-definition";
import { recordingKey } from "./recordings";

const { definitionSource } = definition;

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

it("keeps the replay identity when a component moves its prompt text to Markdown", async () => {
  const inline = source.replace(
    'purpose: "Play sound", status: "draft"',
    `
    purpose: 'Play sound',
    pick: "An audio player.",
    status: "draft",
    region: "body",
    writeHints: ["Set \\"speed\\" to null.", 'Keep "progress" optional.'],
  `,
  );
  const root = join(tmpdir(), "ui-replay-identity-fixture");
  const file = join(root, "src/components/Player.tsx");
  const [[, markdown], [, split]] = (await splitPrompt(root, file, inline)) as readonly [
    readonly [string, string],
    readonly [string, string],
  ];
  const identity = definitionSource(inline);
  expect(split).toContain("writeHints: prompt.writeHints");
  expect(markdown).toContain("<!-- replay-literals:");
  const migrated = definitionSource(split, markdown);
  expect(migrated).toBe(identity);
  const readSource = vi.spyOn(definition, "currentDefinitionSource");
  readSource.mockReturnValueOnce(identity).mockReturnValueOnce(migrated);
  const probe = { id: "Player/write/play", sourceComponent: "Player", definition: {}, localPrompt: "Play." };
  try {
    expect(recordingKey("test", "Play.", undefined, probe)).toBe(
      recordingKey("test", "Play.", undefined, probe),
    );
    expect(readSource).toHaveBeenCalledTimes(2);
  } finally {
    readSource.mockRestore();
  }
  expect(definitionSource(split, markdown.replace("Play sound", "Play music"))).not.toBe(identity);
  expect(definitionSource(split.replace("seconds < 600", "seconds < 90"), markdown)).not.toBe(identity);
});
