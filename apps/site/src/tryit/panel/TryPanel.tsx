import { useState } from "react";
import { useRecorded } from "../../data/recorded";
import { Phone } from "../../live/Phone";
import type { Lit } from "../../shared/JsonLine";
import { ActPane } from "./ActPane";
import { CodePane } from "./CodePane";
import { RequestBar } from "./RequestBar";
import { OpenRouterBar } from "./OpenRouterBar";
import { TierBar } from "./TierBar";
import { suggestions } from "../suggestions";
import { useFirstRun } from "../useFirstRun";
import { useTryIt } from "../useTryIt";

/** A model in the visitor's browser writes one screen from the real catalog; the kit draws it as it streams. */
function TryPanelLoaded() {
  const t = useTryIt();
  const [request, setRequest] = useState(suggestions[0]!);
  const [hover, setHover] = useState<string | null>(null);
  const [lit, setLit] = useState<Lit>(null);
  useFirstRun(t.chrome, !!t.openrouter.apiKey, t.run, suggestions[0]!);
  const lighted = lit ? (lit.key ? `${lit.id}/${lit.key}` : lit.id) : undefined;
  const highlight = lighted ?? (t.answer?.ok ? t.answer.address : undefined);
  return (
    <div className="card try">
      <TierBar
        chrome={t.chrome}
        openrouter={
          t.openrouter.apiKey ? (t.openrouter.model ? "free, your key" : "listing models") : "connect"
        }
        gpu={t.gpu}
        local={t.local}
        choice={t.choice}
        engine={t.engine}
        onChoice={t.setChoice}
        onDownload={t.download}
      />
      {(t.choice === "openrouter" || t.openrouter.apiKey) && <OpenRouterBar {...t.openrouter} />}
      <RequestBar
        request={request}
        setRequest={setRequest}
        suggestions={suggestions}
        running={t.running}
        run={t.run}
        stop={t.stop}
      />
      <p className="status" role="status">
        {t.status}
      </p>
      <div className="try-grid">
        <div className="try-code">
          <CodePane written={t.written} partial={t.running} lit={lit} onLit={setLit} />
          <ActPane
            enabled={!t.running && t.engine !== null && t.engine.tier !== 4}
            tier={t.engine?.tier ?? null}
            view={t.view}
            answer={t.answer}
            onAct={t.act}
          />
        </div>
        <div className="try-phone">
          <Phone
            screen={t.screen}
            width={360}
            height={600}
            highlight={highlight}
            onHover={setHover}
            label={`${t.screen.components.length} components validated`}
          />
          <p className="addr-tip">{hover ? `address: ${hover}` : ""}</p>
        </div>
      </div>
      <p className="muted try-note">
        Tiny on-device models write simpler apps than the production pipeline (Listener, Director, parallel
        Writers, code Validator, Critic). Validation here is the catalog's own Zod schemas plus a few small
        repairs; the full repair pipeline is planned.
      </p>
    </div>
  );
}

/** The panel replays recorded output, so it waits for that chunk before it first runs. */
export default function TryPanel() {
  return useRecorded() ? <TryPanelLoaded /> : <div className="skeleton" aria-busy="true" />;
}
