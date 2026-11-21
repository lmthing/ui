import { execFileSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { createInterface } from "node:readline";
import { componentPath, currentDefinitionSource, definitionSource } from "../component-definition";
import type { Book, Evidence } from "../recordings";

const cwd = fileURLToPath(new URL("../../../../../", import.meta.url));
const recordings = "packages/ui/test/recordings/";
type Refresh = { commit: string; requests: Record<string, string[]> };

function gitShow(object: string): string {
  return execFileSync("git", ["show", object], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
}

/** Identical samples after the full core refresh do not show up as additions in Git. */
function verifiedCoreRefresh() {
  // These are the exact requests emitted by the cited commit's own core probe runner and registry.
  const first = JSON.parse(
    readFileSync(new URL("./core-refresh-requests.json", import.meta.url), "utf8"),
  ) as Refresh & { followUps: Refresh[] };
  const refreshes = [...first.followUps, first];
  const books = new Map<string, Book>();
  return (book: string, key: string, entry: Evidence): string | undefined => {
    for (const { commit, requests } of refreshes) {
      if (!requests[book]?.includes(key)) continue;
      const object = `${commit}:${recordings}${book}.json`;
      if (!books.has(object)) books.set(object, JSON.parse(gitShow(object)) as Book);
      if (JSON.stringify(books.get(object)?.[key]) === JSON.stringify(entry)) return commit;
    }
  };
}

/** Multiple branches may have recorded the same full request under different definitions. */
export async function recordedAt() {
  const child = spawn(
    "git",
    [
      "log",
      "--full-history",
      "--no-merges",
      "--no-renames",
      "--format=%H",
      "--unified=0",
      "-p",
      "--",
      recordings,
    ],
    { cwd, stdio: ["ignore", "pipe", "inherit"] },
  );
  const done = new Promise<void>((resolve, reject) => {
    child.on("error", reject);
    child.once("close", (code) => (code === 0 ? resolve() : reject(new Error(`git log exited ${code}`))));
  });
  const origins = new Map<string, Set<string>>();
  let commit = "",
    book = "";
  for await (const line of createInterface({ input: child.stdout })) {
    if (/^[0-9a-f]{40}$/.test(line)) commit = line;
    if (line.startsWith("+++ "))
      book = line.startsWith(`+++ b/${recordings}`) ? line.slice(6 + recordings.length, -5) : "";
    const key = /^\+ {2}"([0-9a-f]{16})": \{$/.exec(line)?.[1];
    if (!commit || !book || !key) continue;
    const request = `${book}/${key}`;
    const changes = origins.get(request) ?? new Set<string>();
    changes.add(commit);
    origins.set(request, changes);
  }
  await done;
  return origins;
}

export function matchesRecordedDefinition(origins: Awaited<ReturnType<typeof recordedAt>>) {
  const sources = new Map<string, string>();
  const verifiedRefresh = verifiedCoreRefresh();
  return (book: string, key: string, component: string, entry: Evidence) => {
    const path = componentPath(component);
    const current = currentDefinitionSource(component);
    const commits = origins.get(`${book}/${key}`);
    if (!path || !current) return false;
    const refresh = verifiedRefresh(book, key, entry);
    if (!refresh && !commits?.size) return false;
    return (refresh ? [refresh] : [...commits!]).every((commit) => {
      const object = `${commit}:packages/ui/src/${path}`;
      if (!sources.has(object)) {
        let source = "";
        try {
          source = gitShow(object);
        } catch {}
        sources.set(object, definitionSource(source));
      }
      return sources.get(object) === current;
    });
  };
}
