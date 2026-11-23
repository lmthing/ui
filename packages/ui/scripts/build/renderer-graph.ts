import type { Metafile } from "esbuild";

export function localBundleFiles(meta: Metafile, entry: string) {
  const seen = new Set<string>();
  function visit(file: string) {
    if (seen.has(file)) return;
    seen.add(file);
    for (const edge of meta.outputs[file]!.imports) {
      if (!edge.external && edge.kind !== "dynamic-import") visit(edge.path);
    }
  }
  visit(entry);
  return seen;
}

export function checkRendererScope(meta: Metafile, entry: string, pack?: string) {
  for (const file of localBundleFiles(meta, entry)) {
    const inputs = meta.outputs[file]!.inputs;
    for (const [input, { bytesInOutput }] of Object.entries(inputs)) {
      const owner = input.match(/(?:^|\/)src\/packs\/([^/]+)\//)?.[1];
      if (bytesInOutput && owner && owner !== pack)
        throw new Error(`Unexpected ${owner} pack in ${entry}: ${input}`);
    }
  }
}
