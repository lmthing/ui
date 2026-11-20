export { pack } from "./pack";
export * from "./components";
export * from "./archetypes";

// Keep the data-only entry equivalent to the worked JSONL.
export const example = [
  '{"id":"h1","c":"Header","title":"Stockroom"}',
  '{"id":"f1","c":"FilterBar","hint":"Find stock","filters":[{"label":"Stock","options":["Low stock","In stock"],"value":"Low stock"},{"label":"Supplier","options":["Green Lane","Cedar Mill"]}],"sort":"Lowest stock first"}',
  '{"id":"t1","c":"Table","columns":[{"label":"Product","kind":"text"},{"label":"Stock","kind":"number"},{"label":"Supplier","kind":"text"},{"label":"Status","kind":"status"}],"rows":[{"cells":["Seed tray",1,"Green Lane","Low stock"],"goto":"trays"},{"cells":["Hand trowel",2,"Cedar Mill","Low stock"]},{"cells":["Bamboo stake",3,"Green Lane","Low stock"]},{"cells":["Peat-free compost",4,"Cedar Mill","Low stock"]},{"cells":["Jute twine",5,"Green Lane","In stock"]},{"cells":["Terracotta pot",6,"Cedar Mill","In stock"]},{"cells":["Plant labels",7,"Green Lane","In stock"]},{"cells":["Watering can",8,"Cedar Mill","In stock"]},{"cells":["Garden fork",9,"Green Lane","In stock"]},{"cells":["Seed scoop",10,"Cedar Mill","In stock"]},{"cells":["Kneeling pad",11,"Green Lane","In stock"]},{"cells":["Glass mister",12,"Cedar Mill","In stock"]},{"cells":["Coco liner",13,"Green Lane","In stock"]},{"cells":["Root pouch",14,"Cedar Mill","In stock"]},{"cells":["Pruning snips",15,"Green Lane","In stock"]},{"cells":["Hanging basket",16,"Cedar Mill","In stock"]},{"cells":["Potting grit",17,"Green Lane","In stock"]},{"cells":["Copper tape",18,"Cedar Mill","In stock"]},{"cells":["Shade cloth",19,"Green Lane","In stock"]},{"cells":["Mulch mat",20,"Cedar Mill","In stock"]}],"sort":1,"selectable":true}',
  '{"id":"b1","c":"BulkActions","items":[{"icon":"shopping_cart","label":"Reorder","danger":false},{"icon":"close","label":"Delete stock","danger":true}]}',
  '{"id":"h2","c":"Header","title":"Stockroom sales"}',
  '{"id":"s1","c":"Segmented","options":[{"label":"Week"},{"label":"Month"}],"at":0}',
  '{"id":"s2","c":"Stats","tiles":[{"label":"Orders","value":"45"},{"label":"Returns","value":"4"}]}',
  '{"id":"l1","c":"LineChart","title":"Weekly sales","unit":"orders","labels":["W1","W2","W3","W4"],"series":[{"label":"Orders","values":[6,9,12,18]},{"label":"Returns","values":[0,1,1,2]}]}',
  '{"id":"b2","c":"Bars","title":"Sales by category","unit":"orders","style":"share","points":[{"label":"Tools","value":20},{"label":"Seeds","value":25}]}',
  '{"id":"h3","c":"Header","title":"Stockroom traffic"}',
  '{"id":"m1","c":"Heatmap","title":"Busy hours","unit":"visits","style":"hours","days":[[0,0,0,0,2,4,6,5,3,1,0,0],[0,0,0,0,2,4,7,4,2,1,0,0],[0,0,0,0,3,4,8,4,3,1,0,0],[0,0,0,0,3,5,8,5,3,1,0,0],[0,0,0,0,4,6,9,6,3,1,0,0],[0,0,0,0,5,8,9,7,4,1,0,0],[0,0,0,0,3,5,7,6,2,1,0,0]]}',
  '{"id":"b3","c":"Bars","title":"Weekend visits","unit":"visits","points":[{"label":"Sat","value":34},{"label":"Sun","value":28}]}',
  '{"id":"h4","c":"Header","title":"Reorders"}',
  '{"id":"f2","c":"FilterBar","hint":"Find reorders","filters":[{"label":"Supplier","options":["Green Lane","Cedar Mill"]}]}',
  '{"id":"b4","c":"Board","columns":[{"label":"Requested"},{"label":"Ordered"},{"label":"Received"}],"cards":[{"title":"Seed trays","column":0,"tag":"Low stock","who":"Ana","value":28,"goto":"trays"},{"title":"Trowels","column":1,"who":"Mina","goto":"trowels"}]}',
  '{"id":"h5","c":"Header","title":"Recent stock changes"}',
  '{"id":"a1","c":"ActivityLog","entries":[{"who":"Ana","photo":"lib:people","text":"Flagged the seed trays for reorder.","time":"09:10","goto":"trays"},{"who":"Mina","photo":"lib:people","text":"Placed the order for trowels.","time":"08:45","goto":"trowels"}]}',
  "",
].join("\n");
