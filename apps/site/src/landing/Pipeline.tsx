import { lazyChunk } from "../shared/lazyChunk";
import { Lazy } from "../shared/Lazy";
import { SectionLabel } from "../shared/SectionLabel";
import { Reveal } from "../shared/Reveal";

const Replay = lazyChunk(() => import("./PipelineReplay"));

/** How a screen gets made: five fixed stages, no model chooses the next step. */
export function Pipeline() {
  return (
    <section className="sec" id="pipeline" aria-labelledby="pipeline-h">
      <SectionLabel n="02" name="Pipeline" note={"Five stages, fixed order; the Validator is code."} />
      <Reveal>
        <h2 id="pipeline-h">How a screen gets made</h2>
        <p className="lede">
          The order is fixed: Listener, Director, parallel Writers, a Validator that is plain code, then
          Critic. No model chooses the next step, and none reads the chat history. Writers answer under strict
          structured output, so a line can only name a component the catalog has.
        </p>
        <Lazy view={Replay} />
      </Reveal>
    </section>
  );
}
