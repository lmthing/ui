export { pack } from "./pack";
export * from "./components";
export * from "./archetypes";

export const example = `{"id":"h1","c":"Header","title":"Vows","sub":"A wedding for 80"}
{"id":"t1","c":"Timer","style":"until","label":"Wedding day","until":"2027-06-12","at":"17:00"}
{"id":"c1","c":"Checklist","items":[{"text":"Book Harbour Hall","done":true},{"text":"Confirm the tasting","done":false},{"text":"Send the final invites","done":false}]}
{"id":"b1","c":"Button","label":"Open guest list","goto":"guests"}
{"id":"c2","c":"Chips","items":[{"label":"All","on":false},{"label":"Waiting","on":true}]}
{"id":"g1","c":"GuestList","guests":[{"name":"Ruth Shah","party":"Shah family","status":"yes","plus":1,"diet":"Vegetarian","goto":"ruth"},{"name":"Deepa Shah","party":"Shah family","status":"waiting","plus":0,"goto":"deepa"},{"name":"Imani Cole","status":"yes","plus":0,"goto":"imani"},{"name":"Hugo Wells","status":"no","plus":0,"goto":"hugo"}]}
{"id":"s1","c":"Seating","tables":[{"label":"Oak","shape":"round","seats":10,"guests":["Ruth Shah","Sam Gray"]},{"label":"Birch","shape":"round","seats":10,"guests":["Imani Cole"]},{"label":"Ash","shape":"round","seats":10,"guests":[]},{"label":"Elm","shape":"round","seats":10,"guests":[]},{"label":"Holly","shape":"round","seats":10,"guests":[]},{"label":"Cedar","shape":"round","seats":10,"guests":[]},{"label":"Maple","shape":"round","seats":10,"guests":[]},{"label":"Willow","shape":"round","seats":10,"guests":[]}],"unseated":["Nia Cole"]}
{"id":"v1","c":"Vendors","vendors":[{"role":"food","name":"Juniper Kitchen","cost":2400,"paid":1200,"due":"2027-05-30","booked":true,"phone":"01632 960123"},{"role":"music","name":"The May Quartet","cost":900,"paid":0,"booked":false}]}
{"id":"h2","c":"Hero","title":"Ruth and Sam","media":"cover","photo":"lib:hall"}
{"id":"k1","c":"KeyValue","pairs":[{"label":"Dress code","value":"Garden party"},{"label":"Doors","value":"17:00"}]}
{"id":"m1","c":"MapPins","pins":[{"label":"Harbour Hall"}]}
{"id":"r1","c":"RSVP","event":"Ruth and Sam's wedding","date":"2027-06-12","plusMax":2,"meals":["Lemon chicken","Roast squash"],"answer":"none"}
{"id":"n1","c":"Note","text":"Celebrating with you is enough."}
{"id":"r2","c":"Registry","gifts":[{"title":"Linen tablecloth","photo":"lib:linen","price":45,"where":"Loom House","claimed":false},{"title":"Blue serving bowl","photo":"lib:bowl","price":32,"claimed":true}],"host":false}
{"id":"d1","c":"Door","hint":"Scan a Vows admission pass"}
{"id":"t2","c":"Ticket","event":"Ruth and Sam's wedding","date":"2027-06-12","time":"17:00","place":"Harbour Hall","type":"Guest","holder":"Imani Cole","number":"VOWS0052"}
{"id":"f1","c":"FindDate","dates":[{"date":"2027-05-14","time":"18:00"},{"date":"2027-05-15","time":"12:00"}],"people":[{"name":"Ruth Shah","answers":["maybe","yes"]},{"name":"Sam Gray","answers":["no","yes"]}]}
`;
