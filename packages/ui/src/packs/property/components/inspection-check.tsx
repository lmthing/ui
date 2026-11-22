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
  return <>
    {row.tenantSignoff === "signed" && <kit.KitLayoutText line={{ text: words.coSigned, part: "co_signed", role: "meta", tone: "good" }} {...{ density }} />}
    {edit && row.canDispute ? (loading ? <kit.KitSkeleton shape="control" kind="quiet" label={words.dispute} full /> :
      <kit.KitTextArea lines={1} part="dispute" value={row.disputeComment ?? ""} hint={words.dispute}
        label={words.dispute} maxLength={inspectionNoteLimit} />) :
      row.disputeComment && <kit.KitLayoutText line={{ text: words.disputeReading(row.disputeComment), part: "dispute", role: "body" }} {...{ density }} />}
    {edit && row.canSign && <kit.KitActionFooter {...{ density }}>{loading ?
      <kit.KitSkeleton shape="control" kind="secondary" label={words.coSign} full /> :
      <kit.KitAction part="sign" kind="secondary" label={words.coSign} full />}</kit.KitActionFooter>}
  </>;
}
// prettier-ignore
export function CheckDetails({ row, edit, density, loading }: { row: Check; edit: boolean; density: Density; loading: boolean }) {
  const { lang, words: { inspections: words } } = kit.useWords(propertyWordsFor);
  const chips = inspectionConditions.map((value) => <kit.KitContent key={value} align="center">
    <kit.KitChip item={null} role="radio" disabled={false} value={value} on={value === row.condition} label={words.condition[value]} /></kit.KitContent>);
  const choices = <><kit.KitGrid columns={3} {...{ density }}>{chips.slice(0, 3)}</kit.KitGrid>
    <kit.KitGrid columns={2} {...{ density }}>{chips.slice(3)}</kit.KitGrid></>;
  const photo = (reference: string, index: number, shape: "thumb" | "square") => loading ?
    (shape === "thumb" ? <kit.KitSkeleton rows={1} inset="none" items={[{ photo: reference }]} /> :
      <kit.KitSkeleton key={index} shape="media" aspect="square" lines={[]} />) :
    <kit.KitPhoto key={index} part={inspectionPhotoParts[index]!} photo={reference} shape={shape} label={words.photoFor(row.title, c.numberLine(index + 1, lang))} />;
  const actions = <>{row.canAddPhoto && (loading ? <kit.KitSkeleton shape="control" kind="secondary" label={words.addPhoto} full /> :
    <kit.KitAction part="photo" label={words.addPhoto} kind="secondary" full />)}
    {row.hasPhoto && (loading ? <kit.KitSkeleton shape="control" kind="danger" label={words.removePhoto} full /> :
    <kit.KitAction part="remove_photo" label={words.removePhoto} kind="danger" full />)}</>;
  const paired = edit && row.photos.length === 1;
  return <kit.KitContent {...{ density }}>{loading ?
    <kit.KitSkeleton shape="figure" inset="none" {...{ density }} content={[["body", row.title], ["body", edit ? undefined : words.condition[row.condition]], ["label", edit ? undefined : row.note]]} /> :
    <kit.KitText part="title" role="body" emphasis="strong" {...{ density }}>{row.title}</kit.KitText>}
    {edit ? <>{loading ? choices : <kit.KitTrack part="condition" role="radiogroup" label={words.conditionFor(row.title)}>{choices}</kit.KitTrack>}
      {loading ? <kit.KitRow part={null} label={words.note} tone="muted" inset="none" {...{ density }}><kit.KitSkeleton shape="control" kind="quiet" label={words.note} full /></kit.KitRow> :
        <kit.KitTextArea lines={1} part="note" value={row.note} hint={words.note} label={words.noteFor(row.title)} maxLength={inspectionNoteLimit} />}</> :
      !loading && <><kit.KitText part="condition" role="body" tone={conditionTone[row.condition]} {...{ density }}>{words.condition[row.condition]}</kit.KitText>
        {row.note && <kit.KitText part="note" role="body" tone="muted" {...{ density }}>{row.note}</kit.KitText>}</>}
    {paired ? <kit.KitRow part={null} inline label={words.addPhoto} leadingWidth="avatar" leading={photo(row.photos[0]!, 0, "thumb")} leadingAlign="row" {...{ density }}>{actions}</kit.KitRow> :
      <>{row.hasPhoto && <kit.KitGrid columns={3} {...{ density }}>{row.photos.map((ref, i) => photo(ref, i, "square"))}</kit.KitGrid>}{edit && actions}</>}
    <TenantReview {...{ row, edit, density, loading }} />
  </kit.KitContent>;
}
