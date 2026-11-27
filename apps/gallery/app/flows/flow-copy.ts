export const flowWords = {
  gallery: "UI gallery",
  all: "All flow templates",
  title: "Flow templates",
  intro: "Play a journey from the first action to the last result.",
  missing: "That flow template is not available.",
  example: "Example",
  inspect: "Inspect steps and states",
  play: "Playback",
  state: "Preview state",
  role: "Role",
  done: "Journey complete",
  resume: "Return to playback",
  restart: "Play again",
  figures: {
    slot: "Time",
    new_slot: "New time",
    eta: "Estimated arrival",
    arrival: "Check-in time",
  } as Record<string, string>,
  labels: {
    empty: "Empty",
    waiting: "Waiting",
    error: "Error",
    success: "Success",
  },
};

export function readableId(id: string) {
  return (id[0]!.toUpperCase() + id.slice(1)).replaceAll("_", " ");
}
