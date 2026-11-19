import { useEffect } from "react";

/** With no on-device model to wait for, show a real recorded run at once so the panel is never empty. */
export function useFirstRun(chrome: string, run: (request: string) => void, request: string) {
  useEffect(() => {
    if (chrome !== "checking" && !["available", "downloadable", "downloading"].includes(chrome)) run(request);
    // The run is started once, when Chrome's availability is known.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chrome]);
}
