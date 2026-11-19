import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Renders `children` (a code-split live view) only once the spot is near the viewport, and shows `fallback` of
 * the same size until then, so below-the-fold kit code never competes with what the visitor is looking at.
 */
export function WhenNear({
  children,
  fallback,
  margin = "400px",
  inline = false,
}: {
  children: ReactNode;
  fallback: ReactNode;
  margin?: string;
  inline?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return setNear(true);
    const watch = new IntersectionObserver(
      ([e]) => e?.isIntersecting && (setNear(true), watch.disconnect()),
      { rootMargin: margin },
    );
    watch.observe(node);
    return () => watch.disconnect();
  }, [margin]);
  const Tag = inline ? "span" : "div";
  return <Tag ref={ref as never}>{near ? children : fallback}</Tag>;
}
