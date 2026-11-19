import { SectionLabel } from "../shared/SectionLabel";
import { Reveal } from "../shared/Reveal";
import { PackCard } from "../packs/PackCard";
import { packById, site } from "../data/site";
import { hrefOf } from "../router";
import { statusOf } from "../shared/status";

const dot = { live: "●", "in progress": "◐", planned: "○" } as const;

/** Waves as a table, a dot for each pack's status, and the live packs as a shelf. */
export function PacksShelf() {
  const s = site.stats;
  const live = site.packs.filter((p) => p.ready);
  return (
    <section className="sec" id="packs" aria-labelledby="packs-h">
      <SectionLabel
        n="04"
        name="Packs"
        note={`${s.packsReady} live, ${s.packsInProgress} in progress, ${s.packsPlanned} planned.`}
      />
      <Reveal>
        <h2 id="packs-h">Packs</h2>
        <p className="lede">
          A pack adds components for one kind of app. {s.packsReady} of {site.packs.length} are live,{" "}
          {s.packsInProgress} in progress, {s.packsPlanned} planned; {s.built} of {s.plannedTotal} components
          exist as code. Statuses are computed from the repository on every build, and the waves follow the
          build plan.
        </p>
        <table className="waves">
          <caption className="sr-only">Packs by build wave</caption>
          <tbody>
            {site.waves
              .filter((w) => w.wave > 0)
              .map((w) => (
                <tr key={w.wave}>
                  <th scope="row">Wave {w.wave}</th>
                  <td>
                    {w.packs.map((id) => {
                      const pack = packById.get(id);
                      if (!pack) return null;
                      const status = statusOf(pack);
                      const built = pack.items.filter((i) => i.state !== "draft").length;
                      return (
                        <a key={id} href={hrefOf("p", id)} className={`pk ${status.replace(" ", "-")}`}>
                          <span aria-hidden="true">{dot[status]}</span> {id}
                          <small>
                            {built}/{pack.plannedComponents || pack.items.length}
                            <span className="sr-only"> built, {status}</span>
                          </small>
                        </a>
                      );
                    })}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        <p className="legend">● live &nbsp; ◐ in progress &nbsp; ○ planned</p>
        <div className="shelf">
          {live.map((pack) => (
            <PackCard key={pack.id} pack={pack} />
          ))}
        </div>
      </Reveal>
    </section>
  );
}
