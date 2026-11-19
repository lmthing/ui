import { lazyChunk } from "../shared/lazyChunk";
import type { Pack } from "../../scripts/site-types";
import { Suspense } from "react";
import { WhenNear } from "../shared/WhenNear";
import { shotOf } from "../data/site";
import { hrefOf } from "../router";
import { cap } from "../shared/status";

const more = 3;
const MiniPack = lazyChunk(() => import("./MiniPack"));

/** A live pack on the shelf: one drawing at phone proportions, the rest on hover or focus, and what it is for. */
export function PackCard({ pack }: { pack: Pack }) {
  const shown = pack.items.filter((i) => i.state !== "draft");
  const [lead, ...rest] = shown;
  return (
    <a className="pack" href={hrefOf("p", pack.id)}>
      <span className="lead" inert>
        {pack.lines.length > 0 ? (
          <WhenNear inline fallback={lead && <img src={shotOf(lead.id)} alt="" loading="lazy" />}>
            <Suspense fallback={lead && <img src={shotOf(lead.id)} alt="" loading="lazy" />}>
              <MiniPack id={pack.id} />
            </Suspense>
          </WhenNear>
        ) : (
          lead && <img src={shotOf(lead.id)} alt="" loading="lazy" />
        )}
        <span className="rest">
          {rest.slice(0, more).map((i) => (
            <img key={i.id} src={shotOf(i.id)} alt="" loading="lazy" />
          ))}
        </span>
      </span>
      <h3>{cap(pack.id)}</h3>
      <span className="pick">{pack.pick}</span>
      <small>
        {pack.items.length} components · {pack.builtArchetypes} archetypes
      </small>
    </a>
  );
}
