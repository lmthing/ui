import { motion } from "../../catalog";

type TabGhost = { canvas: HTMLElement; restoreScroll(): void };

/** Draw the outgoing tab without retaining a second controller or a second address tree. */
export function captureTab(node: HTMLElement | null): TabGhost | undefined {
  if (!node) return;
  const canvas = node.cloneNode(true) as HTMLElement;
  const originals = Array.from(node.querySelectorAll<HTMLElement>("*"));
  const mirrors = Array.from(canvas.querySelectorAll<HTMLElement>("*"));
  const scroll = originals.flatMap((original, index) =>
    original.scrollTop || original.scrollLeft
      ? [{ mirror: mirrors[index]!, top: original.scrollTop, left: original.scrollLeft }]
      : [],
  );
  // No custom elements or independently active documents/media in the outgoing picture.
  for (const element of [canvas, ...mirrors]) {
    if (
      element.matches("audio, video, iframe, object, embed, script, link, style") ||
      element.localName.includes("-")
    ) {
      element.remove();
      continue;
    }
    element.removeAttribute("id");
    element.removeAttribute("data-testid");
    element.removeAttribute("autofocus");
    element.removeAttribute("aria-live");
  }
  canvas.dataset.kitOutgoingTab = "";
  canvas.setAttribute("inert", "");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "absolute", inset: "0", pointerEvents: "none" });
  return {
    canvas,
    restoreScroll() {
      for (const { mirror, top, left } of scroll) {
        mirror.scrollTop = top;
        mirror.scrollLeft = left;
      }
    },
  };
}

export function fadeTab(node: HTMLElement, ghost: TabGhost, options: KeyframeAnimationOptions) {
  node.before(ghost.canvas);
  ghost.restoreScroll();
  const incoming = node.animate([{ opacity: motion.reducedFadeStart }, { opacity: 1 }], options);
  const clean = () => ghost.canvas.remove();
  void incoming.finished.then(clean, clean);
  return () => {
    incoming.cancel();
    clean();
  };
}
