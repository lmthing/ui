import { join } from "node:path";
import { tmpdir } from "node:os";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { z } from "zod";
import { expect, it, vi } from "vitest";
import { runProbes, type Definition } from "../../src/catalog";
import { parsePrompt } from "../build/entries";
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

async function runtimeKey(source: string, markdown?: string) {
  const exports = {} as Pick<Definition, "meta" | "props">;
  const require = () => ({ prompt: parsePrompt("Player.prompt.md", markdown!) });
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(js, { exports, require, z });
  const def: Definition = {
    ...exports,
    examples: [],
    fallback: () => ({}),
    probes: [{ kind: "choose", expect: "Player", need: "Play a track." }],
  };
  let key: string | undefined;
  await runProbes({
    defs: [def],
    callModel: async (prompt, _sample, format, probe) => {
      key = recordingKey("test", prompt, format, probe);
      return "Player";
    },
  });
  expect(key).toBeDefined();
  return key;
}

it("keeps the replay key when a component moves its prompt text to Markdown", async () => {
  const inline = `
    const rowProps = z.object({ seconds: z.number() }).refine(({ seconds }) => seconds < 600);
    export const props = z.object({ rows: z.array(rowProps) });
    export const meta = {
    id: "Player", group: "content",
    purpose: 'Play sound',
    pick: "An audio player.",
    status: "draft",
    region: "body",
    writeHints: ["Set \\"speed\\" to null.", 'Keep "progress" optional.'],
    weight: 1, tier: "phone", realPath: "On-device audio.",
    } as const satisfies Meta;`;
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
  try {
    expect(await runtimeKey(inline)).toBe(await runtimeKey(split, markdown));
    expect(readSource).toHaveBeenCalledTimes(2);
  } finally {
    readSource.mockRestore();
  }
  expect(definitionSource(split, markdown.replace("Play sound", "Play music"))).not.toBe(identity);
  expect(definitionSource(split.replace("seconds < 600", "seconds < 90"), markdown)).not.toBe(identity);
});
