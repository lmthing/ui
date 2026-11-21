export { componentFilter, selectedIds, selectedEntries, selectedLayouts, wholePack } from "./test-filters";

export async function prepareChangedRun(root: string, base: string) {
  const { prepareChangedRun: prepare } = await import("./changed-tests");
  return prepare(root, base);
}
