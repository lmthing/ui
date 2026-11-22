import { PrivateMarkContext, type PrivateMarkAdapter } from "@lmthing/ui/kit";
import type { ReactNode } from "react";

const draftRef = "local:synthetic";
const flourish =
  "M9 29c18-3 32-23 22-23-10 0-21 28-8 28 8 0 18-19 23-18 5 1-3 15 3 15 8 0 12-9 18-9s2 7 9 6l13-4M18 37l69-2";
const initials = "M38 30l11-21 11 21M41 25l16-1M55 33l8-3";

function demoAdapter(path: string): PrivateMarkAdapter {
  return {
    Surface: ({ children }) => children,
    resolve: (_address, reference) =>
      reference === draftRef ? (
        <svg viewBox="0 0 100 42" width="100%" height="100%" aria-hidden>
          <path d={path} stroke="var(--text)" fill="none" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : undefined,
  };
}

const signatures = demoAdapter(flourish);
const initialMarks = demoAdapter(initials);

/** The static gallery can resolve only the component's synthetic draft, never a host reference. */
export function SignaturePreview({ children, style }: { children: ReactNode; style: unknown }) {
  return (
    <PrivateMarkContext.Provider value={style === "initials" ? initialMarks : signatures}>
      {children}
    </PrivateMarkContext.Provider>
  );
}
