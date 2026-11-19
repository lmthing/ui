import { packById, site } from "../data/site";
import { statusOf } from "../shared/status";

/** Build waves from the pack build plan, each filled by how many of its packs are live. */
export function WaveTimeline() {
  const waves = site.waves.filter((w) => w.wave > 0);
  return (
    <ol className="waves" aria-label="Build waves">
      {waves.map((w) => {
        const live = w.packs.filter(
          (id) => packById.get(id) && statusOf(packById.get(id)!) === "live",
        ).length;
        return (
          <li key={w.wave} className={live === w.packs.length ? "done" : live ? "active" : ""}>
            <b>Wave {w.wave}</b>
            <span>
              {live} of {w.packs.length} live
            </span>
            <i style={{ width: `${(live / w.packs.length) * 100}%` }} />
          </li>
        );
      })}
    </ol>
  );
}
