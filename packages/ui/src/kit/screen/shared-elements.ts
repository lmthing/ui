type Match = { value: string; bounds: DOMRect };
type Shared = { title?: Match; photo?: Match };

function partAt(root: HTMLElement, address: string): HTMLElement | null {
  return root.querySelector(`[data-testid="${CSS.escape(address)}"]`);
}

function photoSource(node: HTMLElement, loaded = true) {
  const photo = node.querySelector("img");
  if (!photo || (loaded && (!photo.complete || !photo.naturalWidth))) return;
  return photo.currentSrc || photo.src;
}

function capture(node: HTMLElement | null, read: (node: HTMLElement) => string | undefined) {
  const value = node && read(node);
  return node && value ? { value, bounds: node.getBoundingClientRect() } : undefined;
}

const titleText = (node: HTMLElement) => node.textContent?.trim();

export function captureShared(root: HTMLElement | null, address: string): Shared | undefined {
  if (!root) return;
  const path = address.split("/");
  if (path.length < 3) return;
  const prefix = path.slice(0, 3).join("/");
  const title = capture(partAt(root, `${prefix}/title`), titleText);
  const photo = capture(partAt(root, `${prefix}/icon`), photoSource);
  return { ...(title && { title }), ...(photo && { photo }) };
}

export function flyShared(
  root: HTMLElement,
  screen: string,
  header: string | undefined,
  origin: Shared,
  shift: number,
  options: KeyframeAnimationOptions,
) {
  const title = header && partAt(root, `${screen}/${header}/title`);
  const photo =
    origin.photo &&
    Array.from(root.querySelectorAll<HTMLElement>("[data-kit-photo]")).find(
      (item) => photoSource(item, false) === origin.photo?.value,
    );
  // The screen can be projected at less than its natural width on the studio stage.
  const scale = root.getBoundingClientRect().width / root.offsetWidth;
  if (!scale) return [];
  return [
    title && origin.title && titleText(title) === origin.title.value
      ? fly(title, origin.title, scale, shift, options, false)
      : undefined,
    photo && origin.photo ? fly(photo, origin.photo, scale, shift, options, true) : undefined,
  ].filter((animation): animation is Animation => Boolean(animation));
}

function fly(
  node: HTMLElement,
  origin: Match,
  scale: number,
  shift: number,
  options: KeyframeAnimationOptions,
  stretch: boolean,
) {
  const dest = node.getBoundingClientRect();
  if (!origin.bounds.height || !dest.height || !dest.width) return;
  const x = (origin.bounds.x - dest.x) / scale - shift;
  const y = (origin.bounds.y - dest.y) / scale;
  const sy = origin.bounds.height / dest.height;
  const sx = stretch ? origin.bounds.width / dest.width : sy;
  return node.animate(
    [
      { transformOrigin: "left top", transform: `translate(${x}px, ${y}px) scale(${sx}, ${sy})` },
      { transformOrigin: "left top", transform: "none" },
    ],
    options,
  );
}
