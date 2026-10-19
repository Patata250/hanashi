/* ¿Wakarú? — Practice: endless short exercises built from the learner's own vocabulary.
   AI items (gap, particle, order, meaning, listen, speak) come from Gemini in batches;
   local items (word, reverse, wordlisten, match) need no AI and keep the session going for free.
   Every answer feeds the same spaced-repetition data the rest of the app uses. */
(function(){
"use strict";
const PX={
  mode:"mix",active:false,queue:[],i:0,cur:null,state:"idle",sel:null,built:[],bank:[],
  busy:false,aiDown:false,recent:[],round:{n:0,good:0,words:new Set()},combo:0,
  match:null,spoken:"",speakScore:0,lastAICheck:0
};
const MODES=[
  ["mix","Mezcla","Un poco de todo"],
  ["gap","Huecos","Completa la frase"],
  ["order","Ordenar","Construye frases"],
  ["listen","Escuchar","Entiende de oído"],
  ["speak","Hablar","Dilo en voz alta"],
  ["words","Palabras","Sin IA, sin límite"]
];
const TITLES={verb:"Conjuga el verbo",verbid:"¿Qué forma es?",gap:"Completa la frase",particle:"Elige la partícula",order:"Ordena la frase",meaning:"¿Qué significa?",listen:"Escucha: ¿qué significa?",speak:"Dilo en japonés",
  word:"¿Qué significa esta palabra?",reverse:"¿Cómo se dice en japonés?",wordlisten:"Escucha la palabra",match:"Une las parejas"};
const ROUND=10;
// one persistent Tama for this section (moved between layouts, so its animation rig is created once)
let pxCat=null;
function catEl(mood){
  if(!pxCat){pxCat=document.createElement("div");pxCat.className="cat";pxCat.setAttribute("aria-hidden","true");pxCat.innerHTML='<img class="fb" src="tama-neutral.webp" alt="">'}
  if(mood!==undefined){pxCat.classList.remove("think","happy","oops");if(mood)pxCat.classList.add(mood)}
  return pxCat;
}
function placeCat(mood){const h=$("#pxCat");if(h)h.appendChild(catEl(mood))}

const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const sameJP=(a,b)=>normJP(plain(a))===normJP(plain(b));
function lev(a,b){const m=a.length,n=b.length;if(!m)return n;if(!n)return m;let p=Array.from({length:n+1},(_,j)=>j);
  for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c}return p[n]}
const sim=(a,b)=>{a=normJP(a);b=normJP(b);if(!a||!b)return 0;return 1-lev(a,b)/Math.max(a.length,b.length)};

/* ---------- daily stats ---------- */
function pstat(){const d=dayKey();if(!settings.prac||settings.prac.day!==d)settings.prac={day:d,xp:0,done:0,good:0,best:(settings.prac&&settings.prac.best)||0};return settings.prac}

/* ---------- local items (no AI) ---------- */
function pool(){
  const mine=words.filter(w=>!w.basic&&w.es);
  const basic=BASIC.filter(b=>!/^〜/.test(b.jp)&&!/partícula/.test(b.es));
  return {mine,all:mine.concat(basic)};
}
function pickTarget(){
  const {mine}=pool();
  if(mine.length){const top=[...mine].sort((a,b)=>priority(b)-priority(a)).slice(0,Math.min(8,mine.length));return pick(top)}
  return pick(pool().all);
}
function distract(target,n,key){
  const seen=new Set([String(target[key]).toLowerCase()]);const out=[];
  for(const w of shuffle(pool().all)){const k=String(w[key]).toLowerCase();if(seen.has(k))continue;seen.add(k);out.push(w);if(out.length>=n)break}
  return out;
}
function localItem(kind,target){
  const w=target||pickTarget();if(!w)return null;
  kind=kind||pick(["word","reverse","wordlisten","word","match"]);
  if(kind==="match"){
    const {all,mine}=pool();
    const base=(mine.length>=4?[...mine].sort((a,b)=>priority(b)-priority(a)).slice(0,10):all);
    const ps=[];const used=new Set();
    for(const x of shuffle(base)){const k=normJP(x.jp)+"|"+x.es.toLowerCase();if(used.has(k))continue;used.add(k);ps.push(x);if(ps.length>=4)break}
    if(ps.length<3)return localItem("word");
    return {type:"match",pairs:ps,words:ps.filter(p=>!p.basic).map(p=>p.id)};
  }
  const key=kind==="reverse"?"jp":"es";
  const opts=shuffle([w,...distract(w,3,key)]);
  return {type:kind,w,options:opts,answer:opts.indexOf(w),words:w.basic?[]:[w.id]};
}

/* ---------- verbs (local engine, no AI) ---------- */
const V=()=>window.VERBS;
function vset(){if(!settings.verbs)settings.verbs={level:1,mix:true,typing:false,stats:{}};return settings.verbs}
function vstat(l){const S=vset();if(!S.stats[l])S.stats[l]={n:0,good:0};return S.stats[l]}
function guessClass(jp,kana){
  const k=String(kana||jp);if(/する$/.test(jp))return"x2";if(k==="くる")return"k";
  if(!/[うくぐすつぬぶむる]$/.test(k))return"";
  if(k.endsWith("る")&&/[いきしちにひみりぎじびぴえけせてねへめれげぜべぺ]る$/.test(k))return"i";
  return"g";
}
function verbPool(){
  const lvl=vset().level,maxLv=lvl<=4?5:lvl<=8?4:3;
  const mine=[];
  words.filter(w=>!w.basic).forEach(w=>{const e=dictFind(w.jp);const cls=(e&&e.cls)||"";
    const c=cls||(/verbo/.test(w.type||"")?guessClass(w.jp,w.kana):"");if(c)mine.push({jp:w.jp,kana:w.kana,es:w.es,cls:c,wid:w.id})});
  const base=DICT.ready?DICT.list.filter(e=>e.cls&&e.lv>=maxLv&&(e.cls!=="s"||e.lv===5)).map(e=>({jp:e.jp,kana:e.kana,es:e.es,cls:e.cls})):[];
  return {mine,base};
}
function verbItem(){
  const S=vset(),L=V().LEVELS,lvl=Math.min(S.level,L.length);
  const cur=L[lvl-1].forms,prev=L.slice(0,lvl-1).flatMap(x=>x.forms);
  const form=(S.mix&&prev.length&&Math.random()<.3)?pick(prev):pick(cur);
  const {mine,base}=verbPool();
  const v=(mine.length&&Math.random()<.55)?pick(mine):pick(base.length?base:mine);if(!v)return null;
  const ans=V().conj(v,form),st=vstat(lvl);
  const all=L.slice(0,lvl).flatMap(x=>x.forms);
  // identify the form (only once there are several forms to tell apart)
  if(all.length>=3&&Math.random()<.2){
    const fs=shuffle([form,...shuffle(all.filter(f=>f!==form)).slice(0,3)]);
    return {type:"verbid",v,form,ans,options:fs,answer:fs.indexOf(form),words:v.wid?[v.wid]:[],lvl};
  }
  const typing=S.typing||(st.good>=12&&Math.random()<.3);
  if(typing)return {type:"verb",vmode:"type",v,form,ans,words:v.wid?[v.wid]:[],lvl};
  const opts=shuffle([ans,...V().wrongs(v,form,3)]);
  return {type:"verb",vmode:"choose",v,form,ans,options:opts,answer:opts.findIndex(o=>o.kana===ans.kana),words:v.wid?[v.wid]:[],lvl};
}
function levelSheet(){
  const S=vset(),L=V().LEVELS;
  openSheet(`<div class="grab"></div><div class="hrow"><h3 class="h2">Nivel de verbos</h3>${INFO}</div>
   <p class="info" style="margin:0;color:var(--muted);font-size:16px">Empieza por arriba. Cuando aciertes de forma constante, Tama te propondrá subir.</p>
   <div class="vlevels">${L.map(l=>{const st=vstat(l.n),acc=st.n?Math.round(st.good/st.n*100):0,ready=st.good>=15&&acc>=85;
     return `<button class="vlv ${S.level===l.n?"on":""}" data-vlevel="${l.n}"><span class="vn">${l.n}</span><span class="vt"><b>${l.title}</b><small>${l.sub} · <span class="jp">${l.ex}</span></small>
       <span class="vbar"><i style="width:${Math.min(100,st.good/15*100)}%"></i></span></span>${ready?`<span class="vok">${SVG.check}</span>`:S.level===l.n?`<span class="vcur">actual</span>`:""}</button>`}).join("")}</div>
   <div class="set"><div><label for="v_mix">Repasar niveles anteriores</label><p class="info">Mezcla un 30 % de formas ya vistas.</p></div><button class="switch" id="v_mix" role="switch" aria-checked="${S.mix}" data-vopt="mix"></button></div>
   <div class="set"><div><label for="v_type">Escribir la respuesta</label><p class="info">Más difícil: escribes la forma en romaji en vez de elegirla.</p></div><button class="switch" id="v_type" role="switch" aria-checked="${S.typing}" data-vopt="typing"></button></div>`);
}

/* ---------- AI batches ---------- */
function typesFor(mode){
  const canSpeak=!!(window.SpeechRecognition||window.webkitSpeechRecognition)&&settings.pracSpeak!==false;
  if(mode==="gap")return["gap","particle"];
  if(mode==="order")return["order"];
  if(mode==="listen")return["listen","meaning"];
  if(mode==="speak")return canSpeak?["speak"]:["order"];
  return["gap","particle","order","meaning","listen"].concat(canSpeak?["speak"]:[]);
}
function validate(x){
  if(!x||typeof x!=="object")return null;
  const t=x.type;x.words=Array.isArray(x.words)?x.words.filter(id=>words.some(w=>w.id===id)):[];
  if(t==="gap"||t==="particle"){
    if(typeof x.jp!=="string"||!/＿|_/.test(x.jp)||!Array.isArray(x.options)||x.options.length<2)return null;
    const a=+x.answer;if(!(a>=0&&a<x.options.length))return null;
    const right=x.options[a];const o=shuffle(x.options.map(String));x.options=o;x.answer=o.indexOf(String(right));
    x.jp=x.jp.replace(/_{2,}|＿+/,"＿＿");return x;
  }
  if(t==="order"){
    if(!Array.isArray(x.tiles)||x.tiles.length<2)return null;
    x.tiles=x.tiles.map(String);x.extra=Array.isArray(x.extra)?x.extra.map(String).filter(e=>!x.tiles.some(tl=>sameJP(tl,e))).slice(0,2):[];
    if(!x.full)x.full=x.tiles.join("");return x;
  }
  if(t==="meaning"||t==="listen"){
    if(typeof x.jp!=="string"||!Array.isArray(x.options)||x.options.length<2)return null;
    const a=+x.answer;if(!(a>=0&&a<x.options.length))return null;
    const right=x.options[a];const o=shuffle(x.options.map(String));x.options=o;x.answer=o.indexOf(String(right));return x;
  }
  if(t==="speak"){if(!x.full||!x.es)return null;if(!x.kana)x.kana=plain(x.full);return x}
  return null;
}
/* ---------- exercise bank: every sentence exercise Gemini makes is kept, plus a built-in set,
   so sentence practice keeps going with no AI (out of quota, no key, offline) ---------- */
let BASE=null;
function loadBase(){if(BASE)return Promise.resolve(BASE);return fetch("ejercicios-base.json").then(r=>r.json()).then(a=>BASE=a).catch(()=>BASE=[])}
loadBase();
const clone=o=>JSON.parse(JSON.stringify(o));
function bankAdd(items,seen){
  const b=LS.get("pxbank")||[];const have=new Set(b.map(x=>plain(x.it.full||x.it.jp||"")));
  items.forEach(it=>{const k=plain(it.full||it.jp||"");if(!k||have.has(k))return;have.add(k);const c=clone(it);delete c.retry;b.push({it:c,t:seen?now():0})});
  LS.set("pxbank",b.slice(-400));
}
function linkWords(it){
  const txt=plain([it.full,it.jp,...(it.tiles||[])].join(" "));
  const ids=new Set(it.words||[]);words.forEach(w=>{if(!w.basic&&w.jp&&txt.includes(w.jp))ids.add(w.id)});
  it.words=[...ids];return it;
}
function fromBank(n){
  const types=typesFor(PX.mode),b=LS.get("pxbank")||[],recent=new Set(PX.recent.slice(-30));
  const pool=b.map(x=>({src:x,it:x.it})).concat((BASE||[]).map(it=>({src:null,it})));
  const prio=new Set(focusWords(10).filter(w=>!w.basic).map(w=>w.jp));
  const cand=pool.filter(({it})=>{let t=it.type;if(t==="meaning"&&types.includes("listen")&&!types.includes("meaning"))t="listen";return types.includes(t)||(t==="meaning"&&types.includes("listen"))})
    .filter(({it})=>!recent.has(plain(it.full||it.jp||"").slice(0,40)))
    .map(x=>{const txt=plain(x.it.full||x.it.jp||"");let sc=Math.random()*10;words.forEach(w=>{if(!w.basic&&txt.includes(w.jp))sc+=prio.has(w.jp)?12:5});if(x.src)sc+=x.src.t?(now()-x.src.t<36e5?-10:0):8;return [sc,x]})
    .sort((a,b)=>b[0]-a[0]).slice(0,n).map(([,x])=>x);
  const out=[];
  cand.forEach(({src,it})=>{let c=clone(it);delete c.words;
    if(c.type==="meaning"&&(PX.mode==="listen"||(PX.mode==="mix"&&Math.random()<.4)))c.type="listen";
    c=validate(c);if(c){linkWords(c);out.push(c);if(src)src.t=now()}});
  if(out.length)LS.set("pxbank",b);
  return out;
}
async function offlineFill(e){
  await loadBase();
  const banked=fromBank(6);
  if(PX.active&&!PX.warned){PX.warned=true;toast(banked.length?"Gemini descansa: sigo con frases guardadas y tus palabras, sin gastar nada.":(e&&e.code?aiErr(e)+" Sigo con ejercicios de palabras.":"Sigo con ejercicios de palabras."))}
  banked.forEach((it,k)=>{PX.queue.push(it);if(PX.mode==="mix"&&k%2===1){const l=localItem();if(l)PX.queue.push(l)}});
  if(banked.length<3)for(let k=0;k<6;k++){const l=localItem();if(l)PX.queue.push(l)}
}
const aiResting=()=>!settings.key||!navigator.onLine||(PX.aiDown&&now()-PX.lastAICheck<60000)||!!(settings.models&&settings.models.length&&typeof modelReady==="function"&&settings.models.every(m=>!modelReady(m)));
async function fetchBatch(){
  if(PX.busy||PX.mode==="words")return;
  if(aiResting()){PX.busy=true;try{await offlineFill(null)}finally{PX.busy=false}if(PX.active&&PX.state==="loading")next();return}
  PX.busy=true;PX.lastAICheck=now();
  try{
    const items=await aiItems(typesFor(PX.mode),5,true);
    PX.aiDown=false;
    items.forEach((it,k)=>{
      PX.queue.push(it);
      if(PX.mode==="mix"&&k%3===2){const l=localItem();if(l)PX.queue.push(l)}
      if(PX.mode==="listen"&&k%3===1){const l=localItem("wordlisten");if(l)PX.queue.push(l)}
    });
  }catch(e){
    PX.aiDown=true;
    await offlineFill(e);
  }finally{PX.busy=false}
  if(PX.active&&PX.state==="loading")next();
}
async function aiItems(types,n,seen){
  const mine=[...words].filter(w=>!w.basic).sort((a,b)=>priority(b)-priority(a)).slice(0,70);
  const focus=focusWords(8).filter(w=>!w.basic);
  const prompt=`${LEARNER}
${FURI_RULE}
Crea ${n} ejercicios cortos y variados de japonés para practicar ANTES de conversar, como en una app tipo Duolingo. Tipos a usar (repártelos): ${types.join(", ")}.
Vocabulario del alumno (id=palabra (significado)): ${mine.map(w=>w.id+"="+w.jp+" ("+w.es+")").join(", ")||"(aún ninguno: usa palabras muy básicas y frecuentes)"}.
Palabras PRIORITARIAS (falladas recientemente o nuevas): ${focus.map(w=>w.id+"="+w.jp).join(", ")||"(ninguna)"}.
Gramática que conoce: partículas は が を に で へ と の も か ね よ, です/じゃないです, verbos en 〜ます/〜ません/〜ました/〜ましょう/〜たいです, interrogativos (なに どこ いつ だれ どう いくら), これ/それ/あれ, ここ/そこ/あそこ.
Reglas:
- Frases cortas (3 a 8 palabras), naturales, estilo です/ます, útiles en una conversación real. Situaciones variadas.
- Usa sobre todo su vocabulario y la gramática que conoce; como mucho 1 palabra nueva por frase. Que cada ejercicio practique al menos una palabra PRIORITARIA si es posible, y pon los ids de las palabras del alumno que aparecen en "words".
- No repitas ninguna de estas frases recientes: ${PX.recent.slice(-15).join(" / ")||"(ninguna)"}.
- Las opciones incorrectas deben ser plausibles pero claramente incorrectas en esa frase (una sola respuesta correcta).
- explain: 1 frase breve en español que ayude a entender la respuesta (gramática, partícula o matiz).
Formatos:
gap: {"type":"gap","jp":"frase con ＿＿ en lugar de UNA palabra","options":["4 opciones en japonés"],"answer":0,"full":"frase completa","es":"traducción","explain":"","words":[]}
particle: igual que gap, pero el hueco es una partícula y las 4 opciones son partículas.
order: {"type":"order","es":"frase en español","tiles":["trozos de la frase japonesa EN EL ORDEN CORRECTO: 3 a 6 trozos, cada uno una palabra o palabra+partícula"],"extra":["1 o 2 trozos que sobran"],"full":"frase completa","explain":"","words":[]}
meaning: {"type":"meaning","jp":"frase","options":["4 traducciones al español"],"answer":0,"explain":"","words":[]}
listen: igual que meaning (el alumno solo la oirá, sin ver el texto).
speak: {"type":"speak","es":"frase en español","full":"frase japonesa que debe decir","kana":"la misma frase toda en hiragana/katakana","explain":"","words":[]}
Devuelve SOLO JSON: {"items":[...]}`;
  const r=await ask(prompt,false,null,{max:2200,fast:true});
  const items=(r.items||[]).map(validate).filter(Boolean);
  if(!items.length)throw{code:"invalid_json"};
  bankAdd(items,seen);
  return items;
}
/* while you look at the Practice home, quietly prepare a few personalised exercises so the next session starts with them */
let prefetching=false;
async function prefetch(){
  if(prefetching||PX.active||aiResting())return;
  const b=LS.get("pxbank")||[],fresh=b.filter(x=>!x.t).length,last=LS.get("pxpre")||0;
  if(fresh>=8||now()-last<20*6e4)return;
  prefetching=true;LS.set("pxpre",now());
  try{await aiItems(typesFor("mix"),6,false)}catch(e){}finally{prefetching=false}
}
function ensureAhead(){
  if(PX.mode==="review")return;
  if(PX.mode==="verbs"){while(PX.queue.length-PX.i<4){const it=verbItem();if(!it)break;PX.queue.push(it)}return}
  if(PX.mode==="words"){while(PX.queue.length-PX.i<4){const l=localItem();if(!l)break;PX.queue.push(l)}return}
  if(PX.queue.length-PX.i<4)fetchBatch();
}

/* ---------- flow ---------- */
function reviewQueue(){
  return dueWords().sort((a,b)=>priority(b)-priority(a)).slice(0,20).map(w=>localItem((w.reps||0)<2?"word":pick(["reverse","wordlisten","word","reverse"]),w)).filter(Boolean);
}
function start(mode){
  stopSpeaking();PX.mode=mode;PX.active=true;PX.queue=[];PX.i=0;PX.cur=null;PX.combo=0;PX.warned=false;
  PX.round={n:0,good:0,words:new Set()};
  if(mode==="verbs"){if(!DICT.ready){PX.state="loading";render();loadDict().then(()=>{if(PX.active&&PX.mode==="verbs"){ensureAhead();next()}});return}sfx("flip");ensureAhead();return next()}
  if(mode==="review"){PX.queue=reviewQueue();PX.total=PX.queue.length;if(!PX.total){PX.active=false;toast("No tienes nada pendiente de repasar.");return render()}sfx("flip");return next()}
  if(mode==="words"){for(let k=0;k<2;k++){const l=localItem();if(l)PX.queue.push(l)}sfx("flip");ensureAhead();return next()}
  // sentence modes: start at once with saved/built-in exercises and let Gemini prepare more in the background
  sfx("flip");
  const go=()=>{if(!PX.active||PX.mode!==mode)return;
    const first=fromBank(mode==="mix"?3:4);
    first.forEach((it,k)=>{PX.queue.push(it);if(mode==="mix"&&k===0){const l=localItem();if(l)PX.queue.push(l)}});
    if(!PX.queue.length)for(let k=0;k<3;k++){const l=localItem();if(l)PX.queue.push(l)}
    fetchBatch();next()};
  if(BASE)go();else{PX.state="loading";render();loadBase().then(go)}
}
function stop(){PX.active=false;stopListen&&stopListen(true);stopSpeaking();renderPractice()}
function next(){
  stopSpeaking();
  if(PX.mode==="review"){if(PX.i>=PX.queue.length){PX.state="round";return render()}}
  else if(PX.round.n>=ROUND){PX.state="round";return render()}
  ensureAhead();
  if(PX.i>=PX.queue.length){PX.state="loading";return render()}
  PX.cur=PX.queue[PX.i++];PX.fresh=true;PX.showHint=false;PX.typed="";PX.sel=null;PX.built=[];PX.spoken="";PX.speakScore=0;PX.state="ask";
  const c=PX.cur;
  if(c.type==="order")PX.bank=shuffle([...c.tiles.map((s,k)=>({s,k,used:false})),...(c.extra||[]).map((s,k)=>({s,k:100+k,used:false}))]);
  if(c.type==="match")PX.match={left:shuffle(c.pairs),right:shuffle(c.pairs),picked:null,done:new Set(),bad:new Set(),miss:0};
  PX.justAdded=false;render();
  if(c.type==="listen")setTimeout(()=>speak(c.jp),350);
  if(c.type==="wordlisten")setTimeout(()=>speak(c.w.kana||c.w.jp),350);
}
function canCheck(){const c=PX.cur;if(!c)return false;
  if(c.type==="verb"&&c.vmode==="type"){const i=$("#pxType");return !!(i&&i.value.trim())}
  if(c.type==="order")return PX.built.length>0;
  if(c.type==="speak")return !!PX.spoken;
  if(c.type==="match")return false;
  return PX.sel!==null}
function check(forceOk){
  const c=PX.cur;if(!c||PX.state!=="ask")return;
  let ok=false;
  if(["gap","particle","meaning","listen","word","reverse","wordlisten","verbid"].includes(c.type))ok=PX.sel===c.answer;
  else if(c.type==="verb"){if(c.vmode==="type"){const i=$("#pxType");let t=i?i.value:"";t=t.replace(/n$/,"ん");PX.typed=t;ok=normJP(t)===normJP(c.ans.kana)||normJP(t)===normJP(c.ans.jp)}else ok=PX.sel===c.answer}
  else if(c.type==="order"){const got=PX.built.map(b=>plain(b.s)).join("");ok=normJP(got)===normJP(c.tiles.map(plain).join(""))||normJP(got)===normJP(plain(c.full))}
  else if(c.type==="speak"){PX.speakScore=Math.max(sim(PX.spoken,plain(c.full)),sim(PX.spoken,c.kana||""));ok=forceOk||PX.speakScore>=.8}
  else if(c.type==="match")ok=PX.match.miss<=1;
  finish(ok);
}
function finish(ok){
  const c=PX.cur;PX.state=ok?"right":"wrong";
  const st=pstat();st.done++;PX.round.n++;
  if(ok){st.good++;PX.round.good++;PX.combo++;st.xp+=10+(PX.combo>=5?5:0);if(PX.combo>st.best)st.best=PX.combo}
  else{PX.combo=0;const again={...c,retry:true};PX.queue.splice(Math.min(PX.queue.length,PX.i+3),0,again)}
  // spaced repetition: match items judge each word separately
  if(c.type==="match"){c.pairs.forEach(p=>{if(p.basic)return;const w=words.find(x=>x.id===p.id);if(w){convUsage(w,PX.match.bad.has(p.id)?"wrong":"good");PX.round.words.add(w.jp)}})}
  else (c.words||[]).forEach(id=>{const w=words.find(x=>x.id===id);if(w){convUsage(w,ok?"good":"wrong");PX.round.words.add(w.jp)}});
  if(c.type==="verb"||c.type==="verbid"){const st=vstat(c.lvl);st.n++;if(ok)st.good++}
  if(c.jp||c.full)PX.recent.push(plain(c.full||c.jp).slice(0,40));
  bumpActivity();updateBadge();saveSettings();
  sfx(ok?"perfect":"wrong");
  catEl(ok?"happy":"oops");setTimeout(()=>{if(pxCat&&PX.state!=="loading"&&PX.state!=="round")catEl("")},1600);
  if(ok&&PX.combo>0&&PX.combo%5===0){confetti();toast(`¡${PX.combo} seguidas!`)}
  render();
  const say=c.ans?c.ans.kana:c.full||c.jp||(c.w&&(c.w.kana||c.w.jp));
  if(say&&c.type!=="match")setTimeout(()=>speak(String(say).replace("＿＿","")),250);
}

/* ---------- rendering ---------- */
const ESC_KEYS="1234";
function optList(c,label){
  return `<div class="pxopts">${c.options.map((o,k)=>{
    const st=PX.state==="ask"?(PX.sel===k?"sel":""):(k===c.answer?"good":PX.sel===k?"bad":"dim");
    return `<button class="pxopt ${st}" data-pxopt="${k}" ${PX.state!=="ask"?"disabled":""}><span class="kk">${k+1}</span><span class="tx">${label(o)}</span></button>`}).join("")}</div>`;
}
function body(c){
  const fj=s=>`<span class="jp">${furi(s)}</span>`;
  if(c.type==="verb"){
    const F=V().FORMS[c.form],head=`<div class="vq"><div class="vdict jp">${rubyHTML(V().norm(c.v).jp,V().norm(c.v).kana)}<button class="mini" data-pxsay="verb">${SVG.play}</button></div><div class="vmean">${esc(String(c.v.es||"").split(";")[0])}</div>
      <div class="varrow">↓</div><div class="vform"><b class="jp">${esc(F.label)}</b><small>${esc(F.name)} · «${esc(F.es)}»</small></div></div>`;
    if(c.vmode==="type")return head+`<div class="vtype"><input class="field jp" id="pxType" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Escribe en romaji…" ${PX.state!=="ask"?"disabled":""} value="${esc(PX.typed||"")}"></div>`;
    return head+optList(c,o=>`<span class="jp">${rubyHTML(o.jp,o.kana)}</span>`);
  }
  if(c.type==="verbid"){
    return `<div class="vq"><div class="vdict jp big">${rubyHTML(c.ans.jp,c.ans.kana)}<button class="mini" data-pxsay="verb">${SVG.play}</button></div><div class="vmean">de <span class="jp">${rubyHTML(V().norm(c.v).jp,V().norm(c.v).kana)}</span> · ${esc(String(c.v.es||"").split(";")[0])}</div></div>`+
      optList(c,f=>`<b class="jp">${esc(V().FORMS[f].label)}</b><small>${esc(V().FORMS[f].name)}</small>`);
  }
  if(c.type==="gap"||c.type==="particle"){
    const fill=PX.sel!==null?`<span class="gapbox on">${furi(c.options[PX.sel])}</span>`:`<span class="gapbox"> </span>`;
    return `<div class="pxsent jp">${furi(c.jp).replace("＿＿",fill)}</div>${c.es?`<div class="pxes">${esc(c.es)}</div>`:""}${optList(c,fj)}`;
  }
  if(c.type==="order"){
    const built=PX.built.map((b,k)=>`<button class="tile ${k===PX.built.length-1&&PX.justAdded?"new":""}" data-pxbuilt="${k}" ${PX.state!=="ask"?"disabled":""}>${furi(b.s)}</button>`).join("");
    const bank=PX.bank.map((b,k)=>`<button class="tile ${b.used?"ghost":""}" data-pxbank="${k}" ${b.used||PX.state!=="ask"?"disabled":""}>${furi(b.s)}</button>`).join("");
    return `<div class="pxes big">${esc(c.es)}</div><div class="buildline jp">${built||'<span class="ph">Toca las piezas en orden</span>'}</div><div class="bank jp">${bank}</div>`;
  }
  if(c.type==="meaning")return `<div class="pxsent jp">${furi(c.jp)} <button class="mini" data-pxsay="sent">${SVG.play}</button></div>${optList(c,esc)}`;
  if(c.type==="listen")return `<div class="pxlisten"><button class="bigplay" data-pxsay="sent" aria-label="Escuchar">${SVG.play}</button><button class="mini" data-pxsay="slow">${SVG.slow}Despacio</button></div>
    ${PX.state!=="ask"?`<div class="pxsent jp">${furi(c.jp)}</div>`:""}${optList(c,esc)}`;
  if(c.type==="speak"){
    const res=PX.spoken?`<div class="pxheard jp">«${esc(PX.spoken)}»</div>`:"";
    return `<div class="pxes big">${esc(c.es)}</div>
      <div class="pxhint ${PX.showHint||PX.state!=="ask"?"":"blur"}"><span class="jp">${furi(c.full)}</span></div>
      ${PX.state==="ask"?`<div class="row" style="justify-content:center;gap:10px"><button class="micbtn" id="pxMic" aria-label="Decirlo">${SVG.mic}</button></div>
      <div class="row" style="justify-content:center"><button class="mini" data-pxhint="1">${PX.showHint?"Ocultar":"Ver la frase"}</button><button class="mini" data-pxsay="sent">${SVG.play}Escuchar</button><button class="mini" data-pxskip="1">Ahora no puedo hablar</button></div>`:""}${res}`;
  }
  if(c.type==="word")return `<div class="pxword jp">${rubyHTML(c.w.jp,c.w.kana)} <button class="mini" data-pxsay="word">${SVG.play}</button></div>${optList(c,o=>esc(o.es))}`;
  if(c.type==="reverse")return `<div class="pxes big">${esc(c.w.es)}</div>${optList(c,o=>`<span class="jp">${rubyHTML(o.jp,o.kana)}</span>`)}`;
  if(c.type==="wordlisten")return `<div class="pxlisten"><button class="bigplay" data-pxsay="word" aria-label="Escuchar">${SVG.play}</button></div>${PX.state!=="ask"?`<div class="pxword jp">${rubyHTML(c.w.jp,c.w.kana)}</div>`:""}${optList(c,o=>esc(o.es))}`;
  if(c.type==="match"){const M=PX.match;
    const col=(arr,side)=>arr.map(p=>{const done=M.done.has(p.id||p.jp);const picked=M.picked&&M.picked.side===side&&M.picked.p===p;
      return `<button class="mt ${done?"done":""} ${picked?"sel":""}" data-pxm="${side}|${esc(p.id||p.jp)}" ${done?"disabled":""}>${side==="l"?`<span class="jp">${rubyHTML(p.jp,p.kana)}</span>`:esc(p.es)}</button>`}).join("");
    return `<div class="matchgrid"><div class="mcol">${col(M.left,"l")}</div><div class="mcol">${col(M.right,"r")}</div></div>`;}
  return "";
}
function footer(c){
  if(PX.state==="ask"){
    if(c.type==="match")return `<div class="pxfoot"><span class="pxtip">Toca una palabra y su significado</span></div>`;
    return `<div class="pxfoot"><button class="btn primary pxcheck" id="pxCheck" ${canCheck()?"":"disabled"}>Comprobar</button></div>`;
  }
  const ok=PX.state==="right";
  const sol=c.type==="verb"?"":c.type==="verbid"?"":c.type==="order"||c.type==="speak"?c.full:(c.type==="gap"||c.type==="particle")?c.full:(c.type==="meaning"||c.type==="listen")?c.options[c.answer]:c.type==="reverse"?c.w.jp:c.type==="match"?"":c.w?c.w.es:"";
  const isJP=["order","speak","gap","particle","reverse"].includes(c.type);
  return `<div class="pxfoot res ${ok?"ok":"ko"}">
    <div class="restop"><span class="resic">${ok?SVG.check:SVG.x}</span><b>${ok?pick(["¡Correcto!","¡Muy bien!","¡Eso es!","すごい！","完璧！"]):"Respuesta correcta:"}</b></div>
    ${!ok&&sol?`<div class="ressol ${isJP?"jp":""}">${isJP?furi(sol):esc(sol)}</div>`:""}
    ${c.type==="verb"?`<div class="ressol jp">${rubyHTML(c.ans.jp,c.ans.kana)}${!ok&&c.vmode==="type"&&PX.typed?` <small class="typed">escribiste «${esc(PX.typed)}»</small>`:""}</div><div class="resexp">${esc(V().explain(c.v,c.form))}</div>`:""}
    ${c.type==="verbid"?`<div class="ressol"><b class="jp">${esc(V().FORMS[c.form].label)}</b> · ${esc(V().FORMS[c.form].name)}</div><div class="resexp">${esc(V().explain(c.v,c.form))}</div>`:""}
    ${c.type==="speak"&&PX.spoken?`<div class="resexp">Te he entendido: «${esc(PX.spoken)}» (${Math.round(PX.speakScore*100)}% parecido)${!ok?` <button class="mini" data-pxforce="1">Lo he dicho bien</button>`:""}</div>`:""}
    ${c.explain?`<div class="resexp">${furi(c.explain)}</div>`:""}
    ${c.es&&c.type!=="order"&&c.type!=="speak"&&(c.type==="gap"||c.type==="particle")?`<div class="resexp">${esc(c.es)}</div>`:""}
    <button class="btn pxnext" id="pxNext">Continuar</button></div>`;
}
function render(){
  const pane=$("#practicePane");if(!pane)return;
  if(!PX.active)return renderHome();
  const st=pstat(),pct=PX.mode==="review"?Math.min(100,PX.i/Math.max(1,PX.queue.length)*100):Math.min(100,PX.round.n/ROUND*100);
  const top=`<div class="pxtop"><button class="iconbtn" id="pxClose" aria-label="Salir">${SVG.x}</button><div class="progress" style="flex:1"><i style="width:${pct}%"></i></div>
    <span class="pxcombo ${PX.combo>=3?"hot":""}" title="Aciertos seguidos"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2s5 4.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 1-3.5S9 11 10.5 11C10.5 6.5 12 2 12 2z"/></svg>${PX.combo}</span></div>`;
  if(PX.state==="loading"){
    pane.innerHTML=`${top}<div class="pxload"><div class="pxcatbig" id="pxCat"></div><b>Tama está preparando ejercicios con tus palabras…</b></div>`;placeCat("think");return}
  if(PX.state==="round"){
    const acc=Math.round(PX.round.good/Math.max(1,PX.round.n)*100);
    pane.innerHTML=`${top}<div class="pxload"><div class="pxcatbig" id="pxCat"></div>
      <h2 class="h2">${PX.mode==="review"?"¡Repaso completado!":"¡Ronda completada!"}</h2>
      <div class="stats" style="width:100%"><div class="stat"><b>${PX.round.good}/${PX.round.n}</b><span>aciertos</span></div><div class="stat"><b>${acc}%</b><span>precisión</span></div><div class="stat"><b>${st.xp}</b><span>XP hoy</span></div></div>
      ${PX.mode==="verbs"?(()=>{const S=vset(),st=vstat(S.level),acc=st.n?st.good/st.n:0;return st.good>=15&&acc>=.85&&S.level<V().LEVELS.length?`<div class="pxreview"><div><b>¡Dominas «${V().LEVELS[S.level-1].title}»!</b><small>Siguiente: ${V().LEVELS[S.level].title} · <span class="jp">${V().LEVELS[S.level].ex}</span></small></div><button class="btn primary" data-vlevel="${S.level+1}" data-vgo="1">Subir de nivel</button></div>`:""})():""}
      ${PX.round.words.size?`<p style="margin:0;color:var(--muted);font-size:16px">Has practicado: <span class="jp">${[...PX.round.words].slice(0,12).map(esc).join("、")}</span></p>`:""}
      <div class="row" style="justify-content:center">${PX.mode==="review"?(dueWords().length?`<button class="btn primary" data-pxmode="review">Repasar ${dueWords().length} más</button>`:`<button class="btn primary" data-pxmode="mix">Seguir practicando</button>`):`<button class="btn ${PX.mode==="verbs"&&(()=>{const S=vset(),st=vstat(S.level);return st.good>=15&&st.good/st.n>=.85&&S.level<V().LEVELS.length})()?"":"primary"}" id="pxMore">Otra ronda</button>`}<button class="btn" data-tabgo="chat">Usarlas hablando con Tama</button><button class="btn ghost" id="pxClose2">Terminar</button></div></div>`;
    if(acc>=80){sfx("done");confetti()}
    placeCat("happy");PX.round={n:0,good:0,words:new Set()};return}
  const c=PX.cur;
  pane.innerHTML=`${top}
    <div class="pxcard ${PX.state} ${PX.fresh?"enter":""}"><div class="pxhead"><div class="pxcat" id="pxCat"></div>
      <div><div class="pxlabel">${TITLES[c.type]||""}</div>${c.retry?`<div class="pxretry">Otra vez, ¡tú puedes!</div>`:""}</div></div>
      ${body(c)}</div>
    ${footer(c)}`;
  PX.fresh=false;
  placeCat(PX.state==="ask"?"":undefined);
  const ti=$("#pxType");
  if(ti&&PX.state==="ask"){try{wanakana.bind(ti,{IMEMode:true})}catch(e){}ti.addEventListener("input",()=>{const b=$("#pxCheck");if(b)b.disabled=!canCheck()});
    ti.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.isComposing){e.preventDefault();e.stopPropagation();if(canCheck())check()}});setTimeout(()=>ti.focus({preventScroll:true}),50)}
}
function renderHome(){
  const st=pstat(),pane=$("#practicePane");
  const {mine}=pool();
  pane.innerHTML=`<div class="pxhome">
    <div class="pxcatbig" id="pxCat"></div>
    <div class="hrow" style="justify-content:center"><h2 class="h2" style="font-size:26px;flex:none">練習 · Practicar</h2>${INFO}</div>
    <p class="info" style="margin:0;color:var(--muted);text-align:center;max-width:42ch">Ejercicios cortos con tus palabras para soltarte antes de conversar. Nunca se acaban: los que fallas vuelven, y las palabras flojas salen más.</p>
    <div class="stats" style="width:100%"><div class="stat"><b>${st.done}</b><span>ejercicios hoy</span></div><div class="stat"><b>${st.xp}</b><span>XP hoy</span></div><div class="stat"><b>${st.best}</b><span>mejor racha</span></div></div>
    ${(()=>{const n=dueWords().length;return `<div class="pxreview ${n?"":"done"}"><div><b>${n?`Repaso de hoy · ${n} palabra${n>1?"s":""}`:"Repaso de hoy al día"}</b><small class="info">${n?"Las que tocan según tu memoria: primero las que fallas.":"Vuelve más tarde: Tama te avisará con el número rojo."}</small></div>${n?`<button class="btn primary" data-pxmode="review">Repasar</button>`:`<span class="pxok">${SVG.check}</span>`}</div>`})()}
    ${(()=>{const S=vset(),L=V()?V().LEVELS:[],l=L[S.level-1];if(!l)return"";const st=vstat(S.level);return `<div class="pxverbs"><div class="pvl"><span class="vn">${l.n}</span><div><b>Verbos · ${l.title}</b><small>${l.sub} · <span class="jp">${l.ex}</span></small><span class="vbar"><i style="width:${Math.min(100,st.good/15*100)}%"></i></span></div></div>
      <div class="row" style="gap:8px;flex-wrap:nowrap"><button class="btn ghost" id="pxLevels">Nivel</button><button class="btn primary" data-pxmode="verbs">Practicar verbos</button></div></div>`})()}
    <div class="pxmodes">${MODES.map(([k,n,d])=>`<button class="pxmode" data-pxmode="${k}"><b>${n}</b><small>${d}</small></button>`).join("")}</div>
    ${!mine.length?`<div class="notice">Aún no tienes palabras propias: practicarás con lo básico. Añade palabras en <b>Vocabulario</b> y los ejercicios girarán en torno a ellas.</div>`:""}
    ${!settings.key?`<div class="notice">Sin clave de Gemini practicas con las frases que trae la app, tus palabras y los verbos.</div>`:""}
  </div>`;
  placeCat("");
  setTimeout(prefetch,1500);
}
function selectOpt(k){
  const c=PX.cur;PX.sel=k;sfx("tap");
  document.querySelectorAll("#practicePane .pxopt").forEach((b,i)=>b.classList.toggle("sel",i===k));
  const g=document.querySelector("#practicePane .gapbox");if(g&&(c.type==="gap"||c.type==="particle")){g.className="gapbox on";g.innerHTML=furi(c.options[k])}
  if(c.type==="reverse")speak(c.options[k].kana||c.options[k].jp);
  if(c.type==="verb")speak(c.options[k].kana);
  const b=$("#pxCheck");if(b)b.disabled=!canCheck();
}
function renderOrder(){
  const bl=document.querySelector("#practicePane .buildline"),bk=document.querySelector("#practicePane .bank");if(!bl||!bk)return render();
  bl.innerHTML=PX.built.map((b,k)=>`<button class="tile ${k===PX.built.length-1&&PX.justAdded?"new":""}" data-pxbuilt="${k}">${furi(b.s)}</button>`).join("")||'<span class="ph">Toca las piezas en orden</span>';
  bk.innerHTML=PX.bank.map((b,k)=>`<button class="tile ${b.used?"ghost":""}" data-pxbank="${k}" ${b.used?"disabled":""}>${furi(b.s)}</button>`).join("");
  const c=$("#pxCheck");if(c)c.disabled=!canCheck();
}
function renderMatch(){const g=document.querySelector("#practicePane .matchgrid");if(!g)return render();const tmp=document.createElement("div");tmp.innerHTML=body(PX.cur);g.replaceWith(tmp.firstElementChild)}
window.renderPractice=function(){render()};
window._px=()=>PX;
window.practiceLeave=function(){if(PX.active){stopListen&&stopListen(true);stopSpeaking()}};

