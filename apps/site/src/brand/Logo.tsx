import { markOutline, markParts, wordDots, wordSlash, wordStrokes, wordWidth } from "./paths";

/** The mark. Its three parts snap in one after another on load, like ops folding in. */
export function Mark({ size = 30, animate = true }: { size?: number; animate?: boolean }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      aria-hidden="true"
      className={animate ? "mark animate" : "mark"}
    >
      <rect {...markOutline} fill="none" stroke="currentColor" strokeWidth="3" />
      {markParts.map((p, i) => (
        <rect
          key={i}
          x={p.x}
          y={p.y}
          width={p.width}
          height={p.height}
          rx="1.6"
          className={`part p${i}`}
          fill={p.accent ? "var(--accent)" : "currentColor"}
        />
      ))}
    </svg>
  );
}

/** The wordmark, drawn as paths. */
export function Wordmark({ height = 26 }: { height?: number }) {
  return (
    <svg
      viewBox={`0 -2 ${wordWidth} 40`}
      height={height}
      width={(height * wordWidth) / 40}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {wordStrokes.map((d) => (
        <path key={d} d={d} />
      ))}
      <path d={wordSlash} stroke="var(--accent)" />
      {wordDots.map((x) => (
        <circle key={x} cx={x} cy="5" r="2.7" fill="var(--accent)" stroke="none" />
      ))}
    </svg>
  );
}

export function Logo() {
  return (
    <span className="logo">
      <Mark />
      <Wordmark />
      <span className="sr-only">lmthing/ui</span>
    </span>
  );
}
