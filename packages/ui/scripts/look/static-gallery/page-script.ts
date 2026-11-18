// Inline browser code, deliberately library-free and independent of the export command.
export const pageScript = `
const q=document.getElementById("filter"),count=document.getElementById("count");
const sections=[...document.querySelectorAll("[data-section]")],cards=[...document.querySelectorAll("article")];
const nav=document.querySelector(".section-nav"),back=document.querySelector(".back-top");
const state={scope:"all",status:"all",view:"cards"};
const byId=id=>document.getElementById(id);
let observer,frame;
function params(){
  const p=new URLSearchParams();
  if(state.scope!=="all")p.set("scope",state.scope);
  if(state.status!=="all")p.set("status",state.status);
  if(q.value)p.set("q",q.value);
  return p.size?"?"+p.toString():"";
}
function links(){
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    const anchor=a.getAttribute("href").split("?")[0];
    a.setAttribute("href",anchor+params());
  });
}
function pressed(id,value){
  byId(id).querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.value===value));
}
function setSection(s,open){
  s.querySelector(".grid").hidden=!open;
  s.querySelector(".section-toggle").setAttribute("aria-expanded",open);
}
function expandCard(a,open){
  a.toggleAttribute("data-expanded",open);
  const b=a.querySelector(".compact-toggle");
  b.setAttribute("aria-expanded",open);
  b.textContent=(open?"Collapse ":"Expand ")+a.id.slice(2);
}
function active(){
  const visible=sections.filter(s=>!s.hidden);
  const edge=parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sticky-height"))||0;
  const bottom=scrollY>0&&scrollY+innerHeight>=document.documentElement.scrollHeight-1;
  const current=bottom?visible.at(-1):visible.find(s=>s.getBoundingClientRect().bottom>edge+1);
  document.querySelectorAll("[data-nav]").forEach(a=>{
    const hit=current&&a.dataset.nav===current.dataset.section;
    if(hit)a.setAttribute("aria-current","location");else a.removeAttribute("aria-current");
  });
  back.hidden=scrollY<innerHeight/2;
}
function observe(){
  if(observer)observer.disconnect();
  const root=document.documentElement,header=document.querySelector("header").getBoundingClientRect().height;
  root.style.setProperty("--header-height",header+"px");
  const edge=header+(innerWidth<1000?nav.getBoundingClientRect().height:0);
  root.style.setProperty("--sticky-height",edge+"px");
  observer=new IntersectionObserver(active,{rootMargin:"-"+edge+"px 0px -40% 0px"});
  sections.filter(s=>!s.hidden).forEach(s=>observer.observe(s));
  active();
}
function apply(save=false){
  const text=q.value.trim().toLowerCase();let n=0;
  cards.forEach(a=>{
    const hit=(!text||a.dataset.search.includes(text))&&(state.scope==="all"||a.dataset.scope===state.scope)
      &&(state.status==="all"||a.dataset.status===state.status);
    a.hidden=!hit;if(hit)n++;
  });
  sections.forEach(s=>{
    const list=[...s.querySelectorAll("article")].filter(a=>!a.hidden);
    const drafts=list.filter(a=>a.dataset.status==="draft").length,id=s.dataset.section;
    const summary=list.length+" components · "+(list.length-drafts)+" ready · "+drafts+" draft";
    s.hidden=!list.length;s.querySelector("[data-section-count]").textContent=summary;
    const tile=document.querySelector('[data-overview="'+id+'"]'),link=document.querySelector('[data-nav="'+id+'"]');
    tile.hidden=link.hidden=!list.length;
    tile.querySelector("[data-overview-count]").textContent=summary;
    link.querySelector("[data-nav-count]").textContent=list.length;
  });
  document.querySelectorAll(".nav-group").forEach(g=>g.hidden=![...g.querySelectorAll("a")].some(a=>!a.hidden));
  count.textContent=n+" components";byId("none").hidden=n>0;
  ["scope","status","view"].forEach(id=>pressed(id,state[id]));
  links();if(save)history.replaceState(null,"","#"+params());
  observe();
}
function view(value,save=false){
  state.view=value==="compact"?"compact":"cards";
  document.body.dataset.view=state.view;
  sections.forEach(s=>{
    const list=cards.filter(a=>a.closest("[data-section]")===s);
    if(state.view==="compact"&&list[0]?.dataset.scope==="packs")
      list.sort((a,b)=>(a.dataset.status==="draft")-(b.dataset.status==="draft"));
    list.forEach(a=>s.querySelector(".grid").append(a));
  });
  pressed("view",state.view);
  if(save)try{localStorage.setItem("gallery-view",state.view)}catch{}
}
function jump(hash=location.hash){
  const raw=hash.slice(1).split("?")[0];
  let id;try{id=decodeURIComponent(raw)}catch{return}
  const target=byId(id);if(!target)return;
  const s=target.closest("[data-section]");if(s)setSection(s,true);
  if(target.matches("article"))expandCard(target,true);
  requestAnimationFrame(()=>{target.scrollIntoView({block:"start"});active()});
}
function restore(){
  const p=new URLSearchParams(location.hash.split("?")[1]||"");
  state.scope=["core","packs"].includes(p.get("scope"))?p.get("scope"):"all";
  state.status=["ready","draft"].includes(p.get("status"))?p.get("status"):"all";
  q.value=p.get("q")||"";apply();jump();
}
["scope","status","view"].forEach(id=>byId(id).addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  if(id==="view")view(b.dataset.value,true);else state[id]=b.dataset.value;
  apply(id!=="view");
}));
q.addEventListener("input",()=>apply(true));
byId("expand").onclick=()=>sections.forEach(s=>setSection(s,true));
byId("collapse").onclick=()=>sections.forEach(s=>setSection(s,false));
sections.forEach(s=>s.querySelector(".section-toggle").onclick=()=>setSection(s,s.querySelector(".grid").hidden));
cards.forEach(a=>{
  a.querySelector(".compact-toggle").onclick=()=>expandCard(a,!a.hasAttribute("data-expanded"));
  a.onclick=e=>{
    if(state.view==="compact"&&!a.hasAttribute("data-expanded")&&!e.target.closest("a,button,summary"))
      expandCard(a,true);
  };
});
document.addEventListener("toggle",e=>{
  if(e.target.matches?.("details"))e.target.closest("article").toggleAttribute("open-all",e.target.open);
},true);
document.addEventListener("keydown",e=>{
  const editing=e.target.matches?.("input,textarea,select")||e.target.isContentEditable;
  if(e.key==="/"&&!editing&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();q.focus()}
  if(e.key==="Escape"){q.value="";apply(true)}
});
addEventListener("hashchange",restore);
document.addEventListener("click",e=>{
  const a=e.target.closest('a[href^="#"]');if(a)jump(a.getAttribute("href"));
});
addEventListener("scroll",()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;active()})},{passive:true});
new ResizeObserver(observe).observe(document.querySelector("header"));
addEventListener("resize",observe);
try{view(localStorage.getItem("gallery-view"))}catch{view("cards")}
restore();
`;
