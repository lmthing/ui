export { pack } from "./pack";
export * from "./components";
export * from "./archetypes";

export const example =
  '{"id":"h1","c":"Header","title":"Grind weekly rota","sub":"16–22 November"}\n' +
  '{"id":"s1","c":"Segmented","options":[{"label":"Week"},{"label":"Open shifts"}],"at":0}\n' +
  '{"id":"r1","c":"Roster","week":"2026-11-16","people":[{"name":"Lee","photo":"lib:people"},{"name":"Rae","photo":"lib:people"},{"name":"Anika","photo":"lib:people"},{"name":"Sam","photo":"lib:people"},{"name":"Mina","photo":"lib:people"},{"name":"Jo","photo":"lib:people"}],"shifts":[{"person":0,"day":0,"from":"07:00","to":"13:00","role":"Barista"},{"person":1,"day":0,"from":"07:00","to":"13:00","role":"Barista"},{"person":2,"day":1,"from":"07:00","to":"13:00","role":"Barista"},{"person":3,"day":2,"from":"07:00","to":"13:00","role":"Barista"},{"person":4,"day":3,"from":"07:00","to":"13:00","role":"Barista"},{"person":5,"day":4,"from":"07:00","to":"13:00","role":"Barista"},{"person":1,"day":6,"from":"08:00","to":"14:00","role":"Barista"}]}\n' +
  '{"id":"p1","c":"People","style":"stack","members":[{"name":"Lee","photo":"lib:people"},{"name":"Rae","photo":"lib:people"}]}\n' +
  '{"id":"h2","c":"Header","title":"Open shifts"}\n' +
  '{"id":"b1","c":"Banner","text":"Saturday needs cover","tone":"warn"}\n' +
  '{"id":"o1","c":"OpenShift","shifts":[{"date":"2026-11-21","from":"08:00","to":"14:00","role":"Barista","pay":96}]}\n' +
  '{"id":"h3","c":"Header","title":"My shift today"}\n' +
  '{"id":"t1","c":"TimeClock","on":true,"since":"07:00","shift":"Opening at Grind"}\n' +
  '{"id":"s2","c":"Shift","date":"2026-11-16","from":"07:00","to":"13:00","role":"Barista","place":"Grind","with":"Rae","status":"confirmed"}\n' +
  '{"id":"h4","c":"Handover","notes":[{"by":"Rae","time":"06:50","text":"Oat milk is low. Check the delivery before opening.","flag":"Low stock","seen":false}]}\n' +
  '{"id":"c1","c":"Checklist","items":[{"text":"Unlock the door","done":true},{"text":"Check milk delivery"},{"text":"Set out the sign"}]}\n' +
  '{"id":"h5","c":"Header","title":"Request time off"}\n' +
  '{"id":"c2","c":"Choice","question":"What do you need?","options":[{"title":"Day off"},{"title":"Shift swap"}],"at":0}\n' +
  '{"id":"f1","c":"Field","kind":"date","label":"From","value":"2026-11-23"}\n' +
  '{"id":"f2","c":"Field","kind":"date","label":"To","value":"2026-11-23"}\n' +
  '{"id":"c3","c":"Composer","style":"entry","label":"Note","hint":"Add a note for your manager","value":"Rae can cover Monday opening."}\n' +
  '{"id":"b2","c":"Button","label":"Send request"}\n' +
  '{"id":"h6","c":"Header","title":"Manager requests"}\n' +
  '{"id":"s3","c":"Segmented","options":[{"label":"Requests"},{"label":"Hours"}],"at":0}\n' +
  '{"id":"a1","c":"Approval","requests":[{"from":"Lee","photo":"lib:people","kind":"time_off","title":"Monday off","dates":"23 Nov","note":"Rae can cover Monday opening."}]}\n' +
  '{"id":"h7","c":"Header","title":"Weekly hours"}\n' +
  '{"id":"t2","c":"Timesheet","period":"16–22 Nov 2026","rows":[{"name":"Lee","hours":[6,0,0,0,0,6,0],"approved":false},{"name":"Rae","hours":[6,0,0,0,0,0,6],"approved":true}]}\n';
