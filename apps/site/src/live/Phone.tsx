import { useEffect, useRef } from "react";
import { TamaguiProvider } from "tamagui";
import type { ActStep, ScreenLike } from "@lmthing/ui/catalog";
import { PhoneScreen } from "@lmthing/ui/kit";
import { config, galleryParts, resolvePhoto } from "../../../gallery";
import "../../../gallery/app/fonts";
import { useTheme, type ThemeState } from "../theme/ThemeContext";

export type PhoneProps = {
  screen: ScreenLike;
  width?: number;
  /** The tallest the frame grows; it fits its content from `minHeight` up to this. */
  height?: number;
  minHeight?: number;
  /** Hold the frame at `height` so nothing around it shifts while the screen grows. */
  fixed?: boolean;
  /** Fixed theme for this phone (worked examples in all three presets). Default: the page's theme. */
  theme?: Partial<ThemeState>;
  /** An address to outline, e.g. `t1/next`. */
  highlight?: string | undefined;
  /** Called with the address under the pointer, or null. */
  onHover?: ((address: string | null) => void) | undefined;
  onAction?: ((step: ActStep) => void) | undefined;
  label?: string;
};

const addressOf = (target: EventTarget | null, screen: string) => {
  const node = (target as HTMLElement | null)?.closest?.("[data-testid]");
  const id = node?.getAttribute("data-testid") ?? "";
  return id.startsWith(`${screen}/`) ? id : null;
};

/** The element for an address: the exact part, else the item or component's root, else its first part. */
function findPart(root: HTMLElement, address: string): Element | null {
  const by = (op: string, value: string) =>
    root.querySelector(`[data-testid${op}="${value.replace(/"/g, '\\"')}"]`);
  for (let at = address; at.includes("/"); at = at.slice(0, at.lastIndexOf("/"))) {
    const found = by("", at) ?? by("", `${at}/root`) ?? by("^", `${at}/`);
    if (found) return found;
  }
  return null;
}

/** A live kit screen in a phone frame. The frame's width is one of the shared phone widths. */
export function Phone({
  screen,
  width = 390,
  height = 640,
  minHeight = 300,
  fixed = false,
  theme,
  highlight,
  onHover,
  onAction,
  label,
}: PhoneProps) {
  const page = useTheme();
  const choice = {
    preset: theme?.preset ?? page.preset,
    accent: theme?.accent ?? page.accent,
    mode: theme?.mode ?? page.mode,
  };
  const frame = useRef<HTMLDivElement>(null);
  const look = `${choice.preset}/${choice.accent}/${choice.mode}`;
  const first = useRef(true);
  useEffect(() => {
    // A theme switch cross-fades the screen instead of snapping, unless motion is reduced.
    if (first.current) return void (first.current = false);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    frame.current?.animate([{ opacity: 0.45 }, { opacity: 1 }], { duration: 520, easing: "ease-out" });
  }, [look]);
  useEffect(() => {
    const root = frame.current;
    if (!root) return;
    root.querySelectorAll(".addr-hit").forEach((n) => n.classList.remove("addr-hit"));
    if (highlight) findPart(root, `${screen.id}/${highlight}`)?.classList.add("addr-hit");
  }, [highlight, screen]);
  return (
    <figure className="phone" style={{ width: width + 16, maxWidth: "100%" }} aria-label={label}>
      <div
        ref={frame}
        className="phone-screen"
        style={{ minHeight: fixed ? height : minHeight, maxHeight: height }}
        onPointerMove={onHover ? (e) => onHover(addressOf(e.target, screen.id)) : undefined}
        onPointerLeave={onHover ? () => onHover(null) : undefined}
      >
        <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss" disableRootThemeClass>
          <div style={{ width, maxWidth: "100%" }}>
            <PhoneScreen
              screen={screen}
              theme={choice as never}
              parts={galleryParts}
              resolvePhoto={(ref) => resolvePhoto(ref, choice as never)}
              onAction={onAction}
            />
          </div>
        </TamaguiProvider>
      </div>
      {label && <figcaption>{label}</figcaption>}
    </figure>
  );
}
