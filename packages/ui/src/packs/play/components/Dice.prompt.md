## Purpose

Roll numbered dice and hold individual faces while rerolling the others.

## Pick

Random numbered dice with optional holds and a computed sum. Not manual counting (Counter), named random options (Spinner), or a loading indicator.

## Writer

- sides is the number 4, 6, 8, 10, 12 or 20. Use style: "numbers" for ordinary numbered dice; pips is six-sided only. Never write faces, held flags or sum.
- For a dice pool with numbered faces and a counted/dropped label use style: "pool", on any supported sides. Use mod for a signed modifier added once to the total and drop: "low" or "high" to omit one face from the total, only if requested.
- For hiding the setup caption alone use {"detail":"brief"}.
