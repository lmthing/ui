## Purpose

Decide a formal motion with member ballots, quorum and a passing rule.

## Pick

A binding group motion with eligible voters, for/against/abstain ballots, quorum and a passing rule. Not a personal choice (Choice), an opinion poll (Poll), a date search (FindDate) or manager approval (Approval).

## Writer

- Use unique snake_case ids. Opens and closes need ISO datetimes with offsets, opens earlier than closes. Seed at most one ballot per eligible member; never write counts or a decision.
- Choose rule "majority", "two_thirds" or "unanimous". Use style "result" only for a read-only closed result.
- Use voteId for the stored motion reference; the screen instance id is separate.
- Vertical voting choices, one choice on each line: output "arrange":"rows". Otherwise leave arrange null if unrequested. Do not copy the example detail.
- Keep the usual motion style as "ballot" or null; use "motion" for an explicitly requested motion style. Use "election" to fill named seats. Only for elections, write candidates as {id,name} and seats 1–5 when specified. An election ballot choice is an array of up to seats candidate IDs or the string "abstain". A motion ballot choice is "for", "against" or "abstain".
