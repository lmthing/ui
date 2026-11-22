import type { ComponentProps } from "react";
import {
  KitAction,
  KitActionFooter,
  KitContent,
  KitHeader,
  KitLayoutText,
  KitSeatGrid,
  KitSeatMap,
  type LayoutLine,
} from "../base";
import { PartContext, usePartContext } from "../part";

type SeatGrid = ComponentProps<typeof KitSeatGrid>;
export type SeatPlanProps =
  | ({
      kind: "grid";
      legend?: LayoutLine;
      preview?: LayoutLine;
      total?: LayoutLine;
      action?: ComponentProps<typeof KitAction> & { part: string };
    } & SeatGrid)
  | ({ kind: "tables"; tray?: LayoutLine } & Omit<ComponentProps<typeof KitSeatMap>, "tray">);

function seatPlan(props: SeatPlanProps, loading: boolean) {
  if (props.kind === "tables") {
    const { kind: _kind, tray, ...tables } = props;
    return <KitSeatMap {...tables} loading={loading} tray={tray && <KitLayoutText line={tray} />} />;
  }
  const { kind: _kind, legend, preview, total, action, ...grid } = props;
  return (
    <KitContent>
      <KitSeatGrid {...grid} loading={loading} />
      {legend && <KitHeader title={legend} />}
      {preview && <KitHeader title={preview} {...(total ? { meta: total } : {})} />}
      {!preview && total && <KitHeader title={total} />}
      {action && (
        <KitActionFooter>
          <KitAction contentParts={{}} {...action} part={loading ? null : action.part} />
        </KitActionFooter>
      )}
    </KitContent>
  );
}

/** One seat-plan entry point; grid picks and table assignments keep their own behavior. */
export function SeatPlan(props: SeatPlanProps) {
  const context = usePartContext();
  const loading = context.state === "loading" || props.loading === true;
  return (
    <PartContext.Provider value={loading ? { ...context, state: "loading" } : context}>
      {seatPlan(props, loading)}
    </PartContext.Provider>
  );
}
