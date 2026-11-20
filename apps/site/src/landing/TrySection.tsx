import { lazyChunk } from "../shared/lazyChunk";
import { useState } from "react";
import { Lazy } from "../shared/Lazy";
import { SectionLabel } from "../shared/SectionLabel";
import { WhenNear } from "../shared/WhenNear";
import { Reveal } from "../shared/Reveal";

const TryPanel = lazyChunk(() => import("../tryit/panel/TryPanel"));
const ViewActDemo = lazyChunk(() => import("../view/ViewActDemo"));
const tabs = ["Build with a model", "Read and act"] as const;

export function TrySection() {
  const [tab, setTab] = useState<(typeof tabs)[number]>(tabs[0]);
  return (
    <section className="sec" id="try" aria-labelledby="try-h">
      <SectionLabel n="03" name="Try" note={"Four tiers: Chrome AI, WebLLM, OpenRouter, recorded replay."} />
      <Reveal>
        <h2 id="try-h">Try it with a model</h2>
        <p className="lede">
          A model writes one screen from ten core components and at most one pack. Chrome's built-in model and
          WebLLM run in this tab, and nothing leaves the page. OpenRouter runs a free model on your own
          account, only after you connect it. Otherwise you see a real recorded run.
        </p>
        <div className="tabs" role="tablist" aria-label="Demo">
          {tabs.map((t) => (
            <button key={t} role="tab" aria-selected={t === tab} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        <WhenNear fallback={<div className="skeleton" style={{ minHeight: 640 }} />}>
          {tab === tabs[0] ? <Lazy view={TryPanel} /> : <Lazy view={ViewActDemo} />}
        </WhenNear>
      </Reveal>
    </section>
  );
}
