/** A small local tone for exercising actual playback without fetching a recording. */
let fixture: string | undefined;
export function resolveMedia(reference: string): string | undefined {
  if (reference !== "lib:fixture") return undefined;
  if (fixture) return fixture;
  const rate = 8000,
    seconds = 30,
    count = rate * seconds;
  const data = new ArrayBuffer(44 + count * 2);
  const view = new DataView(data);
  const word = (at: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(at + i, value.charCodeAt(i));
  };
  word(0, "RIFF");
  view.setUint32(4, 36 + count * 2, true);
  word(8, "WAVE");
  word(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  word(36, "data");
  view.setUint32(40, count * 2, true);
  for (let i = 0; i < count; i++)
    view.setInt16(44 + i * 2, Math.round(Math.sin((i * Math.PI * 2 * 220) / rate) * 100), true);
  fixture = URL.createObjectURL(new Blob([data], { type: "audio/wav" }));
  return fixture;
}
