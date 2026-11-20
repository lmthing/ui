export { pack } from "./pack";
export * from "./components";
export * from "./archetypes";

export const example = `{"id":"h1","c":"Header","title":"Kanji Drop"}
{"id":"s1","c":"Streak","count":12,"label":"days studying","days":[true,true,true,true,true,false,false]}
{"id":"p1","c":"Path","units":[{"title":"Basic strokes","state":"done","icon":"pencil","goto":"strokes"},{"title":"Numbers","state":"done","icon":"target","goto":"numbers"},{"title":"Everyday signs","state":"done","icon":"pin","goto":"signs"},{"title":"Water radical","state":"current","icon":"drop","goto":"water"},{"title":"Mountains and rivers","state":"locked","icon":"mountain","goto":"rivers"},{"title":"Trees and forests","state":"locked","icon":"tree","goto":"trees"},{"title":"Fire and light","state":"locked","icon":"flame","goto":"fire"},{"title":"People and places","state":"locked","icon":"users","goto":"people"},{"title":"Days and months","state":"locked","icon":"calendar","goto":"dates"},{"title":"Movement","state":"locked","icon":"footprints","goto":"movement"},{"title":"Food and drink","state":"locked","icon":"apple","goto":"food"},{"title":"Nature review","state":"locked","icon":"trophy","goto":"review"}],"milestones":[3,7,11]}
{"id":"b1","c":"Button","label":"Continue","goto":"water"}
{"id":"s2","c":"Steps","at":2,"count":3}
{"id":"l1","c":"Lesson","title":"The water radical","text":"水 means water. On the left of a character it often becomes three strokes: 氵.","example":"海 (umi) means sea. Look for 氵 on its left.","photo":"lib:ocean"}
{"id":"q1","c":"Quiz","questions":[{"kind":"choice","question":"Which reading means water?","options":["mizu","yama","kawa"],"answer":0,"explain":"Mizu is the common reading of 水."},{"kind":"type","question":"Type the reading of 川.","answer":"kawa"},{"kind":"truefalse","question":"Is yama a reading of 山?","answer":true},{"kind":"choice","question":"Which reading means sea?","options":["mori","umi","hi"],"answer":1},{"kind":"type","question":"Type the reading of 木.","answer":"ki"}]}
{"id":"f1","c":"Flashcard","cards":[{"front":"水","back":"mizu · water","hint":"Something you drink"},{"front":"山","back":"yama · mountain"},{"front":"川","back":"kawa · river"}]}
{"id":"r1","c":"Result","right":9,"of":10,"seconds":92,"points":90,"mistakes":[{"question":"What is the reading of 川?","answer":"kawa"}]}
{"id":"a1","c":"Achievements","badges":[{"title":"First kanji","icon":"star","earned":"2026-10-04"},{"title":"Radical reader","icon":"drop","how":"Master 20 characters with the water radical."}]}
{"id":"t1","c":"Timetable","days":[{"day":"mon","periods":[{"time":"09:00","subject":"Japanese","room":"B12","teacher":"Ms Tanaka"}]},{"day":"wed","periods":[{"time":"10:30","subject":"Calligraphy","room":"Studio 2"}]}]}
{"id":"a2","c":"Assignments","items":[{"title":"Water radical worksheet","subject":"Japanese","due":"2026-11-25","status":"todo","goto":"worksheet"}]}
`;
