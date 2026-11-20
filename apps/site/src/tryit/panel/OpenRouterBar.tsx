import { useState } from "react";
import { maskKey, type OpenRouterState, type Support } from "../openrouter";

const held: Record<Support, string> = {
  schema: "strict schema",
  json: "JSON mode",
  text: "instructions only",
};

/** Tier 3: connect an OpenRouter account (or paste a key), then pick one of its free models. */
export function OpenRouterBar({
  apiKey,
  models,
  model,
  pickModel,
  connect,
  paste,
  disconnect,
}: OpenRouterState) {
  const [pasted, setPasted] = useState("");
  if (!apiKey)
    return (
      <div className="orbar">
        <div className="orrow">
          <button className="btn primary" onClick={connect}>
            Connect OpenRouter
          </button>
          <span className="muted">or</span>
          <input
            type="password"
            aria-label="Paste an OpenRouter key"
            placeholder="paste a key, sk-or-…"
            autoComplete="off"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (paste(pasted), setPasted(""))}
          />
          <button className="btn" disabled={!pasted.trim()} onClick={() => (paste(pasted), setPasted(""))}>
            Use key
          </button>
        </div>
        <Privacy />
      </div>
    );
  return (
    <div className="orbar">
      <div className="orrow">
        <span className="orkey">
          Connected <code>{maskKey(apiKey)}</code>
        </span>
        <select
          aria-label="Free model"
          value={model?.id ?? ""}
          disabled={!models.length}
          onChange={(e) => pickModel(e.target.value)}
        >
          {!models.length && <option value="">Listing free models…</option>}
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} · {held[m.support]}
            </option>
          ))}
        </select>
        <button className="btn" onClick={disconnect}>
          Disconnect
        </button>
      </div>
      <Privacy />
    </div>
  );
}

function Privacy() {
  return (
    <p className="muted">
      Free models only, on your own OpenRouter account (free; about 50 requests a day). The key stays in this
      browser and goes only to openrouter.ai. Your request goes to OpenRouter and the model's provider, and
      some free providers keep prompts.
    </p>
  );
}
