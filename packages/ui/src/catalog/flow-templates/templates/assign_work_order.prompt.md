## Purpose

Assign a service request to a worker, verify the outcome, and show the requester what was done.

## Pick

Choose when a dispatcher assigns a request to a different worker, that worker reports the outcome, and the dispatcher closes it for the requester.

## Avoid

Not for a simple issue resolved by its original recipient without a separate assignee, or a yes/no approval with no work to perform.

## Writer

- Keep one work reference through request, assignment, result, and closure. Use RequestQueue or RequestTriage for assignment, WorkOrder for the assignee, and HandoffReceipt for the transferred record.
- Distinguish received but unassigned, assigned, outcome submitted, and closed. The worker's submission does not close the request.
