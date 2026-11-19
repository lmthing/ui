import { shotOf } from "../data/site";
import { JsonLine } from "../shared/JsonLine";
import { sources } from "../create/sources";

const first = 3;

/**
 * The hero's first frame, drawn at once from build-time data while the live kit loads: the first lines
 * and the first components, as gallery drawings in a phone frame. The live demo takes over in place.
 */
export function HeroFrame() {
  const source = sources()[0];
  if (!source) return null;
  const lines = source.lines.slice(0, first);
  const ids = lines.map((l) => (JSON.parse(l) as { c: string }).c);
  return (
    <div className="demo" aria-hidden="true">
      <div className="demo-code">
        <p className="caption">
          <span>{source.origin}</span>
          <span>
            {first} of {source.lines.length} lines · hover a key to find its part
          </span>
        </p>
        <pre className="wire-pane">
          {lines.map((line, i) => (
            <div key={i} className="wire-line static">
              <JsonLine line={line} />
            </div>
          ))}
        </pre>
      </div>
      <div className="demo-phone">
        <div className="phone-still" style={{ width: 336, height: 500 }}>
          {ids.map((id) => (
            <img key={id} src={shotOf(id)} alt="" />
          ))}
        </div>
      </div>
    </div>
  );
}
