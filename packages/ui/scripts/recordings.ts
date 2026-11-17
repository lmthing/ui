// Recorded model replies, one JSON file per component and model: test/recordings/<Component>/<model>.json.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, URL } from "node:url";

const root = fileURLToPath(new URL("../test/recordings/", import.meta.url));
type Book = Record<string, { prompt: string; reply: string }>;

export const keyOf = (model: string, prompt: string) =>
  createHash("sha256").update(`${model}\n${prompt}`).digest("hex").slice(0, 16);

const fileOf = (component: string, model: string) => join(root, component, `${model}.json`);

export function readBook(component: string, model: string): Book {
  try {
    return JSON.parse(readFileSync(fileOf(component, model), "utf8")) as Book;
  } catch {
    return {};
  }
}

export function writeBook(component: string, model: string, book: Book) {
  const file = fileOf(component, model);
  mkdirSync(dirname(file), { recursive: true });
  const sorted = Object.fromEntries(Object.entries(book).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(file, `${JSON.stringify(sorted, null, 2)}\n`);
}

/** A callModel that only replays; throws when a prompt was never recorded. */
export function replayCall(component: string, model: string) {
  const book = readBook(component, model);
  return async (prompt: string) => {
    const hit = book[keyOf(model, prompt)];
    if (!hit)
      throw new Error(
        `No recording for ${component} on ${model}. Run: pnpm llm:check --component ${component}`,
      );
    return hit.reply;
  };
}
