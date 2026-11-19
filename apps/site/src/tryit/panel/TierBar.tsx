import type { Engine } from "../engines/types";
import { webllmModel } from "../engines/webllm";
import type { Choice, Local } from "../useEngines";

type Props = {
  chrome: string;
  gpu: boolean;
  local: Local;
  choice: Choice;
  engine: Engine | null;
  onChoice: (choice: Choice) => void;
  onDownload: () => void;
};

const chromeNote: Record<string, string> = {
  available: "ready",
  downloadable: "will download on first use",
  downloading: "downloading",
  unavailable: "not available in this browser",
  checking: "checking",
};

/** Which tiers this browser has, an explicit local download, and which model is running. */
export function TierBar({ chrome, gpu, local, choice, engine, onChoice, onDownload }: Props) {
  const chromeOk = ["available", "downloadable", "downloading"].includes(chrome);
  const options: [Choice, string, string, boolean][] = [
    ["auto", "Best available", "", true],
    ["chrome", "1 Chrome built-in AI", chromeNote[chrome] ?? chrome, chromeOk],
    [
      "webllm",
      "2 WebLLM",
      gpu ? (local === "ready" ? "ready" : "needs download") : "needs WebGPU",
      local === "ready",
    ],
    ["replay", "3 Recorded replay", "always available", true],
  ];
  return (
    <div className="tiers">
      <div className="tabs" role="radiogroup" aria-label="Where the model runs">
        {options.map(([value, label, note, enabled]) => (
          <button
            key={value}
            role="radio"
            aria-checked={choice === value}
            disabled={!enabled}
            onClick={() => onChoice(value)}
          >
            {label}
            {note && <small> · {note}</small>}
          </button>
        ))}
      </div>
      {gpu && local !== "ready" && (
        <button className="btn" disabled={local === "loading"} onClick={onDownload}>
          {local === "loading" ? "Downloading..." : "Download a ~1 GB model to run locally"}
        </button>
      )}
      {gpu && local !== "ready" && (
        <p className="muted">
          Optional. {webllmModel.replace("-MLC", "")} via WebLLM, cached in your browser; nothing downloads
          until you click.
        </p>
      )}
      <p className="running" aria-live="polite">
        {engine ? (
          <>
            Running: <b>{engine.label}</b>, {engine.model}
          </>
        ) : (
          "No run yet. Pick a request and press Build."
        )}
      </p>
    </div>
  );
}
