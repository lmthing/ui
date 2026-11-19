import { useEffect, useMemo, useState } from "react";
import { site } from "../data/site";
import { checkLine } from "../tryit/assemble";
import { components } from "@lmthing/ui/catalog";
import { useStream } from "../create/useStream";

const stages = [
  ["Listener", "Turns the request into intent", "runs in the lmthing app"],
  ["Director", "Picks packs and layout", ""],
  ["Writers", "One model call per screen, structured output", ""],
  ["Validator", "Plain code: schema, ids, repairs", ""],
  ["Critic", "Reviews the finished screen", "runs in the lmthing app"],
] as const;

/** A recorded Writer reply goes line by line through the real validator. */
export default function PipelineReplay() {
  const recorded = useMemo(() => site.screens.find((s) => s.screen.components.length >= 5), []);
  const lines = useMemo(() => (recorded?.screen.components ?? []).map((c) => JSON.stringify(c)), [recorded]);
  const [round, setRound] = useState(0);
  const shown = useStream(lines.length, "pipeline", round, 900);
  useEffect(() => {
    if (shown < lines.length || !lines.length) return;
    const again = setTimeout(() => setRound((n) => n + 1), 4000);
    return () => clearTimeout(again);
  }, [shown, lines.length]);
  const results = useMemo(() => {
    const taken = new Set<string>();
    const allowed = Object.keys(components);
    return lines.slice(0, shown).map((line, i) => checkLine(line, allowed, i, taken));
  }, [lines, shown]);
  if (!recorded) return null;
  const fixed = results.filter((r) => r.line && r.notes.length).length;
  const bad = results.filter((r) => !r.line).length;
  const names = recorded.screen.components.slice(0, shown).map((c) => c.c);
  return (
    <figure className="pipe">
      <ol>
        {stages.map(([name, role, note], i) => (
          <li key={name} className={i === 2 || i === 3 ? "live" : ""}>
            <b>{name}</b>
            <span>{role}</span>
            {i === 1 && <code>{recorded.pack ?? "core only"}</code>}
            {i === 2 && <code>{names.at(-1) ?? "waiting"}</code>}
            {i === 3 && (
              <code>
                {results.length - bad} accepted · {fixed} repaired · {bad} rejected
              </code>
            )}
            {note && <small>{note}</small>}
          </li>
        ))}
      </ol>
      <figcaption>
        Replaying a screen written by {recorded.model} in a recorded run, through the real Validator.
        Listener, Director and Critic run inside the lmthing app, so only their roles are shown here.
      </figcaption>
    </figure>
  );
}
