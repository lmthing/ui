import { useEffect, useRef, useState, type ReactNode } from "react";

type Mode = "shown" | "hidden" | "seen";

/**
 * Content is visible by default. Only sections that start below the fold are hidden, from script and just
 * before they are observed, then eased in as they arrive. Printing, readers and reduced motion see it all.
 */
export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("shown");
  useEffect(() => {
    const node = ref.current;
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!node || calm || typeof IntersectionObserver === "undefined") return;
    if (node.getBoundingClientRect().top < innerHeight) return;
    setMode("hidden");
    const watch = new IntersectionObserver(
      ([e]) => e?.isIntersecting && (setMode("seen"), watch.disconnect()),
      {
        rootMargin: "0px 0px -8% 0px",
      },
    );
    watch.observe(node);
    // A reader that never scrolls still gets the content, a moment after load.
    const fallback = setTimeout(() => (setMode("seen"), watch.disconnect()), 2500);
    return () => (watch.disconnect(), clearTimeout(fallback));
  }, []);
  return (
    <div ref={ref} className={`reveal ${mode} ${className}`}>
      {children}
    </div>
  );
}
