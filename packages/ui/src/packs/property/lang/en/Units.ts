export const words = {
  units: {
    date: "Occupancy date",
    vacancies: "Vacancies",
    noVacancies: "No vacant units or tenancies on notice for this date",
    notice: "Notice given",
    dateFormat: "YYYY-MM-DD",
    dateReading: (date: string, value: string) => `Occupancy date: ${date} (${value})`,
    unitReading: (id: string, fields: readonly string[]) => [id, ...fields].join(" · "),
    error: "Invalid or overlapping let dates",
    status: { occupied: "Occupied", reserved: "Reserved", vacant: "Vacant" },
  },
};
