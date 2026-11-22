## Purpose

Review last night's sleep, its quality and the week's average.

## Pick

One night's bedtime and wake time with an asleep versus awake bar, quality face and weekly sleep average. Not a schedule of timed events (Timeline) or one rating alone (Scale).

## Writer

- Use 24-hour HH:MM for bed and wake. Awake minutes cannot exceed the interval from bed to wake across midnight. If supplied, week contains exactly seven hours values from 0 to 24; never write duration or average.
- For a night with the weekly average hidden, use {"density":null,"surface":null,"detail":"brief"}. Keep the seven nights in week. Set unrequested finish axes to null, never "card" or "comfortable".
- Only select style "stages" if a breakdown is requested. Never infer stages from bedtime, wake or awake time. Leave stages null unless all four actual durations are given; their total must match the night, and the two awake values must agree if both given. Leave unrequested style, hrAvg (bpm) and hrv (ms) null.
