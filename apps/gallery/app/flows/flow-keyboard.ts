// The web preview renders some kit links and buttons as non-native elements.
export function activateFlowControl(event: {
  target: unknown;
  key?: string | undefined;
  repeat?: boolean | undefined;
  defaultPrevented?: boolean | undefined;
  preventDefault: () => void;
}) {
  if (event.defaultPrevented || event.repeat || (event.key !== "Enter" && event.key !== " ")) return;
  const node = event.target;
  if (
    !(node instanceof HTMLDivElement) ||
    !node.matches('[data-testid][role="button"], [data-kit-row][role="link"]') ||
    node.closest('[inert], [aria-disabled="true"]')
  )
    return;
  event.preventDefault();
  node.click();
}
