type Shared = { text: string; bounds: DOMRect };

function partAt(root: HTMLElement, address: string): HTMLElement | null {
  return root.querySelector(`[data-testid="${CSS.escape(address)}"]`);
}

export function captureTitle(root: HTMLElement | null, address: string): Shared | undefined {
  if (!root) return;
  const path = address.split("/");
  if (path.length !== 4) return;
  const title = partAt(root, [...path.slice(0, 3), "title"].join("/"));
  const text = title?.textContent?.trim();
  if (title && text) return { text, bounds: title.getBoundingClientRect() };
}

export function flyTitle(
  root: HTMLElement,
  screen: string,
  header: string | undefined,
  origin: Shared,
  shift: number,
  options: KeyframeAnimationOptions,
) {
  if (!header) return;
  const title = partAt(root, `${screen}/${header}/title`);
  if (!title || title.textContent?.trim() !== origin.text) return;
  const dest = title.getBoundingClientRect();
  // The screen can be projected at less than its natural width on the studio stage.
  const scale = root.getBoundingClientRect().width / root.offsetWidth;
  if (!scale || !origin.bounds.height || !dest.height) return;
  const x = (origin.bounds.x - dest.x) / scale - shift;
  const y = (origin.bounds.y - dest.y) / scale;
  const size = origin.bounds.height / dest.height;
  return title.animate(
    [
      { transformOrigin: "left top", transform: `translate(${x}px, ${y}px) scale(${size})` },
      { transformOrigin: "left top", transform: "none" },
    ],
    options,
  );
}
