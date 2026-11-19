export { pack } from "./pack";
export * from "./components";
export * from "./archetypes";

export const example = [
  '{"id":"h1","c":"Header","title":"Table Night"}',
  '{"id":"t1","c":"TeamPicker","players":[{"name":"Anna"},{"name":"Ben"},{"name":"Sam"},{"name":"Jo"},{"name":"Lee"},{"name":"Kim"}],"teams":[{"label":"Leaves"},{"label":"Roots"},{"label":"Seeds"}]}',
  '{"id":"t2","c":"TurnOrder","players":[{"name":"Leaves"},{"name":"Roots"},{"name":"Seeds"}],"laps":2}',
  '{"id":"d1","c":"Dice","count":2,"sides":6,"style":"pips"}',
  '{"id":"s1","c":"Spinner","options":[{"label":"Nature"},{"label":"Words"},{"label":"Numbers"},{"label":"History"},{"label":"Geography"},{"label":"Mime"}],"repeat":true}',
  '{"id":"t3","c":"Timer","label":"Question clock","seconds":30,"style":"down"}',
  '{"id":"t4","c":"Trivia","questions":[{"question":"Which part takes up water?","answer":"Roots","points":1},{"question":"How many sides does a triangle have?","answer":"Three","points":1},{"question":"Which planet is known as the red planet?","answer":"Mars","points":1},{"question":"How many days are in a week?","answer":"Seven","points":1},{"question":"What is frozen water called?","answer":"Ice","points":1},{"question":"Which ocean is the largest?","answer":"Pacific","points":1}]}',
  '{"id":"s2","c":"ScoreSheet","players":[{"name":"Leaves"},{"name":"Roots"},{"name":"Seeds"}],"rounds":[{"label":"Question one","points":[1,0,1]},{"label":"Question two","points":[0,1,0]},{"label":"Question three","points":[1,0,1]},{"label":"Question four","points":[0,1,0]},{"label":"Question five","points":[1,1,1]},{"label":"Question six","points":[1,0,1]}],"style":"round","share":false}',
  '{"id":"l1","c":"List","style":"ranked","rows":[{"title":"Leaves","value":"4","trail":"value"},{"title":"Seeds","value":"4","trail":"value"},{"title":"Roots","value":"3","trail":"value"}]}',
  '{"id":"n1","c":"Note","text":"Leaves and Seeds tie on four points. The host records awards after revealing each answer."}',
  "",
].join("\n");
