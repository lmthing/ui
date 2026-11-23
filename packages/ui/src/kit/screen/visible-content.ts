import type { Definition, Meta, ScreenLike } from "../../catalog";

/** Keep host-only display visibility out of the saved screen and its validation. */
export function filterVisibleContent(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  resolvePhoto: Parameters<NonNullable<Meta["viewVisible"]>>[1],
): ScreenLike {
  const components = screen.components.filter(({ c, state = "filled", ...input }) => {
    const visible = defs[c]?.meta.viewVisible;
    return state !== "filled" || !visible || visible(input, resolvePhoto);
  });
  return components.length === screen.components.length ? screen : { ...screen, components };
}
