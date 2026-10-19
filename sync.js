/* ¿Wakarú? — progress sync through a private GitHub gist.
   "Iniciar sesión" = paste a GitHub token with the gist scope. Every device merges its progress with the gist,
   so nothing is lost when two devices were used offline. The Gemini key travels encrypted with the token. */
(function(){
"use strict";
const API="https://api.github.com",FILE="wakaru.json",DESC="¿Wakarú? · progreso (no borrar)";
const TOKEN_URL="https://github.com/settings/tokens/new?scopes=gist&description="+encodeURIComponent("¿Wakarú? progreso");
const LOCAL_ONLY=new Set(["key","voice","noThinkCfg","_mt"]);
const SYNC_KEYS=new Set(["words","settings","chat","dictExtra","sugSeen","tomb"]);
let S=LS.get("sync")||null;           // {token,user,gist,last}
let applying=false,timer=null,running=null,again=false,lastErr="";

/* ---------- helpers ---------- */
const saveS=()=>{try{localStorage.setItem("hanashi_sync",JSON.stringify(S))}catch(e){}};
async function gh(path,opt={}){
  const r=await fetch(API+path,{...opt,headers:{"Accept":"application/vnd.github+json","Authorization":"Bearer "+S.token,...(opt.body?{"Content-Type":"application/json"}:{})}});
  if(r.status===401){const e=new Error("auth");e.code="auth";throw e}
  if(!r.ok){const e=new Error("http "+r.status);e.code="http";throw e}
  return r.status===204?null:r.json();
}
async function aesKey(){
  const h=await crypto.subtle.digest("SHA-256",new TextEncoder().encode("wakaru:"+S.token));
  return crypto.subtle.importKey("raw",h,"AES-GCM",false,["encrypt","decrypt"]);
}
const b64=u=>btoa(String.fromCharCode(...new Uint8Array(u))),unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function enc(txt){if(!txt)return null;const iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=await crypto.subtle.encrypt({name:"AES-GCM",iv},await aesKey(),new TextEncoder().encode(txt));return {iv:b64(iv),ct:b64(ct)}}
async function dec(o){if(!o)return "";try{const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(o.iv)},await aesKey(),unb64(o.ct));return new TextDecoder().decode(pt)}catch(e){return ""}}

