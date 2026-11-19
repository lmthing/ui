import { useMemo, useState } from "react";
import { Phone } from "../live/Phone";
import { Json } from "../shared/Json";
import { matchedProbes } from "./probes";

/** View: the compact text a model reads. Act: the address and action it answered, resolved on the phone. */
export default function ViewActDemo() {
  const all = useMemo(() => matchedProbes(), []);
  const [at, setAt] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const current = all[at];
  if (!current) return <p className="lede">No recorded read probes matched at build time.</p>;
  const { probe, screen } = current;
  const answer = JSON.stringify({ address: probe.address, action: probe.action });
  return (
    <div className="viewact">
      <div className="va-text">
        <div className="tabs" role="tablist" aria-label="Choose a task">
          {all.map((m, i) => (
            <button
              key={m.probe.task + i}
              role="tab"
              aria-selected={i === at}
              onClick={() => (setAt(i), setAnswered(false))}
            >
              {m.screen.components[0]?.c}
            </button>
          ))}
        </div>
        <h3>1. View</h3>
        <p className="muted">The screen as the model read it, one line per component, actions in brackets.</p>
        <pre className="code">{probe.text}</pre>
        <h3>2. Act</h3>
        <p className="muted">
          Task: <strong>{probe.task}</strong>
        </p>
        <button className="btn primary" onClick={() => setAnswered(true)}>
          Show the answer from {probe.model}
        </button>
        {answered && (
          <pre className="code line-in">
            <Json text={answer} />
          </pre>
        )}
        <p className="muted">
          Recorded from <strong>{probe.model}</strong>. The address is <code>screen/component/item/part</code>
          ; the catalog's act code resolves it exactly as it resolves a touch.
        </p>
      </div>
      <div className="va-phone">
        <Phone
          screen={screen}
          width={340}
          height={440}
          highlight={answered ? probe.address : undefined}
          onHover={setHover}
        />
        <p className="addr-tip" aria-live="polite">
          {hover ? `address: ${hover}` : "hover a part to see its address"}
        </p>
      </div>
    </div>
  );
}
