export { pack } from "./pack";
export * from "./components";
export * from "./archetypes";

export const example = [
  '{"id":"h1","c":"Header","title":"Patch notices"}',
  '{"id":"c1","c":"Card","title":"Water supply off","body":"The water supply will be off until noon on Saturday."}',
  '{"id":"s1","c":"SectionTitle","text":"Recent notices"}',
  '{"id":"l1","c":"List","style":"expand","rows":[{"title":"Sunday seed swap","body":"Meet at the gate; bring any seeds you can spare."}]}',
  '{"id":"b1","c":"Button","label":"Bring something","goto":"contributions"}',
  '{"id":"h2","c":"Header","title":"Seed swap"}',
  '{"id":"s2","c":"SignUpSheet","title":"What to bring","slots":[{"id":"tables","title":"Bring a folding table","capacity":3},{"id":"refreshments","title":"Bring refreshments","capacity":4}],"claims":[{"slotId":"tables","memberId":"ana"},{"slotId":"refreshments","memberId":"lee"}]}',
  '{"id":"n1","c":"Note","text":"Drop contributions off by 9 am."}',
  '{"id":"h3","c":"Header","style":"back","title":"Shed motion"}',
  '{"id":"v1","c":"Vote","voteId":"shed","motion":"Buy a shared tool shed","detail":"Set aside up to 450 from the maintenance fund.","style":"result","opens":"2026-11-18T19:00:00Z","closes":"2026-11-18T20:00:00Z","quorum":8,"rule":"majority","ballots":[{"memberId":"ana","choice":"for"},{"memberId":"lee","choice":"for"},{"memberId":"bo","choice":"for"},{"memberId":"nia","choice":"for"},{"memberId":"mo","choice":"for"},{"memberId":"bea","choice":"for"},{"memberId":"ali","choice":"for"},{"memberId":"eva","choice":"against"},{"memberId":"ivy","choice":"against"},{"memberId":"sam","choice":"against"},{"memberId":"ned","choice":"abstain"}]}',
  '{"id":"n2","c":"Note","text":"Only eligible members can vote."}',
  '{"id":"h4","c":"Header","style":"back","title":"Meeting record"}',
  '{"id":"m1","c":"Minutes","title":"November committee minutes","date":"2026-11-18","chairId":"bo","decisions":[{"id":"shed_purchase","title":"Buy a shared tool shed","text":"Purchase a shared shed within the agreed budget.","voteId":"shed"}],"actions":[{"id":"quotes","decisionId":"shed_purchase","text":"Obtain three quotes","ownerId":"ana","due":"2026-11-28","done":true},{"id":"delivery","decisionId":"shed_purchase","text":"Arrange shed delivery","ownerId":"lee","due":"2026-12-12","done":false}],"approvedAt":"2026-11-19T10:00:00Z","approvedBy":"bo"}',
  '{"id":"n4","c":"Note","text":"Follow-up actions can still be updated after approval."}',
  '{"id":"h5","c":"Header","title":"Membership register"}',
  '{"id":"s3","c":"Search","hint":"Find a member"}',
  '{"id":"c2","c":"Chips","items":[{"label":"All","on":true},{"label":"Voting"}]}',
  '{"id":"m2","c":"Members","members":[{"id":"ana","name":"Ana Reed","roles":["Secretary"],"joined":"2024-03-12","votingRights":true,"goto":"ana"},{"id":"lee","name":"Lee Ortiz","roles":["Treasurer"],"joined":"2024-03-12","votingRights":true,"goto":"lee"},{"id":"bo","name":"Bo James","roles":["Chair"],"joined":"2024-03-12","votingRights":true,"goto":"bo"},{"id":"nia","name":"Nia Bell","roles":["Plot steward"],"joined":"2024-03-12","votingRights":true},{"id":"mo","name":"Mo Patel","roles":[],"joined":"2024-03-12","votingRights":true},{"id":"bea","name":"Bea Cole","roles":[],"joined":"2024-03-12","votingRights":true},{"id":"ali","name":"Ali Noor","roles":[],"joined":"2025-04-06","votingRights":true},{"id":"eva","name":"Eva Hall","roles":[],"joined":"2025-04-06","votingRights":true},{"id":"ivy","name":"Ivy Shaw","roles":[],"joined":"2025-04-06","votingRights":true},{"id":"sam","name":"Sam Wells","roles":[],"joined":"2025-04-06","votingRights":true},{"id":"ned","name":"Ned Lowe","roles":[],"joined":"2025-04-06","votingRights":true},{"id":"liv","name":"Liv Park","roles":[],"joined":"2025-04-06","votingRights":false}]}',
  '{"id":"h6","c":"Header","title":"Membership dues"}',
  '{"id":"d1","c":"Dues","period":"2026 subscriptions","assessments":[{"id":"ana_2026","memberId":"ana","amount":25,"due":"2026-04-01"},{"id":"lee_2026","memberId":"lee","amount":25,"due":"2026-04-01"},{"id":"bo_2026","memberId":"bo","amount":25,"due":"2026-04-01"},{"id":"nia_2026","memberId":"nia","amount":25,"due":"2026-04-01"},{"id":"mo_2026","memberId":"mo","amount":25,"due":"2026-04-01"},{"id":"bea_2026","memberId":"bea","amount":25,"due":"2026-04-01"},{"id":"ali_2026","memberId":"ali","amount":25,"due":"2026-04-01"},{"id":"eva_2026","memberId":"eva","amount":25,"due":"2026-04-01"},{"id":"ivy_2026","memberId":"ivy","amount":25,"due":"2026-04-01"},{"id":"sam_2026","memberId":"sam","amount":25,"due":"2026-04-01"},{"id":"ned_2026","memberId":"ned","amount":25,"due":"2026-04-01"},{"id":"liv_2026","memberId":"liv","amount":25,"due":"2026-04-01"}],"receipts":[{"id":"receipt_1","assessmentId":"ana_2026","amount":25,"date":"2026-03-10","method":"transfer"},{"id":"receipt_2","assessmentId":"lee_2026","amount":25,"date":"2026-03-10","method":"cash"},{"id":"receipt_3","assessmentId":"bo_2026","amount":25,"date":"2026-03-10","method":"transfer"},{"id":"receipt_4","assessmentId":"nia_2026","amount":25,"date":"2026-03-10","method":"cash"},{"id":"receipt_5","assessmentId":"mo_2026","amount":25,"date":"2026-03-10","method":"transfer"},{"id":"receipt_6","assessmentId":"bea_2026","amount":25,"date":"2026-03-10","method":"cash"},{"id":"receipt_7","assessmentId":"ali_2026","amount":25,"date":"2026-03-10","method":"transfer"},{"id":"receipt_8","assessmentId":"eva_2026","amount":25,"date":"2026-03-10","method":"cash"}]}',
  '{"id":"n3","c":"Note","text":"Enter receipts as they clear."}',
  '{"id":"h7","c":"Header","title":"Moderation"}',
  '{"id":"q1","c":"ModQueue","items":[{"id":"ana_join","kind":"join","author":"Ana Reed","summary":"Wants to help at the seed swap","detail":"Confirmed a place in the ward.","submittedAt":"2026-11-21T09:00:00Z","status":"pending"}],"rules":["Local residents only","No advertising"]}',
  '{"id":"n5","c":"Note","text":"Decisions are shared with the committee."}',
  "",
].join("\n");
