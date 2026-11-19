import { useEffect, useRef, useState } from "react";

const duration = 1100;
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A number that counts up when it first scrolls into view. */
export function Counter({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(reduced() ? to : 0);
  useEffect(() => {
    const node = ref.current;
    if (!node || reduced()) return setValue(to);
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        setValue(Math.round(to * (1 - (1 - t) ** 3)));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    observer.observe(node);
    return () => (observer.disconnect(), cancelAnimationFrame(frame));
  }, [to]);
  return <span ref={ref}>{value}</span>;
}
