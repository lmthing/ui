import { lazy } from "react";
import { Lazy } from "../shared/Lazy";

const TryPanel = lazy(() => import("../tryit/panel/TryPanel"));

export function TrySection() {
  return (
    <section className="block wrap" id="try">
      <p className="eyebrow">Try it live</p>
      <h2>A model in your browser builds a screen</h2>
      <p className="lede">
        No server, no key. Chrome's built-in model if you have it, WebLLM if you choose to download a small
        model, otherwise a replay of real recorded output. Whatever it writes is constrained to a small slice
        of the real catalog and validated before it is drawn.
      </p>
      <Lazy view={TryPanel} />
    </section>
  );
}
