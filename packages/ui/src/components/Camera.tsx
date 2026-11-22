import {
  useWords,
  KitAction,
  KitCard,
  KitContent,
  KitRow,
  KitShutter,
  KitViewfinder,
  useControlValue,
  usePartContext,
} from "../kit";
import {
  wordsFor,
  probesFor,
  clip,
  text,
  thingOf,
  variantProps,
  type FallbackInput,
  type ClockState,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { z } from "zod";
import { prompt } from "../entry/prompt-Camera.generated";

export const meta = {
  id: "Camera",
  status: "ready",
  group: "beyond",
  ...prompt,
  region: "body",
  weight: 3,
  tier: "ok",
  realPath: "With permission, the device camera takes a photo or scans a code.",
  variants: { surface: ["plain", "card"] },
  parts: ["root", "viewfinder", "hint", "shutter"],
  states: ["filled"],
  actions: {
    parts: { shutter: ["press", "start", "stop", "increment"] },
    when: {
      "shutter.press": { still: true },
      "shutter.start": { kind: "video" },
      "shutter.stop": { kind: "video" },
      "shutter.increment": { kind: "document_dual" },
    },
  },
  clocks: [
    {
      id: "recording",
      kind: "up",
      when: { kind: "video" },
      start: { part: "shutter", action: "start" },
      stop: { part: "shutter", action: "stop" },
    },
  ],
  adjust: { "shutter.increment": { prop: "side", delta: 1, min: 0, max: 2 } },
  read: (input, state, lang, _data, _currency, live): string[] => {
    if (state !== "filled") return [];
    const capture = input as CameraProps;
    const clock = live?.("$recording") as ClockState | undefined;
    const side = live?.("$adjust/side");
    const label = shutterLabel(
      { ...capture, side: typeof side === "number" ? side : 0, recording: clock?.running === true },
      lang,
    );
    return capture.kind === "document_dual" && side === 1
      ? [label, wordsFor(lang).captureLabels.backHint]
      : [label];
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    kind: z.enum(["photo", "scan", "video", "document_dual"]).default("photo"),
    hint: text(48),
  })
  .overwrite((input) => ({
    ...input,
    ...(input.kind === "document_dual" ? { side: 0 } : {}),
    still: input.kind === "photo" || input.kind === "scan",
  }));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = wordsFor(lang);

  const type = thingOf(cast)?.type.replace(/[_-]+/g, " ").trim();
  return { kind: "photo", hint: type ? clip(type, 48) : placeholderDetail };
}

export const examples = [
  { kind: "photo", hint: "Point at your plant's leaves" },
  { kind: "scan", hint: "Scan the dog's tag" },
  { kind: "photo", hint: "Point at your plant's leaves", surface: "card" },
  { kind: "video", hint: "Keep Clover in the frame" },
  { kind: "document_dual", hint: "Fit the vaccination card inside the frame" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Camera");
export const probes = [
  choose("Let me aim at my fern's leaves and take a new shot"),
  choose("Show an existing shot of my fern with a short caption underneath", "Photo"),
  write("Let me aim at my plant's leaves and take a new shot, with a short instruction"),
  write("Let me record a new video of Clover, with a shutter that starts and stops recording."),
  write("Guide me through scanning the front and back of Clover's vaccination card, one side at a time."),
  {
    ...write("Let me take a photo of my fern. Put the viewfinder and shutter together inside one card."),
    variant: { axis: "surface", value: "card" },
  },
  read("Take the photo", { address: "c1/shutter", action: "press" }),
] satisfies Probe[];

type CameraProps = Props<typeof props, typeof meta> & { recording?: boolean; side?: number };

function shutterLabel({ kind, recording, side }: CameraProps, lang?: string) {
  const { photoLabels, captureLabels: copy } = wordsFor(lang);
  if (kind === "video") return recording ? copy.stop : copy.start;
  if (kind === "document_dual") return side === 2 ? copy.complete : side === 1 ? copy.back : copy.front;
  return kind === "scan" ? photoLabels.scan : photoLabels.take;
}

// prettier-ignore
export function Camera(input: CameraProps) {
  const { kind, hint, surface } = input;
  const { lang, words: { captureLabels } } = useWords();
  const { screen, component } = usePartContext();
  const base = `${screen}/${component}`;
  const clock = useControlValue<ClockState | undefined>(`${base}/$recording`, undefined);
  const side = useControlValue(`${base}/$adjust/side`, input.side ?? 0);
  const recording = Boolean(clock?.running);
  const label = shutterLabel({ ...input, side, recording }, lang);
  const dual = kind === "document_dual", video = kind === "video";
  return (
    <KitCard style="plain" part="root" surface={surface} padded={surface === "card"}>
      <KitViewfinder kind={dual || kind === "scan" ? "scan" : "photo"} hint={dual && side > 0 ? side === 1 ? captureLabels.backHint : captureLabels.complete : hint} part="viewfinder" hintPart="hint" />
      {dual || video ? <KitRow part={null} label={label}><KitContent align="center"><KitContent>
        <KitAction {...(video ? { a11y: label, icon: recording ? "square" as const : "video" as const } : { label })} part="shutter" action={dual ? "increment" : recording ? "stop" : "start"}
          kind={recording ? "danger" : "primary"} disabled={dual && side === 2} />
      </KitContent></KitContent></KitRow> : <KitShutter label={label} part="shutter" />}
    </KitCard>
  );
}
