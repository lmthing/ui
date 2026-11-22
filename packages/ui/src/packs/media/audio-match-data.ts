import { z } from "zod";
import { photo, screenId, text, type DeviceData, type StateName, type Values } from "../../catalog";

export const audioMatchRecordKind = "audioRecognition";
const preview = "$example";
const link = text(120).refine((value) => {
  if (!/^https:\/\/[^/?#@]+(?:[/?#]|$)/i.test(value) || /[\s\p{Cc}\\]/u.test(value)) return false;
  try {
    const url = new URL(value);
    return Boolean(url.hostname && !url.username && !url.password);
  } catch {
    return false;
  }
});

export const match = z.strictObject({
  title: text(40),
  artist: text(32),
  album: text(32).optional(),
  photo: photo.optional(),
  url: link.optional(),
});
export type Match = Omit<z.output<typeof match>, "url">;

export const matchHistory = z
  .array(
    z.strictObject({
      title: text(32),
      artist: text(24),
      photo: photo.optional(),
      matchedAt: text(12),
      goto: screenId.optional(),
    }),
  )
  .min(0)
  .max(6);

const recognition = z.discriminatedUnion("phase", [
  z.strictObject({ phase: z.literal("listening"), level: z.number().min(0).max(1).optional() }),
  z.strictObject({ phase: z.enum(["matching", "error"]) }),
  z.strictObject({ phase: z.literal("matched"), track: match }),
]);
export type RecognitionPhase = z.output<typeof recognition>["phase"] | "idle";
const addressed = z.strictObject({ instance: z.union([screenId, z.literal(preview)]), recognition });

/** The preview sentinel is supplied by the gallery in a per-example host snapshot. */
export function previewRecognition({ input, state }: { input: Readonly<Values>; state: StateName }) {
  if (state === "empty") return {};
  const [recent] = Array.isArray(input.history) ? input.history : [];
  const result = match.safeParse(
    input.match ??
      (state === "success" && recent
        ? { title: recent.title, artist: recent.artist, photo: recent.photo }
        : undefined),
  );
  const phase =
    state === "error" ? "error" : state === "loading" || input.listening === true ? "listening" : "idle";
  const snapshot =
    phase !== "idle" ? { phase } : result.success ? { phase: "matched", track: result.data } : undefined;
  return snapshot ? { [audioMatchRecordKind]: [{ instance: preview, recognition: snapshot }] } : {};
}

/** Discard Writer-owned listening and match fields; project only the addressed host's recognition. */
export function projectRecognition(input: Readonly<Values>, instance: string, data: DeviceData): Values {
  const records = data[audioMatchRecordKind] ?? [];
  const samples = records.filter((row) => {
    const key = (row as { instance?: unknown } | null)?.instance;
    return key === instance || (key === preview && records.length === 1);
  });
  const parsed = samples.length === 1 ? addressed.safeParse(samples[0]) : undefined;
  const snapshot = parsed?.data?.recognition;
  const phase = snapshot?.phase ?? "idle";
  const { url, ...track } = snapshot?.phase === "matched" ? snapshot.track : { url: undefined };
  return {
    match: snapshot?.phase === "matched" ? track : undefined,
    recognitionUrl: url,
    hasExternalTrack: url !== undefined,
    phase,
    level: snapshot?.phase === "listening" ? (snapshot.level ?? 0) : 0,
    listening: phase === "listening",
    canStart: phase !== "listening" && phase !== "matching",
    ...(phase === "idle"
      ? {}
      : { state: phase === "matched" ? "success" : phase === "listening" ? "loading" : "filled" }),
    ...(Array.isArray(input.history)
      ? {
          history: input.history.map((row) => ({
            ...row,
            linkedMatch: Boolean(row.goto),
            ...(input.media === "none" ? { photo: undefined } : {}),
          })),
        }
      : {}),
  };
}
