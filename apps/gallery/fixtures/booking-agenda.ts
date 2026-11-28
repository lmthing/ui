import { components, type Component, type ScreenLike } from "@lmthing/ui/catalog";

const schedule = components.SlotAgenda.examples[0]!;
const section = { id: "header", c: "Header", title: "Garden classes" };
const agendaDate = { id: "date", c: "SectionTitle", text: "Fri, Nov 27" };

function destination(id: string, title: string, status: string, time: string): ScreenLike {
  return {
    id,
    components: [
      { id: "header", c: "Header", title, style: "back" },
      {
        id: "details",
        c: "KeyValue",
        pairs: [
          { label: "Start", value: time },
          { label: "Status", value: status },
        ],
      },
      { id: "next", c: "Note", text: "This preview does not reserve a place." },
    ],
  };
}

const baseline: Component = {
  id: "agenda",
  c: "List",
  rows: schedule.sessions.map((row) => ({
    title: row.title,
    meta: [row.time, "location" in row ? row.location : undefined, row.status].filter(Boolean).join(" · "),
    ...(row.goto ? { goto: row.goto, trail: "chevron" } : {}),
  })),
};

export const bookingAgendaScreens: Record<string, ScreenLike> = {
  booking_agenda_before: {
    id: "booking_agenda_before",
    components: [section, agendaDate, baseline],
  },
  booking_agenda: {
    id: "booking_agenda",
    components: [section, { id: "agenda", c: "SlotAgenda", ...schedule }],
  },
  repotting: destination("repotting", "Repotting workshop", "Available", "09:00"),
  cuttings_waitlist: destination("cuttings_waitlist", "Plant cuttings exchange", "Full", "11:30"),
};
