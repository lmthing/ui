export const words = {
  routines: {
    rules: "Automation rules",
    activity: "Recent runs",
    run: "Run now",
    automatic: "Auto run",
    enabled: (name: string) => `Enable ${name}`,
    last: (date: string, clock: string) => `Last run: ${date} · ${clock}`,
    never: "Not run yet",
    success: "Routine command acknowledged",
    error: "Couldn’t complete the routine command",
    trigger: (summary: string) => `When: ${summary}`,
    action: (summary: string) => `Then: ${summary}`,
  },
};
