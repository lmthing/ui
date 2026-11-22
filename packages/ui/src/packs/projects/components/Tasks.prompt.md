## Purpose

Track assigned project tasks, their subtasks, due dates and blockers.

## Pick

Assigned deliverable work with subtasks or dependencies. Not independent jobs (Checklist), operational columns (Board), or graded coursework (Assignments).

## Writer

- Use only supplied record refs. Include state "todo", "doing" or "done" on leaves; omit it on parents with children. Each subtask is directly under a parent in the same project. Use after for prerequisite task refs, not parentRef.
- Use group "sections" to group by project and indent children; leave group null otherwise. Always write density null unless tighter rows are requested, even when group is set. Do not write blocker, overdue or completion summaries.
