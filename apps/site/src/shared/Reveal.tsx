import { useEffect, useRef, useState, type ReactNode } from "react";

/** Fades and lifts its children in when they scroll into view. Plain content when motion is reduced. */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return setSeen(true);
    const observer = new IntersectionObserver(
      ([entry]) => entry?.isIntersecting && (setSeen(true), observer.disconnect()),
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`reveal ${seen ? "seen" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
