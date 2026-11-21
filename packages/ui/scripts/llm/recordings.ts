// Recorded model replies, one JSON file per component and model: test/recordings/<Component>/<model>.json.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import type { WriterFormat, CallModel, ProbeCall, ReplayProbe } from "@lmthing/ui/catalog";

export const recordingRoot = fileURLToPath(new URL("../../test/recordings/", import.meta.url));
export const legacyIndexFile = fileURLToPath(new URL("./legacy-replay-keys.json", import.meta.url));
/** `reply` is the first sample; `replies` holds every sample when a probe is run more than once. */
export type Evidence = { prompt: string; format?: WriterFormat; reply: string; replies?: string[] };
export type Book = Record<string, Evidence>;
export type LegacyIndex = Record<string, Record<string, string>>;

const digest = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 16);

export const keyOf = (model: string, prompt: string, format?: WriterFormat) =>
  digest(`${model}\n${prompt}${format ? `\n${JSON.stringify(format)}` : ""}`);

const probeKey = (probe: ReplayProbe, format?: WriterFormat) =>
  `${encodeURIComponent(probe.id)}/${digest(JSON.stringify([probe.definition, probe.localPrompt, format]))}`;

export const recordingKey = (
  model: string,
  prompt: string,
  format: WriterFormat | undefined,
  probe: ReplayProbe,
) => `${probeKey(probe, format)}/${keyOf(model, prompt, format)}`;

function sampleReply(hit: Evidence | undefined, sample: number) {
  return hit?.replies?.[sample] ?? (sample === 0 ? hit?.reply : undefined);
}

/** Changed pack prompts get new samples; unchanged prompts keep their original evidence. */
export function recordingCall(model: string, book: Book, live: CallModel, resume?: string): ProbeCall {
  const legacy = resume ? legacyKeys(resume, model) : {};
  return async (prompt, sample, format, probe) => {
    const key = recordingKey(model, prompt, format, probe);
    const archived = legacy[key];
    const previous = book[key] ?? (archived ? book[archived] : undefined);
    const cached = sampleReply(previous, sample);
    if (resume && cached !== undefined) return cached;
    const reply = await live(prompt, sample, format);
    const replies = [
      ...(!resume && sample === 0 ? [] : (previous?.replies ?? (previous ? [previous.reply] : []))),
    ];
    replies[sample] = reply;
    book[key] = { prompt, ...(format ? { format } : {}), reply: replies[0] ?? reply, replies };
    return reply;
  };
}

const fileOf = (component: string, model: string) => join(recordingRoot, component, `${model}.json`);
const indexKey = (component: string, model: string) => `${component}/${model}`;
let legacyIndex: LegacyIndex | undefined;

export function readLegacyBook(component: string, model: string): Book {
  return JSON.parse(readFileSync(fileOf(component, model), "utf8")) as Book;
}

export function readBook(component: string, model: string): Book {
  try {
    return readLegacyBook(component, model);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

export function writeBook(component: string, model: string, book: Book) {
  const file = fileOf(component, model);
  mkdirSync(dirname(file), { recursive: true });
  const sorted = Object.fromEntries(Object.entries(book).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(file, `${JSON.stringify(sorted, null, 2)}\n`);
}

function byProbe(book: Book) {
  const index = new Map<string, Evidence[]>();
  for (const key of Object.keys(book).sort()) {
    const prefix = key.slice(0, key.lastIndexOf("/"));
    if (prefix.includes("/")) {
      const entries = index.get(prefix) ?? [];
      entries.push(book[key]!);
      index.set(prefix, entries);
    }
  }
  return index;
}

function nearest(evidence: Evidence[], prompt: string): Evidence | undefined {
  const lines = new Set(prompt.split("\n"));
  let best: Evidence | undefined;
  let fewest = Infinity;
  for (const entry of evidence) {
    const archived = entry.prompt.split("\n");
    const diff = archived.length + lines.size - 2 * archived.filter((line) => lines.has(line)).length;
    if (diff < fewest) {
      best = entry;
      fewest = diff;
    }
  }
  return best;
}

function legacyKeys(component: string, model: string) {
  legacyIndex ??= JSON.parse(readFileSync(legacyIndexFile, "utf8")) as LegacyIndex;
  return legacyIndex[indexKey(component, model)] ?? {};
}

/** Replays exact evidence first; a shared-listing change can reuse the same probe's evidence. */
export function replayCall(component: string, model: string): ProbeCall {
  const book = readBook(component, model);
  const aliases = Object.entries(legacyKeys(component, model));
  return replayBook(component, model, {
    ...Object.fromEntries(aliases.flatMap(([key, legacy]) => (book[legacy] ? [[key, book[legacy]]] : []))),
    ...book,
  });
}

export function replayBook(component: string, model: string, book: Book): ProbeCall {
  const index = byProbe(book);
  const chosen = new Map<string, Evidence | undefined>();
  const drift = new Set<string>();
  return async (prompt, sample, format, probe) => {
    const key = recordingKey(model, prompt, format, probe);
    if (!chosen.has(key))
      chosen.set(key, book[key] ?? nearest(index.get(probeKey(probe, format)) ?? [], prompt));
    const hit = chosen.get(key);
    const reply = sampleReply(hit, sample);
    if (reply === undefined)
      throw new Error(
        `No recording for ${component} on ${model}. Run: pnpm llm:check ${component.startsWith("pack/") ? `--pack ${component.slice(5)}` : `--component ${component}`}`,
      );
    if (hit?.prompt !== prompt && !drift.has(key)) {
      drift.add(key);
      console.log(`prompt drift (${drift.size}): ${component} on ${model}, ${probe.id}`);
    }
    return reply;
  };
}