/* ---------- merge ---------- */
const act=w=>(w.good||0)+(w.bad||0)+(w.lookups||0)+(w.reps||0);
const wt=w=>w.lastSeen||w.added||0;
const better=(a,b)=>act(a)!==act(b)?(act(a)>act(b)?a:b):(wt(a)>=wt(b)?a:b);
function mergeWords(A,B,tomb){
  const byId=new Map();
  [...A,...B].forEach(w=>{if(!w||!w.id)return;const c=byId.get(w.id);byId.set(w.id,c?better(c,w):w)});
  const byJp=new Map();
  for(const w of byId.values()){
    if(tomb[w.id]&&tomb[w.id]>=wt(w))continue;
    const k=normJP(w.jp)||w.id,c=byJp.get(k);byJp.set(k,c?better(c,w):w);
  }
  return [...byJp.values()].sort((a,b)=>(a.added||0)-(b.added||0));
}
const sameDayMax=(a,b,keys)=>{if(!a)return b;if(!b)return a;if(a.day!==b.day)return a.day>b.day?a:b;const o={...a};keys.forEach(k=>o[k]=Math.max(a[k]||0,b[k]||0));return o};
function mergeSettings(L,R,preferR){
  if(!R)return L;
  const newer=preferR||(R._mt||0)>(L._mt||0)?R:L,o={...L,...newer};
  o.streak=(!L.streak||!R.streak)?(L.streak||R.streak):L.streak.day!==R.streak.day?(L.streak.day>R.streak.day?L.streak:R.streak):(L.streak.n>=R.streak.n?L.streak:R.streak);
  o.today=sameDayMax(L.today,R.today,["n"]);
  o.prac=sameDayMax(L.prac,R.prac,["xp","done","good","best"]);
  o.usage=sameDayMax(L.usage,R.usage,["req","tok"]);if(o.usage)o.usage.hit=!!((L.usage||{}).hit&&L.usage.day===o.usage.day||(R.usage||{}).hit&&R.usage.day===o.usage.day);
  if(L.verbs||R.verbs){const a=L.verbs||{stats:{}},b=R.verbs||{stats:{}},st={};
    new Set([...Object.keys(a.stats||{}),...Object.keys(b.stats||{})]).forEach(k=>{const x=(a.stats||{})[k]||{n:0,good:0},y=(b.stats||{})[k]||{n:0,good:0};st[k]=x.n>=y.n?x:y});
    o.verbs={...(newer.verbs||a),stats:st};}
  if(L.prog||R.prog){const a=L.prog||{},b=R.prog||{};o.prog={...(newer.prog||a),xp:Math.max(a.xp||0,b.xp||0),conv:Math.max(a.conv||0,b.conv||0),perfect:Math.max(a.perfect||0,b.perfect||0),seenLvl:Math.max(a.seenLvl||1,b.seenLvl||1),badges:[...new Set([...(a.badges||[]),...(b.badges||[])])],migrated:1}}
  o._mt=Math.max(L._mt||0,R._mt||0);
  for(const k of LOCAL_ONLY)if(k!=="_mt")o[k]=L[k];
  return o;
}
function mergeAll(loc,rem,preferR){
  if(!rem)return loc;
  const tomb={...(rem.tomb||{})};Object.entries(loc.tomb||{}).forEach(([k,v])=>tomb[k]=Math.max(tomb[k]||0,v));
  const seen={...(rem.sugSeen||{})};Object.entries(loc.sugSeen||{}).forEach(([k,v])=>{const r=seen[k];seen[k]=!r?v:[Math.max(r[0],v[0]),Math.max(r[1],v[1])]});
  const dx=new Map();[...(rem.dictExtra||[]),...(loc.dictExtra||[])].forEach(e=>e&&e.jp&&dx.set(e.jp,e));
  const chat=((rem.chat&&rem.chat._mt)||0)>((loc.chat&&loc.chat._mt)||0)?rem.chat:loc.chat;
  return {words:mergeWords(loc.words,rem.words||[],tomb),tomb,sugSeen:seen,dictExtra:[...dx.values()],chat,settings:mergeSettings(loc.settings,rem.settings,preferR),keyEnc:rem.keyEnc||null};
}
function localSnap(){
  return {words,tomb:LS.get("tomb")||{},sugSeen:LS.get("sugSeen")||{},dictExtra:LS.get("dictExtra")||[],chat,settings:{...settings}};
}
const pub=s=>{const st={};for(const k in s.settings)if(!LOCAL_ONLY.has(k)||k==="_mt")st[k]=s.settings[k];return {app:"wakaru",v:3,words:s.words,tomb:s.tomb,sugSeen:s.sugSeen,dictExtra:s.dictExtra,chat:s.chat,settings:st,keyEnc:s.keyEnc}};

/* ---------- apply merged data locally ---------- */
async function applyLocal(m,first){
  const before=JSON.stringify([words.length,words.map(w=>w.id+act(w)).join(),settings.streak,settings.today,settings.prac,settings.verbs]);
  applying=true;
  try{
    words=m.words;saveWord();
    const keep={};LOCAL_ONLY.forEach(k=>keep[k]=settings[k]);
    Object.keys(m.settings).forEach(k=>{if(!LOCAL_ONLY.has(k))settings[k]=m.settings[k]});
    settings._mt=m.settings._mt;
    if(!settings.key&&m.keyEnc){const k=await dec(m.keyEnc);if(k){settings.key=k;const o=$("#onb");if(o){o.remove();toast("¡Hola de nuevo! Tu progreso ya está aquí.")}}}
    LS.set("settings",settings);
    if(m.chat&&m.chat!==chat){chat=m.chat;LS.set("chat",chat)}
    LS.set("tomb",m.tomb);LS.set("sugSeen",m.sugSeen);LS.set("dictExtra",m.dictExtra);
    if(typeof DICT!=="undefined"&&DICT.ready)DICT.extra=m.dictExtra.map(e=>mkEntry(e.jp,e.kana,e.es,e.lv,e.pos,true));
  }finally{applying=false}
  const after=JSON.stringify([words.length,words.map(w=>w.id+act(w)).join(),settings.streak,settings.today,settings.prac,settings.verbs]);
  if(first||before!==after){
    try{if(typeof tab!=="undefined"&&tab==="practice"&&window._px&&window._px().active){updateBadge();renderStreak();renderGoal()}else renderAll()}catch(e){}
    try{if(tab==="practice"&&!window._px().active)renderPractice()}catch(e){}
  }
}

