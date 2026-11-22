import type { IconName, ThemeDensity } from "../../../catalog";
import * as kit from "../../../kit";
import { pathUnitCopy, type PathUnitState } from "../copy";

type Unit = { id: string; title: string; state: PathUnitState; icon: IconName; goto: string };

// prettier-ignore
export function Modules({ units, milestones, density, brief, loading }: {
  units: readonly Unit[]; milestones: readonly number[]; density: ThemeDensity; brief: boolean; loading: boolean;
}) {
  const { lang } = kit.useWords();
  return <kit.KitRowGroup density={density} spacing="groups" separators={false}>
    {units.map((unit, index) => {
      const copy = pathUnitCopy(unit, milestones.includes(index), lang);
      const locked = unit.state === "locked";
      const trail = locked ? "lock" : unit.state === "current" ? "chevron_right" : "check";
      const status = { text: copy.status, part: "state", tone: unit.state === "current" ? "accent" : "muted" } as const;
      const badge = { text: copy.milestone, part: "milestone", role: "caption" } as const;
      return <kit.KitRow key={unit.id} item={unit.id} part={loading ? null : "root"}
        label={copy.label} goto={loading || locked ? undefined : unit.goto} density={density}
        selected={!loading && unit.state === "current"}
        leading={<kit.KitIcon name={unit.icon} tone={locked ? "muted" : "accent"} loading={loading} />}
        trailing={<kit.KitIcon name={trail} scale="sm" decorative loading={loading} />}>
        <kit.KitMetaLine density={density}
          title={{ text: unit.title, part: "title", tone: locked ? "muted" : "text" }}
          meta={brief ? badge : [status, badge]} />
      </kit.KitRow>;
    })}
  </kit.KitRowGroup>;
}
