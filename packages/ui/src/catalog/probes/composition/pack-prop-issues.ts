import type { CoreArchetypeMeta } from "../../archetypes";
import type { ScreenLike } from "../../agent";
import type { Definition } from "..";

/** Scalar pack seed props specify the layout; arrays and objects may supply example content. */
export function packPropIssues(
  screen: ScreenLike,
  lines: CoreArchetypeMeta["defaults"][string],
  defs: Record<string, Definition>,
): string[] {
  const counts = new Map<string, number>();
  return screen.components.flatMap(({ id, c, state: _state, ...input }) => {
    const matching = lines.filter((line) => line.c === c);
    const index = counts.get(c) ?? 0;
    counts.set(c, index + 1);
    const line = matching.length === 1 ? matching[0] : matching[index];
    if (!line?.seed) return [];
    const constraints = Object.entries(line.seed).filter(
      ([key, value]) =>
        (value === null || ["string", "number", "boolean"].includes(typeof value)) &&
        !(line.variant && key === (c === "Field" || c === "Camera" ? "kind" : "style")),
    );
    if (!constraints.length) return [];
    const parsed = defs[c]?.props.safeParse(input);
    if (!parsed?.success) return []; // checkScreen already reports schema failures.
    return constraints
      .filter(([key, value]) => parsed.data[key] !== value)
      .map(([key, value]) => `Layout requires ${c}.${key} = ${JSON.stringify(value)} (${id})`);
  });
}
