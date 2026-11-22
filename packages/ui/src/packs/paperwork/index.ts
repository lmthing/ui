export { pack } from "./pack";
export * from "./components";
export * from "./archetypes";

export const example = `{"id":"h1","c":"Header","title":"Trot paperwork"}
{"id":"s1","c":"Search","hint":"Find documents"}
{"id":"c1","c":"Chips","items":[{"label":"All","on":true},{"label":"Insurance"},{"label":"Tax"}]}
{"id":"d1","c":"Documents","docs":[{"title":"Trot liability policy","kind":"insurance","owner":"Alex","issuer":"Moor Mutual","issued":"2026-02-01","expires":"2027-02-01","file":"lib:trot_policy","tags":["insurance"],"goto":"vault_record"},{"title":"Alex's photo ID","kind":"id","owner":"Alex","number":"DEMO-TROT","file":"lib:trot_id","tags":["id"]},{"title":"First aid certificate","kind":"certificate","owner":"Alex","expires":"2028-06-01","file":"lib:trot_aid","tags":["training"]},{"title":"April account statement","kind":"tax","owner":"Alex","issued":"2026-04-30","file":"lib:trot_statement_april","tags":["statements"]},{"title":"Office access copy","kind":"form","owner":"Alex","file":"lib:trot_access_copy","tags":["signed"]}]}
{"id":"b1","c":"Button","label":"Scan a file","goto":"vault_capture"}
{"id":"h2","c":"Header","title":"Renewals due"}
{"id":"c2","c":"Calendar","style":"week","month":"January 2027","start":5,"days":31,"selected":12,"marked":[{"day":12}]}
{"id":"r1","c":"Renewals","items":[{"title":"Liability cover","for":"Alex","due":"2027-02-01","noticeBy":"2027-01-12","goto":"paperwork_renewal"},{"title":"Office access permit","for":"Alex","due":"2026-11-15","completedOn":"2026-11-12"}]}
{"id":"b2","c":"Button","label":"Renewal details","goto":"paperwork_renewal"}
{"id":"h3","c":"Header","title":"Trot receipts"}
{"id":"s2","c":"Search","hint":"Search by payee"}
{"id":"r2","c":"Receipts","items":[{"payee":"Walk Supply","date":"2026-11-05","amount":36,"category":"Supplies","file":"lib:trot_supplies","allocation":75,"reviewed":true,"tags":["expenses"]},{"payee":"Park Permit Office","date":"2026-11-08","amount":12,"category":"Fees","file":"lib:trot_park","allocation":100,"reviewed":true,"tags":["expenses","fees"]},{"payee":"Trail Outfitters","date":"2026-11-09","amount":65,"category":"Supplies","file":"lib:trot_outfitters","allocation":40,"reviewed":true,"tags":["expenses"]},{"payee":"North Print Shop","date":"2026-11-10","amount":8.5,"category":"Supplies","file":"lib:trot_print","allocation":100,"reviewed":true,"tags":["expenses"]},{"payee":"First Aid Centre","date":"2026-11-11","amount":45,"category":"Fees","file":"lib:trot_training","reviewed":false,"tags":["expenses","fees"]},{"payee":"Rainy Day Gear","date":"2026-11-12","amount":19.75,"category":"Supplies","file":"lib:trot_rain","allocation":50,"reviewed":true,"tags":["expenses"]}]}
{"id":"b3","c":"Button","label":"Add a scan","goto":"vault_capture"}
{"id":"h4","c":"Header","title":"Evidence for Alex"}
{"id":"t1","c":"TaxYear","label":"Trot 2026–27","from":"2026-04-06","to":"2027-04-05","requirements":[{"label":"Account statements","source":"documents","tag":"statements","needed":12,"goto":"vault_all"},{"label":"Expense receipts","source":"receipts","tag":"expenses","needed":6,"goto":"tax_receipts"}]}
{"id":"n1","c":"Note","text":"Check the folder with your accountant."}
{"id":"b4","c":"Button","label":"Preparation checklist","goto":"tax_tasks"}
{"id":"h5","c":"Header","title":"Before handoff"}
{"id":"s3","c":"Steps","count":3,"at":2,"label":"Check folder"}
{"id":"c3","c":"Checklist","items":[{"text":"Check the evidence folder","done":true},{"text":"Hand the folder to the accountant","done":false}]}
{"id":"b5","c":"Button","label":"Evidence folder","goto":"tax_evidence"}
{"id":"h6","c":"Header","style":"back","title":"Review and sign"}
{"id":"s4","c":"Steps","count":2,"at":1,"label":"Review"}
{"id":"n2","c":"Note","text":"The original form stays unchanged."}
{"id":"s5","c":"Signature","title":"Trot office access form","signer":"Alex","document":"lib:trot_access","hint":"Open the original before drawing."}
{"id":"h7","c":"Header","style":"back","title":"Signed copy"}
{"id":"s6","c":"Success","title":"Copy saved","sub":"Trot office access form"}
{"id":"d2","c":"Documents","docs":[{"title":"Office access copy","kind":"form","owner":"Alex","file":"lib:trot_access_copy","tags":["signed"]}]}
{"id":"b6","c":"Button","label":"Back to vault","goto":"vault_all"}
{"id":"h8","c":"Header","style":"back","title":"Liability policy"}
{"id":"k1","c":"KeyValue","pairs":[{"label":"Owner","value":"Alex"},{"label":"Issuer","value":"Moor Mutual"}]}
{"id":"d3","c":"Documents","docs":[{"title":"Trot liability policy","kind":"insurance","owner":"Alex","file":"lib:trot_policy","expires":"2027-02-01","tags":["insurance"]}]}
{"id":"n3","c":"Note","text":"The original stays on this device."}
{"id":"h9","c":"Header","title":"Scan a document"}
{"id":"a1","c":"Camera","kind":"scan","hint":"Keep the page in frame"}
{"id":"n4","c":"Note","text":"Check the edges before saving."}
{"id":"b7","c":"Button","label":"File scan","goto":"vault_all"}
{"id":"h10","c":"Header","style":"back","title":"Liability renewal"}
{"id":"r3","c":"Renewals","style":"cards","items":[{"title":"Liability cover","for":"Alex","noticeBy":"2027-01-12","due":"2027-02-01"}]}
{"id":"f1","c":"Field","kind":"date","label":"Notice date","value":"2027-01-12"}
{"id":"n5","c":"Note","text":"Renew with your insurer."}
{"id":"b8","c":"Button","label":"Save date","goto":"paperwork_due"}
{"id":"h11","c":"Header","style":"back","title":"Assemble scans"}
{"id":"n6","c":"Note","text":"Check the page order before saving."}
{"id":"s7","c":"ScanBatch","title":"Trot permit packet","pages":[{"file":"lib:trot_permit","label":"Permit"},{"file":"lib:trot_cover","label":"Cover sheet"}],"captureGoto":"vault_capture"}
`;
