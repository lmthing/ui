import { Phone } from "../live/Phone";
import { usePipeline } from "./usePipeline";

const flow = [
  ["Listener", "Turns the request into intent", "runs in the lmthing app"],
  ["Director", "Picks packs and layout", ""],
  ["Writers", "One structured-output call per screen", ""],
  ["Validator", "Plain code: schema, ids, repairs", ""],
  ["Critic", "Reviews the finished screen", "runs in the lmthing app"],
] as const;
const glyph = { accepted: "✓", repaired: "~", rejected: "✗" } as const;

/** A drawn flow: nodes joined by rules, recorded lines travelling Writers to Validator, a phone filling in. */
export default function PipelineReplay() {
  const p = usePipeline();
  if (!p.recorded) return null;
  const count = (s: string) =>
    p.results.filter((r) =>
      s === "rejected" ? !r.line : s === "repaired" ? r.line && r.notes.length : r.line && !r.notes.length,
    ).length;
  return (
    <figure className="pipe">
      <div className="flow">
        {flow.map(([name, role, note], i) => (
          <div key={name} className="flow-part">
            {i > 0 && (
              <div className={`link ${i === 3 ? "lane" : ""}`} aria-hidden="true">
                {i === 3 &&
                  p.chips.map((c) => (
                    <span key={c.key} className={`fly ${c.status}`}>
                      {c.name} {glyph[c.status]}
                    </span>
                  ))}
              </div>
            )}
            <div className={`node ${i === 2 || i === 3 ? "live" : ""}`}>
              <b>{name}</b>
              <span>{role}</span>
              {i === 1 && <code>{p.recorded?.pack ?? "core only"}</code>}
              {i === 2 && (
                <code>
                  {p.shown} of {p.total} lines
                </code>
              )}
              {i === 3 && (
                <code>
                  {count("accepted")} ok · {count("repaired")} fixed · {count("rejected")} out
                </code>
              )}
              {note && <small>{note}</small>}
            </div>
          </div>
        ))}
        <div className="flow-part">
          <div className="link" aria-hidden="true" />
          <div className="mini" inert>
            <div className="mini-scale">
              <Phone screen={p.screen} width={320} height={560} fixed />
            </div>
          </div>
        </div>
      </div>
      <figcaption>
        Replaying a screen written by {p.recorded.model} in a recorded run, through the real Validator.
        Listener, Director and Critic run inside the lmthing app, so only their roles are shown here.
      </figcaption>
    </figure>
  );
}
