import * as c from "../../../catalog";
import * as kit from "../../../kit";
import {
  inspectionConditions,
  inspectionNoteLimit,
  inspectionPhotoParts,
  type inspectionEntries,
} from "../copy";
import { propertyWordsFor } from "../lang";

type Check = Extract<ReturnType<typeof inspectionEntries>[number], { entryKind: "check" }>;
type Density = c.AxisValue<"density">;
const conditionTone = {
  good: "good",
  worn: "warn",
  damaged: "bad",
  unrecorded: "muted",
  not_applicable: "text",
} as const;
// prettier-ignore
function TenantReview({ row, edit, density, loading }: { row: Check; edit: boolean; density: Density; loading: boolean }) {
  const { words: { inspections: words } } = kit.useWords(propertyWordsFor);
  if (!row.tenantSignoff && !row.disputeComment) return null;
  const canDispute = edit && row.canDispute;
  const status = row.tenantSignoff === "signed" ? words.coSigned :
    row.tenantSignoff === "pending" && !canDispute ? words.coSignPending : undefined;
  return <>
    <kit.KitLayoutText line={{ text: status, part: "co_signed", role: "meta", tone: row.tenantSignoff === "signed" ? "good" : "muted" }} {...{ density }} />
    {(canDispute || row.disputeComment) && (loading ?
      <kit.KitSkeleton shape="control" kind="quiet" label={words.dispute} full /> : canDispute ?
      <kit.KitContent group="response" {...{ density }}><kit.KitLayoutText line={{ text: words.dispute, role: "meta" }} {...{ density }} />
        <kit.KitTextArea lines={1} part="dispute" value={row.disputeComment ?? ""} hint={words.disputeHint}
          label={words.dispute} maxLength={inspectionNoteLimit} /></kit.KitContent> :
      <kit.KitLayoutText line={{ text: words.disputeReading(row.disputeComment!), part: "dispute", role: "body" }} {...{ density }} />)}
    {edit && row.canSign && <kit.KitContent group="response" {...{ density }}><kit.KitActionFooter {...{ density }}>{loading ?
      <kit.KitSkeleton shape="control" kind="secondary" label={words.coSign} full /> :
      <kit.KitAction part="sign" kind="secondary" label={words.coSign} full />}</kit.KitActionFooter></kit.KitContent>}
  </>;
}
// prettier-ignore
function ConditionChoices({ row, density, loading }: { row: Check; density: Density; loading: boolean }) {
  const { words: { inspections: words } } = kit.useWords(propertyWordsFor);
  const chips = inspectionConditions.map((value) => <kit.KitChip key={value} item={null} role="radio" look="box"
    value={value} on={value === row.condition} label={words.condition[value]} />);
  const choices = <>
    <kit.KitGrid columns={3} {...{ density }}>{chips.slice(0, 3)}</kit.KitGrid>
    <kit.KitGrid columns={2} {...{ density }}>{chips.slice(3)}</kit.KitGrid>
  </>;
  return loading ? <kit.KitContent {...{ density }}>{choices}</kit.KitContent> :
    <kit.KitTrack part="condition" role="radiogroup" label={words.conditionFor(row.title)}>
    {choices}
  </kit.KitTrack>;
}
// prettier-ignore
export function CheckDetails({ row, edit, density, loading, separated }: {
  row: Check; edit: boolean; density: Density; loading: boolean; separated: boolean;
}) {
  const { lang, words: { inspections: words } } = kit.useWords(propertyWordsFor);
  const photo = (reference: string, index: number, shape: "thumb" | "square") =>
    <kit.KitPhoto key={index} part={loading ? null : inspectionPhotoParts[index]!} photo={reference} {...{ shape, loading }}
      label={words.photoFor(row.title, c.numberLine(index + 1, lang))} />;
  const actions = <kit.KitContent {...{ density }}>{row.canAddPhoto && (loading ? <kit.KitSkeleton shape="control" kind="secondary" label={words.addPhoto} full /> :
    <kit.KitAction part="photo" label={words.addPhoto} kind="secondary" full />)}
    {row.hasPhoto && (loading ? <kit.KitSkeleton shape="control" kind="danger" label={words.removePhoto} full /> :
    <kit.KitAction part="remove_photo" label={words.removePhoto} kind="danger" full />)}</kit.KitContent>;
  const paired = edit && row.photos.length === 1;
  return <kit.KitContent group={separated ? "response" : "content"} {...{ density }}>{loading ?
    <kit.KitSkeleton shape="figure" inset="none" {...{ density }} content={[["body", row.title], ["label", edit ? undefined : words.condition[row.condition]], ["label", edit ? undefined : row.note]]} /> :
    <kit.KitText part="title" role="body" emphasis="strong" {...{ density }}>{row.title}</kit.KitText>}
    {edit ? <><ConditionChoices {...{ row, density, loading }} />
      {loading ? <kit.KitRow part={null} label={words.note} tone="muted" inset="none" {...{ density }}>
        <kit.KitSkeleton shape="figure" inset="md" content={[["body", words.note]]} {...{ density }} /></kit.KitRow> :
        <kit.KitTextArea lines={1} part="note" value={row.note} hint={words.note} label={words.noteFor(row.title)} maxLength={inspectionNoteLimit} />}</> :
      !loading && <><kit.KitText part="condition" role="label" tone={conditionTone[row.condition]} {...{ density }}>{words.condition[row.condition]}</kit.KitText>
        {row.note && <kit.KitText part="note" role="label" tone="muted" {...{ density }}>{row.note}</kit.KitText>}</>}
    {(row.hasPhoto || edit) && <kit.KitContent group="response" {...{ density }}>
      {paired ? <kit.KitRow part={null} inline label={words.addPhoto} leadingWidth="avatar" leading={photo(row.photos[0]!, 0, "thumb")} leadingAlign="row" {...{ density }}>{actions}</kit.KitRow> :
        <>{row.hasPhoto && <kit.KitGrid columns={3} {...{ density }}>{row.photos.map((ref, i) => photo(ref, i, "square"))}</kit.KitGrid>}{edit && actions}</>}
    </kit.KitContent>}
    <TenantReview {...{ row, edit, density, loading }} />
  </kit.KitContent>;
}
