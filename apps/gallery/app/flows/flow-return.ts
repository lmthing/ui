export type FlowReturn = { index: number; address: string; scroll: number | undefined };

function part(address: string) {
  return (
    document.querySelector<HTMLElement>(`[data-testid="${CSS.escape(address)}"]`) ??
    document.querySelector<HTMLElement>(`[data-testid="${CSS.escape(`${address}/root`)}"]`)
  );
}

function scroller(node: HTMLElement | null) {
  for (let parent = node?.parentElement; parent; parent = parent.parentElement) {
    if (["auto", "scroll"].includes(getComputedStyle(parent).overflowY)) return parent;
  }
}

export function captureReturn(index: number, address: string): FlowReturn {
  return { index, address, scroll: scroller(part(address))?.scrollTop };
}

export function restoreReturn({ address, scroll }: FlowReturn) {
  const node = part(address);
  const body = scroller(node);
  if (body && scroll !== undefined) body.scrollTop = scroll;
  node?.focus({ preventScroll: true });
}

export function focusFlowPart(address: string) {
  part(address)?.focus();
}
