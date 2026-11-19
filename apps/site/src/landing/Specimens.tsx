import { SectionLabel } from "../shared/SectionLabel";
import { Reveal } from "../shared/Reveal";
import { itemById, site } from "../data/site";
import { Specimen } from "../index/Specimen";

const picks = ["Amount", "List", "Stats", "Checklist", "Ring", "Slots", "Appointment", "MealPlan"];

/** A first look at the catalog: eight specimens, then the full index on its own page. */
export function Specimens() {
  const items = picks.flatMap((id) => (itemById.get(id) ? [itemById.get(id)!] : []));
  return (
    <section className="sec" id="components" aria-labelledby="components-h">
      <SectionLabel
        n="05"
        name="Components"
        note={`${site.items.length} built; ${site.stats.plannedTotal} planned in all.`}
      />
      <Reveal>
        <h2 id="components-h">Components</h2>
        <p className="lede">
          Each component is one file holding its schema, examples and view. Open any specimen to edit its
          props live, see its line, its part addresses and the text an agent reads.
        </p>
        <div className="specimens">
          {items.map((item) => (
            <Specimen key={item.id} item={item} />
          ))}
        </div>
        <p className="more">
          <a className="btn" href="#/components">
            All {site.items.length} components
          </a>
        </p>
      </Reveal>
    </section>
  );
}
