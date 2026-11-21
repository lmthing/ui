import type { RenderedElement } from "../render";

export function hasColumnTarget(group: RenderedElement, action: string): boolean {
  if (!group.attributes.includes("data-kit-move-item=") || !/\brole="group"/.test(group.attributes))
    return false;
  if (action === "press")
    return group.children.some(
      ({ attributes }) => /\brole="link"/.test(attributes) && !/\bdata-testid=/.test(attributes),
    );
  if (action !== "move") return false;
  const row = group.children.flatMap(({ children }) => children.flatMap((child) => child.children));
  return row.some(
    ({ attributes }) =>
      /\brole="button"/.test(attributes) &&
      /\baria-label="[^"]+"/.test(attributes) &&
      !/\bdata-testid=/.test(attributes) &&
      attributes.includes('data-step-action="move"'),
  );
}
