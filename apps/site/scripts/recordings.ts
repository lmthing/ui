// Real recorded model replies under packages/ui/test/recordings. Nothing here is written by hand.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import type { ReadProbe, RecordedScreen } from "./site-types";

type Recording = { prompt: string; reply?: unknown };
const modelName = (file: string) => basename(file, ".json");

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : path.endsWith(".json") ? [path] : [];
  });
}

/** The pack a recording file belongs to: `recordings/pack/<id>/<model>.json`, else null. */
const packOfFile = (root: string, file: string) =>
  /\/pack\/([a-z]+)\//.exec(file.replace(root, ""))?.[1] ?? null;

function parseScreen(reply: unknown): RecordedScreen["screen"] | null {
  if (typeof reply !== "string" || !reply.startsWith('{"id"')) return null;
  try {
    const value = JSON.parse(reply) as RecordedScreen["screen"];
    return Array.isArray(value.components) && value.components.length ? value : null;
  } catch {
    return null;
  }
}

/** Every full screen a recorded model wrote (write probes of archetypes and packs). */
export function readScreens(root: string): RecordedScreen[] {
  return filesUnder(root).flatMap((file) =>
    Object.values(JSON.parse(readFileSync(file, "utf8")) as Record<string, Recording>).flatMap((entry) => {
      const screen = parseScreen(entry.reply);
      return screen ? [{ model: modelName(file), pack: packOfFile(root, file), screen }] : [];
    }),
  );
}

/** Recorded read probes: a screen as text, a task, and the address and action the model answered. */
export function readReadProbes(root: string): ReadProbe[] {
  const probes: ReadProbe[] = [];
  for (const file of filesUnder(root)) {
    for (const entry of Object.values(JSON.parse(readFileSync(file, "utf8")) as Record<string, Recording>)) {
      const text = entry.prompt;
      const task = /\nTask: (.+)\n/.exec(text)?.[1];
      const screen = /\n\n(screen [\s\S]*?)\n\nTask:/.exec(text)?.[1];
      if (!task || !screen || typeof entry.reply !== "string") continue;
      try {
        const answer = JSON.parse(entry.reply) as { address: string; action: string };
        probes.push({
          model: modelName(file),
          task,
          text: screen,
          address: answer.address,
          action: answer.action,
        });
      } catch {
        /* a reply that is not JSON is not a usable answer */
      }
    }
  }
  return probes;
}
