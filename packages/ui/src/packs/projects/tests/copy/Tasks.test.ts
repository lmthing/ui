import { expect, it } from "vitest";
import { projectTasks, taskCopy, taskGroups, taskPreviewComplete } from "../../copy";

it("names blockers, computes overdue, and orders groups without renumbering", () => {
  const common = { projectRef: "first", priority: "normal", after: [], state: "todo" } as const;
  const child = {
    ...common,
    taskRef: "child",
    title: "Child",
    parentRef: "parent",
    due: "2026-11-20",
    id: "r1",
  };
  const parent = { ...common, taskRef: "parent", title: "Parent", state: undefined, id: "r2" };
  const blocked = { ...common, taskRef: "other", title: "Other", after: ["child"], id: "r3" };
  const rows = projectTasks([child, parent, blocked]);
  expect(taskGroups(rows)[0]?.tasks.map(({ id }) => id)).toEqual(["r2", "r1", "r3"]);
  expect(taskCopy(rows[0]!, "en-GB", new Date(2026, 10, 21))).toMatchObject({
    overdue: true,
    due: "Overdue · 20 Nov 2026",
  });
  expect(taskCopy(rows[2]!).blockers).toBe("Blocked by Child");
});

it("completes closed preview graphs without clearing external blockers", () => {
  const seed = { taskRef: "task", projectRef: "project", title: "Task", priority: "normal" } as const;
  const parent = { ...seed, after: [] };
  const child = { ...seed, taskRef: "child", parentRef: "task", state: "todo" } as const;
  const local = projectTasks([parent, { ...child, after: [] }]);
  expect(taskPreviewComplete(local).map(({ progress }) => progress)).toEqual(["done", "done"]);
  expect(local.map(({ progress }) => progress)).toEqual(["todo", "todo"]);
  const external = projectTasks([parent, { ...child, after: ["outside"] }]);
  expect(taskPreviewComplete(external)).toBe(external);
});
