import { useCallback, useEffect, useState } from "react";
import { chromeAiAvailability, chromeEngine } from "./engines/chrome-ai";
import { replayEngine } from "./engines/replay";
import type { Engine } from "./engines/types";
import { hasWebGpu, webllmEngine } from "./engines/webllm";

export type Choice = "auto" | "chrome" | "webllm" | "replay";
export type Local = "idle" | "loading" | "ready" | "failed";

const webllm = webllmEngine();

/** Which engines this browser can run, the visitor's choice, and the explicit local-model download. */
export function useEngines(onStatus: (status: string) => void) {
  const [chrome, setChrome] = useState("checking");
  const [gpu, setGpu] = useState(false);
  const [local, setLocal] = useState<Local>("idle");
  const [choice, setChoice] = useState<Choice>("auto");
  useEffect(() => {
    chromeAiAvailability().then(setChrome);
    hasWebGpu().then(setGpu);
  }, []);
  const usable = ["available", "downloadable", "downloading"].includes(chrome);
  const pick = useCallback(
    (request: string): Engine => {
      if ((choice === "chrome" || choice === "auto") && usable) return chromeEngine();
      if ((choice === "webllm" || choice === "auto") && local === "ready") return webllm;
      return replayEngine(request);
    },
    [choice, usable, local],
  );
  const download = useCallback(async () => {
    setLocal("loading");
    try {
      await webllm.prepare(onStatus);
      setLocal("ready");
      setChoice("webllm");
      onStatus("The local model is ready.");
    } catch (error) {
      setLocal("failed");
      onStatus(`The download failed: ${(error as Error).message}`);
    }
  }, [onStatus]);
  return { chrome, gpu, usable, local, choice, setChoice, pick, download };
}
