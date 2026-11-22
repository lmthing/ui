const otherModes = ["--component", "--pack", "--compose", "--merges"];

/** Do not silently turn a scoped probe run into a full Director sweep. */
export function directorMode(args: readonly string[]): boolean {
  if (!args.includes("--director")) return false;
  const conflict = otherModes.find((flag) => args.includes(flag));
  if (conflict) throw new Error(`--director cannot be combined with ${conflict}`);
  return true;
}
