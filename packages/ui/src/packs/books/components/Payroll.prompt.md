## Purpose

Calculate, finalise and retain a small business's pay run.

## Pick

A business pay run with hourly or salary inputs, adjustments, deductions and employer costs; finalise it or open payslips. Not a people directory (People), a staff time record (Timesheet), clock-in (TimeClock), or project time (TimeLog).

## Writer

- Use unique snake_case employeeRefs and one to six payees. Hourly payees require hours (0–744); omit hours for salary and use the period salary as rate.
- Do not write computed gross, deductions, net pay or employer costs. A paidAt requires a finalizedAt, with offset datetimes, and a run with a recorded payment cannot be voided.
- Use style "payslip" for the payee selected by the host, never by row position; otherwise use "run".
- Use detail "brief" only when asked to hide pay basis, rate and hours; keep those input fields. A detail request does not request a surface or density. Leave surface and density null unless asked for an outline or compact spacing; do not write the defaults "card" or "comfortable".
