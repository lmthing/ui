import { PackCard } from "../packs/PackCard";
import { WaveTimeline } from "../packs/WaveTimeline";
import { packById, site } from "../data/site";
import { Counter } from "../shared/Counter";
import { Reveal } from "../shared/Reveal";

export function PacksSection() {
  const s = site.stats;
  return (
    <section className="block wrap" id="packs">
      <p className="eyebrow">Packs</p>
      <h2>A catalog that keeps growing</h2>
      <p className="lede">
        Domain packs add components for one kind of app (booking, health, kitchen, money). The Director picks
        up to three.{" "}
        <strong>
          <Counter to={s.packsReady} />
        </strong>{" "}
        of {site.packs.length} are live, {s.packsInProgress} in progress and {s.packsPlanned} planned, built
        in waves. Status is computed from the repo on every build.
      </p>
      <WaveTimeline />
      {site.waves
        .filter((w) => w.wave > 0)
        .map((w) => (
          <div key={w.wave} className="wave-group">
            <h3>
              Wave {w.wave} <small>{w.why}</small>
            </h3>
            <div className="pack-grid">
              {w.packs.map(
                (id, i) =>
                  packById.get(id) && (
                    <Reveal key={id} delay={i * 60}>
                      <PackCard pack={packById.get(id)!} />
                    </Reveal>
                  ),
              )}
            </div>
          </div>
        ))}
    </section>
  );
}
