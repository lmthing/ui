import { useEffect, useState } from "react";
import { Phone } from "../../live/Phone";
import { ActPane } from "./ActPane";
import { CodePane } from "./CodePane";
import { RequestBar } from "./RequestBar";
import { TierBar } from "./TierBar";
import { useTryIt } from "../useTryIt";

const suggestions = ["a plant care app", "a dog walking business", "a weekly meal planner", "a workout log"];

/** A model in the visitor's browser writes one screen from the real catalog; the kit draws it as it streams. */
export default function TryPanel() {
  const t = useTryIt();
  const [request, setRequest] = useState(suggestions[0]!);
  const [hover, setHover] = useState<string | null>(null);
  // With no on-device model to wait for, show a real recorded run straight away so the panel is never empty.
  const { chrome, run } = t;
  useEffect(() => {
    if (chrome !== "checking" && !["available", "downloadable", "downloading"].includes(chrome))
      run(suggestions[0]!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chrome]);
  const highlight = t.answer?.ok ? t.answer.address : undefined;
  return (
    <div className="card try">
      <TierBar
        chrome={t.chrome}
        gpu={t.gpu}
        local={t.local}
        choice={t.choice}
        engine={t.engine}
        onChoice={t.setChoice}
        onDownload={t.download}
      />
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
          <CodePane written={t.written} partial={t.running} />
          <ActPane
            enabled={!t.running && t.engine !== null && t.engine.tier !== 3}
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
