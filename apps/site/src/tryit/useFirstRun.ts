import { useEffect } from "react";

/** With no on-device model to wait for, show a real recorded run at once so the panel is never empty. */
export function useFirstRun(
  chrome: string,
  connected: boolean,
  run: (request: string) => void,
  request: string,
) {
  useEffect(() => {
    // A connected OpenRouter account waits for Build, so no free request is spent on page load.
    if (!connected && chrome !== "checking" && !["available", "downloadable", "downloading"].includes(chrome))
      run(request);
    // The run is started once, when Chrome's availability is known.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chrome]);
}