/* ---------- the sync itself ---------- */
async function findGist(){
  for(let page=1;page<=5;page++){
    const list=await gh(`/gists?per_page=100&page=${page}`);
    const g=list.find(x=>x.files&&x.files[FILE]&&x.description===DESC)||list.find(x=>x.files&&x.files[FILE]);
    if(g)return g.id;if(list.length<100)break;
  }
  return null;
}
async function readGist(){
  const g=await gh(`/gists/${S.gist}`);const f=g.files&&g.files[FILE];if(!f)return null;
  let txt=f.content;if(f.truncated&&f.raw_url)txt=await (await fetch(f.raw_url)).text();
  try{return JSON.parse(txt)}catch(e){return null}
}
async function doSync(first){
  if(!S||!S.token||!navigator.onLine)return;
  let remote=null;
  if(!S.gist){S.gist=await findGist();saveS()}
  if(S.gist){try{remote=await readGist()}catch(e){if(e.code==="http"){S.gist=null;saveS()}else throw e}}
  const merged=mergeAll(localSnap(),remote,!S.last);
  let keyChanged=false;
  if(settings.key){const old=remote&&remote.keyEnc?await dec(remote.keyEnc):"";keyChanged=old!==settings.key;merged.keyEnc=keyChanged?await enc(settings.key):remote.keyEnc}
  else merged.keyEnc=(remote&&remote.keyEnc)||null;
  await applyLocal(merged,first);
  const out=pub(merged);
  const body=JSON.stringify(out);
  const remoteCmp=remote&&remote.settings?JSON.stringify({...pub(remote),keyEnc:null}):"";
  const outCmp=JSON.stringify({...out,keyEnc:null});
  if(!S.gist){const g=await gh("/gists",{method:"POST",body:JSON.stringify({description:DESC,public:false,files:{[FILE]:{content:body}}})});S.gist=g.id}
  else if(remoteCmp!==outCmp||keyChanged)await gh(`/gists/${S.gist}`,{method:"PATCH",body:JSON.stringify({files:{[FILE]:{content:body}}})});
  S.last=Date.now();lastErr="";saveS();refreshUI();
}
function sync(first){
  if(!S||!S.token)return Promise.resolve();
  if(running){again=true;return running}
  running=doSync(first).catch(e=>{
    lastErr=e.code==="auth"?"auth":"net";
    if(e.code==="auth"){toast("La sesión de GitHub ha caducado. Vuelve a iniciar sesión en Ajustes.");S.token="";saveS()}
    console.warn("sync",e);refreshUI();
  }).finally(()=>{running=null;if(again){again=false;schedule(800)}});
  return running;
}
function schedule(ms=4000){if(!S||!S.token)return;clearTimeout(timer);timer=setTimeout(()=>sync(),ms)}

/* hook storage: any progress change schedules an upload */
const origSet=LS.set.bind(LS);
LS.set=(k,v)=>{
  if(k==="settings"&&!applying&&v===settings)settings._mt=Date.now();
  if(k==="chat"&&!applying&&v===chat)chat._mt=Date.now();
  origSet(k,v);
  if(!applying&&SYNC_KEYS.has(k))schedule();
};
document.addEventListener("visibilitychange",()=>{
  if(!S||!S.token)return;
  if(document.visibilityState==="hidden"){if(timer){clearTimeout(timer);sync()}}
  else if(Date.now()-(S.last||0)>20000)sync();
});
window.addEventListener("online",()=>schedule(500));
setInterval(()=>{if(document.visibilityState==="visible"&&S&&S.token&&Date.now()-(S.last||0)>120000)sync()},30000);

