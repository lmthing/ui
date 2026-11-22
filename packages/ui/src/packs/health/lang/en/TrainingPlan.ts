export const words = {
  training: {
    weeks: "Training weeks",
    week: (week: string) => `Week ${week}`,
    program: "Plan progress",
    completed: (done: string, total: string) => `${done} of ${total} completed`,
    noWorkouts: "No scheduled workouts",
    minutes: (value: string) => `${value} min`,
    rest: "Rest",
    done: "Complete",
    pending: "Not complete",
    check: (name: string, done: boolean) => (done ? `${name} complete` : `Mark ${name} complete`),
    emptyWeek: "No workouts planned for this week.",
    success: "Workout marked complete",
    error: "Progress not saved",
    line: (parts: readonly string[]) => parts.join(" · "),
  },
};
