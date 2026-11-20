import { useCallback, useEffect, useState } from "react";
import { chromeAiAvailability, chromeEngine } from "./engines/chrome-ai";
import { replayEngine } from "./engines/replay";
import type { Engine } from "./engines/types";
import { hasWebGpu, webllmEngine } from "./engines/webllm";
import { openRouterEngine, useOpenRouter } from "./openrouter";

export type Choice = "auto" | "chrome" | "webllm" | "openrouter" | "replay";
export type Local = "idle" | "loading" | "ready" | "failed";

const webllm = webllmEngine();

/** Which engines this browser can run, the visitor's choice, and the explicit local-model download. */
export function useEngines(onStatus: (status: string) => void) {
  const [chrome, setChrome] = useState("checking");
  const [gpu, setGpu] = useState(false);
  const [local, setLocal] = useState<Local>("idle");
  const [choice, setChoice] = useState<Choice>("auto");
  const toOpenRouter = useCallback(() => setChoice("openrouter"), []);
  const openrouter = useOpenRouter(onStatus, toOpenRouter);
  useEffect(() => {
    chromeAiAvailability().then(setChrome);
    hasWebGpu().then(setGpu);
  }, []);
  const usable = ["available", "downloadable", "downloading"].includes(chrome);
  const { apiKey: key, model } = openrouter;
  const pick = useCallback(
    (request: string): Engine => {
      if ((choice === "chrome" || choice === "auto") && usable) return chromeEngine();
      if ((choice === "webllm" || choice === "auto") && local === "ready") return webllm;
      if ((choice === "openrouter" || choice === "auto") && key && model) return openRouterEngine(key, model);
      return replayEngine(request);
    },
    [choice, usable, local, key, model],
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
  return { chrome, gpu, usable, local, choice, setChoice, pick, download, openrouter };
}