/* ---------- interaction ---------- */
function speakNow(){
  if(PX.state!=="ask")return;
  stopSpeaking();PX.spoken="";const b=$("#pxMic");if(!b)return;
  b.className="micbtn on listening";b.innerHTML=SVG.wave;sfx("listen");
  listen({mode:"auto",onUpdate:t=>{PX.spoken=t;const h=document.querySelector(".pxheard");if(h)h.textContent="«"+t+"»";else render()},
    onDone:t=>{PX.spoken=t;if(t)check();else{render();toast("No te he oído. Toca el micro y habla.")}},
    onError:e=>{toast(micErrorMsg(e));settings.pracSpeak=false;saveSettings();render()}});
}
document.addEventListener("click",e=>{
  const el=e.target.closest("button");if(!el||!(el.closest("#practicePane")||el.dataset.vlevel||el.dataset.vopt))return;
  const d=el.dataset;
  if(d.pxmode)return start(d.pxmode);
  if(el.id==="pxClose"||el.id==="pxClose2")return stop();
  if(el.id==="pxMore"){sfx("flip");return next()}
  if(el.id==="pxCheck")return check();
  if(el.id==="pxNext")return next();
  if(d.pxforce){const c=PX.cur;PX.state="ask";PX.round.n--;const st=pstat();st.done--;
    PX.queue.splice(PX.queue.findIndex((q,k)=>k>=PX.i&&q.retry&&q.full===c.full),1);return finish(true)}
  if(d.pxopt!==undefined&&PX.state==="ask")return selectOpt(+d.pxopt);
  if(d.pxbank!==undefined&&PX.state==="ask"){const b=PX.bank[+d.pxbank];if(b.used)return;b.used=true;PX.built.push(b);PX.justAdded=true;sfx("tap");speak(b.s,1.05);return renderOrder()}
  if(d.pxbuilt!==undefined&&PX.state==="ask"){PX.justAdded=false;const b=PX.built.splice(+d.pxbuilt,1)[0];b.used=false;sfx("flip");return renderOrder()}
  if(d.pxsay){const c=PX.cur;if(!c)return;
    if(d.pxsay==="word")return speak(c.w.kana||c.w.jp);
    if(d.pxsay==="verb")return speak(c.type==="verbid"?c.ans.kana:V().norm(c.v).kana);
    const t=String(c.full||c.jp||"").replace("＿＿","");return speak(t,d.pxsay==="slow"?Math.max(.5,settings.rate-.3):null)}
  if(d.pxhint){PX.showHint=!PX.showHint;const h=document.querySelector(".pxhint");if(h)h.classList.toggle("blur",!PX.showHint);el.textContent=PX.showHint?"Ocultar":"Ver la frase";return}
  if(el.id==="pxLevels")return levelSheet();
  if(d.vlevel){const S=vset();S.level=+d.vlevel;saveSettings();sfx("add");closeSheet();if(d.vgo||PX.mode==="verbs"&&PX.active){PX.queue=PX.queue.slice(0,PX.i);return start("verbs")}return render()}
  if(d.vopt){const S=vset();S[d.vopt]=!S[d.vopt];el.setAttribute("aria-checked",S[d.vopt]);saveSettings();sfx("tap");if(PX.mode==="verbs"&&PX.active)PX.queue=PX.queue.slice(0,PX.i);return}
  if(d.pxskip){settings.pracSpeak=false;saveSettings();toast("Vale, quito los ejercicios de hablar por ahora.");PX.queue=PX.queue.filter((q,k)=>k<PX.i||q.type!=="speak");return next()}
  if(el.id==="pxMic")return speakNow();
  if(d.pxm){const M=PX.match,[side,id]=d.pxm.split("|");const p=PX.cur.pairs.find(x=>(x.id||x.jp)===id);
    if(side==="l")speak(p.kana||p.jp);
    if(!M.picked||M.picked.side===side){M.picked={side,p};sfx("tap");return renderMatch()}
    const other=M.picked.p;M.picked=null;
    if(other===p){M.done.add(id);sfx("receive");renderMatch();if(M.done.size===PX.cur.pairs.length)setTimeout(()=>check(),300);return}
    M.miss++;M.bad.add(other.id);M.bad.add(p.id);sfx("wrong");
    renderMatch();const btns=document.querySelectorAll(".mt");btns.forEach(b=>{if(b.dataset.pxm.endsWith("|"+id)||b.dataset.pxm.endsWith("|"+(other.id||other.jp))){b.classList.add("shake");setTimeout(()=>b.classList.remove("shake"),450)}});return}
});
document.addEventListener("keydown",e=>{
  if(typeof tab==="undefined"||tab!=="practice"||!PX.active||$("#scrim"))return;
  if(["INPUT","TEXTAREA"].includes(document.activeElement.tagName))return;
  const c=PX.cur;if(!c)return;
  if(PX.state==="ask"&&c.options&&ESC_KEYS.includes(e.key)){const k=+e.key-1;if(k<c.options.length)selectOpt(k);e.preventDefault();return}
  if(e.key==="Enter"){e.preventDefault();if(PX.state==="ask"){if(canCheck())check()}else if(PX.state==="right"||PX.state==="wrong"||PX.state==="round")next()}
});
// keep Practice's Tama reacting to taps like the main one
})();
