import { useEffect, useState } from "react";

/** True once the page has loaded and the browser is idle: the moment it is fine to start heavy code. */
export function useAfterLoad(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const go = () => {
      const idle = (globalThis as { requestIdleCallback?: (cb: () => void, o?: object) => void })
        .requestIdleCallback;
      if (idle) idle(() => setReady(true), { timeout: 2500 });
      else setTimeout(() => setReady(true), 800);
    };
    if (document.readyState === "complete") go();
    else addEventListener("load", go, { once: true });
    return () => removeEventListener("load", go);
  }, []);
  return ready;
}
