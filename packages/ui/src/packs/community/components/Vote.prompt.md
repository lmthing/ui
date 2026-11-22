<!-- replay-literals: d d mcdsdd -->

## Purpose

Decide a formal motion with member ballots, quorum and a passing rule.

## Pick

A binding group motion with eligible voters, for/against/abstain ballots, quorum and a passing rule. Not a personal choice (Choice), an opinion poll (Poll), a date search (FindDate) or manager approval (Approval).

## Writer

- Use unique snake_case ids. Opens and closes need ISO datetimes with offsets, opens earlier than closes. Seed at most one ballot per eligible member; never write counts or a decision.
- Choose rule "majority", "two_thirds" or "unanimous". Use style "result" only for a read-only closed result.
- Use voteId for the stored motion reference; the screen instance id is separate.
- Use arrange "rows" only when asked to stack choices one per line. Otherwise use arrange:null. Use null for unrequested detail. Do not copy a description from the example.
