import { useState } from "react";
import { Json } from "../../shared/Json";
import type { ActOutcome } from "../act";

const examples = ["Mark the first item as done", "Press the main button", "Open the first item"];

/** Act: the model answers with an address and action limited to the screen's real ones. */
export function ActPane({
  enabled,
  tier,
  view,
  answer,
  onAct,
}: {
  enabled: boolean;
  tier: number | null;
  view: string;
  answer: ActOutcome | null;
  onAct: (task: string) => void;
}) {
  const [task, setTask] = useState(examples[0]!);
  return (
    <div className="act">
      <h3>View</h3>
      <p className="muted">The compact text the model reads before it acts.</p>
      <pre className="code">{view || "Build a screen first."}</pre>
      <h3>Act</h3>
      {tier === 4 && (
        <p className="muted">
          Replay has no model to ask. The "View and act" demo above replays real recorded answers.
        </p>
      )}
      <div className="ask">
        <input
          type="text"
          aria-label="Task for the model"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          list="act-examples"
        />
        <datalist id="act-examples">
          {examples.map((e) => (
            <option key={e} value={e} />
          ))}
        </datalist>
        <button className="btn" disabled={!enabled} onClick={() => onAct(task)}>
          Act
        </button>
      </div>
      {answer && (
        <div className={`answer ${answer.ok ? "ok" : "bad"}`}>
          {answer.address && (
            <Json text={JSON.stringify({ address: answer.address, action: answer.action })} />
          )}
          <p>{answer.message}</p>
        </div>
      )}
    </div>
  );
}
