import { useCallback, useEffect, useState } from "react";
import { pendingConnect, startConnect } from "./connect";
import { keyEvent, looksLikeKey, readKey, saveKey } from "./key";
import { defaultModel, fetchFreeModels, type FreeModel } from "./models";

const modelSlot = "lmthing-openrouter-model";
const remembered = () => {
  try {
    return localStorage.getItem(modelSlot);
  } catch {
    return null;
  }
};

/** The visitor's OpenRouter connection: their key, the live free models, and the model they picked. */
export function useOpenRouter(onStatus: (status: string) => void, onConnected: () => void) {
  const [key, setKey] = useState<string | null>(readKey);
  const [models, setModels] = useState<FreeModel[]>([]);
  const [modelId, setModelId] = useState<string | null>(remembered);
  useEffect(() => {
    const sync = () => setKey(readKey());
    addEventListener(keyEvent, sync);
    return () => removeEventListener(keyEvent, sync);
  }, []);
  useEffect(() => {
    pendingConnect()?.then(
      () => (onConnected(), onStatus("Connected to OpenRouter. Pick a free model and press Build.")),
      (error: Error) => onStatus(`OpenRouter sign-in failed: ${error.message}`),
    );
    // Reported once, when the panel first mounts after the return from openrouter.ai.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!key || models.length) return;
    fetchFreeModels()
      .then(setModels)
      .catch((error: Error) => onStatus(`Could not list OpenRouter's free models: ${error.message}`));
  }, [key, models.length, onStatus]);
  const model = models.find((m) => m.id === modelId) ?? defaultModel(models) ?? null;
  const pickModel = useCallback((id: string) => {
    setModelId(id);
    try {
      localStorage.setItem(modelSlot, id);
    } catch {
      /* remembered for this page only */
    }
  }, []);
  const paste = useCallback(
    (text: string) => {
      if (!looksLikeKey(text)) return onStatus("That does not look like an OpenRouter key (sk-or-…).");
      saveKey(text.trim());
      onConnected();
      onStatus("Key saved in this browser only. Pick a free model and press Build.");
    },
    [onStatus, onConnected],
  );
  const connect = useCallback(() => void startConnect(), []);
  const disconnect = useCallback(
    () => (saveKey(null), onStatus("Disconnected; the key is forgotten.")),
    [onStatus],
  );
  return { apiKey: key, models, model, pickModel, connect, paste, disconnect };
}

export type OpenRouterState = ReturnType<typeof useOpenRouter>;
