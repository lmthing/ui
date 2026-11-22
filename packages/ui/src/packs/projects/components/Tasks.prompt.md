## Purpose

Track assigned project tasks, their subtasks, due dates and blockers.

## Pick

Assigned deliverable work with subtasks or dependencies. Not independent jobs (Checklist), operational columns (Board), or graded coursework (Assignments).

## Writer

- For normal task lists write "style": null. Set "style": "today" ONLY when asked to show only tasks due today, and keep all supplied task rows and due dates. A due date, tags, recurrence or grouping alone never requests this filter.
- Use only supplied record refs. Include state "todo", "doing" or "done" on leaves; omit it on parents with children. Each subtask is directly under a parent in the same project. Use after for prerequisite task refs, not parentRef.
- Use group "sections" to group by project and indent children; leave group null otherwise. Do not write blocker, overdue or completion summaries.
- Write repeat only if a cadence is specified and tags only for up to two requested short labels.
