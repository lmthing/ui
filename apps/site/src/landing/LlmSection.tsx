import { lazy, useState } from "react";
import { Lazy } from "../shared/Lazy";

const CreateDemo = lazy(() => import("../create/CreateDemo").then((m) => ({ default: m.CreateDemo })));
const ViewActDemo = lazy(() => import("../view/ViewActDemo"));

const modes = ["Create", "View and act"] as const;

const guarantees = [
  [
    "Fixed catalog",
    "A line can only name a component the catalog has: the schema's component name is a constant per branch.",
  ],
  [
    "Strict structured output",
    "The provider is asked for JSON that matches writerFormat(registry), scoped to the core and at most three packs.",
  ],
  ["No free values", "Colours, sizes, fonts and camera never cross the wire. Themes are enums."],
  [
    "Validation in code",
    "Every line is validated against the component's Zod schema. Parse and component repairs (plan 4.14) are planned, not built yet.",
  ],
];

export function LlmSection() {
  const [mode, setMode] = useState<(typeof modes)[number]>("Create");
  return (
    <section className="block wrap" id="llm">
      <p className="eyebrow">Made for LLMs</p>
      <h2>View it, navigate it, create with it</h2>
      <p className="lede">
        Everything below is real: pack worked examples and replies recorded from named models, drawn by the
        real kit.
      </p>
      <div className="tabs big" role="tablist" aria-label="Demo">
        {modes.map((m) => (
          <button key={m} role="tab" aria-selected={m === mode} onClick={() => setMode(m)}>
            {m}
          </button>
        ))}
      </div>
      <div className="card demo-card">
        {mode === "Create" ? <Lazy view={CreateDemo} /> : <Lazy view={ViewActDemo} />}
      </div>
      <dl className="guarantees">
        {guarantees.map(([title, body]) => (
          <div key={title}>
            <dt>{title}</dt>
            <dd>{body}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
