# Counter: increment and decrement role validation

Counter draws the minus and plus parts as accessible buttons and declares `decrement` and
`increment` on those exact addresses. Both actions exist in the catalog vocabulary.

`test/reading.test.tsx` has no accepted-role entries for either action. Its fallback empty array
rejects the correctly rendered button roles for both examples:

`AssertionError: c1/minus has role button: expected [] to include 'button'`

Needed outside this task's scope: add button-role mappings for `increment` and `decrement` in the
shared reading validator, then remove this marker. Counter's own rendering tests verify both
button roles and addresses without changing or suppressing its model probes.