/* ---------- UI ---------- */
const ago=t=>{if(!t)return "nunca";const s=Math.round((Date.now()-t)/1000);if(s<60)return "hace un momento";if(s<3600)return `hace ${Math.round(s/60)} min`;if(s<86400)return `hace ${Math.round(s/3600)} h`;return new Date(t).toLocaleDateString("es-ES")};
function cardHTML(){
  if(S&&S.token)return `<div class="synccard on"><span class="syncic">${CLOUD}</span><div><b>Sesión iniciada · @${esc(S.user||"")}</b>
     <small id="syncWhen">${lastErr==="net"?"Sin conexión: se sincronizará al volver.":"Sincronizado "+ago(S.last)}</small></div></div>
     <p class="info" style="margin:0;font-size:15px;color:var(--muted)">Tu progreso se guarda solo en un gist privado de tu GitHub. Inicia sesión con la misma cuenta en el móvil y en el ordenador y siempre tendrás lo mismo. Tu clave de Gemini viaja cifrada, así que en un dispositivo nuevo no hace falta volver a ponerla.</p>
     <div class="row"><button class="btn" id="syncNow">Sincronizar ahora</button><button class="btn ghost" id="syncOut">Cerrar sesión</button></div>`;
  return `<div class="synccard"><span class="syncic">${CLOUD}</span><div><b>Guarda tu progreso en la nube</b><small>Inicia sesión y tendrás lo mismo en el móvil y en el ordenador.</small></div></div>
     <button class="btn primary" id="syncLogin">Iniciar sesión con GitHub</button>`;
}
const CLOUD=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5a4.25 4.25 0 0 1-.5 9.5H7z"/></svg>`;
function refreshUI(){const b=$("#syncBox");if(b)b.innerHTML=cardHTML()}
window.syncCardHTML=()=>`<div id="syncBox" class="stack" style="gap:10px">${cardHTML()}</div>`;
function loginSheet(){
  openSheet(`<div class="grab"></div><div class="hrow"><h3 class="h2">Iniciar sesión</h3>${INFO}</div>
   <p class="info" style="margin:0;font-size:15px;color:var(--muted)">¿Wakarú? no tiene servidor propio: guarda tu progreso en un gist privado de tu cuenta de GitHub, gratis. Para eso necesita una «llave» que solo puede tocar tus gists (no tu código ni nada más). Se guarda en este dispositivo.</p>
   <ol class="steps">
     <li><a href="${TOKEN_URL}" target="_blank" rel="noopener"><b>Crea tu llave en GitHub</b></a>. Ya viene marcada la casilla <b>gist</b>.</li>
     <li>En <b>Expiration</b> elige <b>No expiration</b> y pulsa <b>Generate token</b>.</li>
     <li>Copia la llave (empieza por <span class="jp">ghp_</span>) y pégala aquí. En tus otros dispositivos pega la misma.</li>
   </ol>
   <form id="syncForm" class="stack" style="gap:8px">
     <input class="field" id="syncToken" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="ghp_…">
     <button class="btn primary" id="syncGo">Entrar</button>
     <div class="notice" id="syncMsg" hidden></div>
   </form>`);
  setTimeout(()=>{const i=$("#syncToken");if(i)i.focus()},100);
}
async function login(token){
  const msg=$("#syncMsg"),btn=$("#syncGo");
  btn.disabled=true;btn.textContent="Comprobando…";msg.hidden=true;
  const prev=S;S={token,user:"",gist:null,last:0};
  try{
    const u=await gh("/user");S.user=u.login;
    await sync(true);
    if(lastErr)throw Object.assign(new Error("x"),{code:lastErr});
    saveS();sfx("done");closeSheet();toast(`Sesión iniciada como @${S.user}. Progreso sincronizado.`);
    refreshUI();
  }catch(e){
    S=prev;saveS();msg.hidden=false;
    msg.textContent=e.code==="auth"?"Esa llave no funciona. Cópiala otra vez desde GitHub (debe tener marcado «gist»).":"No he podido conectar con GitHub. ¿Tienes internet?";
    btn.disabled=false;btn.textContent="Entrar";
  }
}
document.addEventListener("submit",e=>{if(e.target.id!=="syncForm")return;e.preventDefault();const t=$("#syncToken").value.trim();if(t)login(t)});
document.addEventListener("click",e=>{
  const el=e.target.closest("button");if(!el)return;
  if(el.id==="syncLogin"||el.id==="onbLogin"){e.preventDefault();return loginSheet()}
  if(el.id==="syncNow"){el.disabled=true;el.textContent="Sincronizando…";sync().then(()=>{toast(lastErr?"No se ha podido sincronizar.":"Progreso sincronizado");refreshUI()});return}
  if(el.id==="syncOut"){sync().finally(()=>{S=null;try{localStorage.removeItem("hanashi_sync")}catch(e){}refreshUI();toast("Sesión cerrada. Tu progreso sigue en este dispositivo y en GitHub.")});return}
});
window.wakaruSync={sync,mergeAll,state:()=>S};

if(S&&S.token)sync(true);
})();
