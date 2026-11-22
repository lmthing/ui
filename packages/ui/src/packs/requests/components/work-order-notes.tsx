import * as kit from "../../../kit";
import type { workOrderCopy } from "../copy";
import type { RequestsWords } from "../lang";

type Words = RequestsWords["workOrder"];
type Copy = ReturnType<typeof workOrderCopy>;
type Notes = {
  editable: boolean;
  blockedBy?: Exclude<keyof Words["blockers"], "none"> | undefined;
  note: string;
};

// prettier-ignore
export function WorkNotes({ p, w, copy, loading, maxNote }: { p: Notes; w: Words; copy: Copy; loading: boolean; maxNote: number }) {
  if (!p.editable && !p.note && !copy.blocker) return null;
  const render = (value: keyof Words["blockers"]) => <kit.KitChip key={value} item={null} role="radio"
    label={w.blockers[value]} value={value} look="box" on={(p.blockedBy ?? "none") === value} />;
  const label = (text: string) => loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["label", text]]} />
    : <kit.KitText role="label" tone="muted" part={null}>{text}</kit.KitText>;
  return <kit.KitContent group="response">
    {p.editable ? <>{label(w.blocker)}
      <kit.KitTrack part="blocked" role="radiogroup" label={w.blocker}>
        <kit.KitGrid columns={3}>{(["none", "access", "parts", "information", "other"] as const).map(render)}</kit.KitGrid>
      </kit.KitTrack><kit.KitContent group="response">{label(w.note)}
      {loading ? <kit.KitRow label={w.note} tone="muted"><kit.KitSkeleton shape="figure" inset="none"
        content={[["body", p.note || w.noteHint], ["body", w.note]]} /></kit.KitRow> : <kit.KitTextArea part="note"
        label={w.note} hint={w.noteHint} value={p.note} lines={2} maxLength={maxNote} />}</kit.KitContent></> : !loading && <>
      {copy.blocker && <kit.KitText part="blocked" tone="warn">{copy.blocker}</kit.KitText>}
      {p.note && <kit.KitText part="note">{p.note}</kit.KitText>}
    </>}
  </kit.KitContent>;
}
