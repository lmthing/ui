import { useState } from "react";

/** A quiet link to a page's Markdown twin, and optionally a button that copies that Markdown. */
export function TextLinks({ path, copy = false }: { path: string; copy?: boolean }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const onCopy = async () => {
    try {
      const text = await (await fetch(path)).text();
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2200);
  };
  return (
    <p className="textfor">
      <a href={path}>Text for LLMs</a>
      {copy && (
        <button type="button" onClick={onCopy} aria-live="polite">
          {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy as Markdown"}
        </button>
      )}
    </p>
  );
}
