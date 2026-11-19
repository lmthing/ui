import type { Pack } from "../../scripts/site-types";
import { shotOf } from "../data/site";
import { hrefOf } from "../router";
import { cap } from "../shared/status";

const thumbs = 4;

/** A live pack on the shelf: thumbnails of its components, what it is for, and a link to its page. */
export function PackCard({ pack }: { pack: Pack }) {
  const shown = pack.items.filter((i) => i.state !== "draft").slice(0, thumbs);
  return (
    <a className="pack" href={hrefOf("p", pack.id)}>
      <span className="strip" aria-hidden="true">
        {shown.map((i) => (
          <span key={i.id} className="thumb">
            <img src={shotOf(i.id)} alt="" loading="lazy" />
          </span>
        ))}
      </span>
      <h3>{cap(pack.id)}</h3>
      <span className="pick">{pack.pick}</span>
      <small>
        {pack.items.length} components · {pack.builtArchetypes} archetypes
      </small>
    </a>
  );
}
