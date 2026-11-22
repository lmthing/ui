<!-- replay-literals: d d mcddd -->

## Purpose

Separate changes in portfolio value from the money I put in or took out.

## Pick

Compare portfolio value with net external contributions as two labelled lines over time, with latest money gain or loss. Not one market price (PriceChart), one small trend (Sparkline), or a generic series (LineChart).

## Writer

- Write 2–60 dated quote observations in increasing time order, with at most one quote per asset in each sample. Missing quotes are omitted, never written as zero; do not write portfolio values, contributions, gains or rates.
- Use ISO datetimes with offsets. Range filters the displayed points, not the contribution baseline.
- Use detail "brief" only when asked to omit the heading above the valuation figures.
