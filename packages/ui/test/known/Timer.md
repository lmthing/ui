# Timer: shared reading-test action roles

The Timer buttons render at `c1/start` and `c1/stop`, both with role `button`, and expose the required
`start` and `stop` actions. Timer's own rendering tests verify both addresses, roles and labels.

`test/reading.test.tsx` does not list either action in its shared `roles` map, so both examples fail
with `AssertionError: c1/start has role button: expected [] to include 'button'`. This is a `(base)`
test-vocabulary gap, not a missing button or incorrect component affordance.

Add `start: ["button"]` and `stop: ["button"]` to that map, then delete this file and rerun the reading
test. The shared test is outside the Timer task's scope.
