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
const TITLES={gap:"Completa la frase",particle:"Elige la partícula",order:"Ordena la frase",meaning:"¿Qué significa?",listen:"Escucha: ¿qué significa?",speak:"Dilo en japonés",
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
function localItem(kind){
  const w=pickTarget();if(!w)return null;
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
async function fetchBatch(){
  if(PX.busy||PX.mode==="words")return;
  if(PX.aiDown&&now()-PX.lastAICheck<60000)return;
  PX.busy=true;PX.lastAICheck=now();
  const types=typesFor(PX.mode);
  const mine=words.filter(w=>!w.basic).slice(0,250);
  const focus=focusWords(8).filter(w=>!w.basic);
  const prompt=`${LEARNER}
${FURI_RULE}
Crea 8 ejercicios cortos y variados de japonés para practicar ANTES de conversar, como en una app tipo Duolingo. Tipos a usar (repártelos): ${types.join(", ")}.
Vocabulario del alumno (id=palabra (significado)): ${mine.map(w=>w.id+"="+w.jp+" ("+w.es+")").join(", ")||"(aún ninguno: usa palabras muy básicas y frecuentes)"}.
Palabras PRIORITARIAS (falladas recientemente o nuevas): ${focus.map(w=>w.id+"="+w.jp).join(", ")||"(ninguna)"}.
Gramática que conoce: partículas は が を に で へ と の も か ね よ, です/じゃないです, verbos en 〜ます/〜ません/〜ました/〜ましょう/〜たいです, interrogativos (なに どこ いつ だれ どう いくら), これ/それ/あれ, ここ/そこ/あそこ.
Reglas:
- Frases cortas (3 a 8 palabras), naturales, estilo です/ます, útiles en una conversación real. Situaciones variadas.
- Usa sobre todo su vocabulario y la gramática que conoce; como mucho 1 palabra nueva por frase. Que cada ejercicio practique al menos una palabra PRIORITARIA si es posible, y pon los ids de las palabras del alumno que aparecen en "words".
- No repitas ninguna de estas frases recientes: ${PX.recent.slice(-25).join(" / ")||"(ninguna)"}.
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
  try{
    const r=await ask(prompt);
    const items=(r.items||[]).map(validate).filter(Boolean);
    if(!items.length)throw{code:"invalid_json"};
    PX.aiDown=false;
    items.forEach((it,k)=>{
      PX.queue.push(it);
      if(PX.mode==="mix"&&k%3===2){const l=localItem();if(l)PX.queue.push(l)}
      if(PX.mode==="listen"&&k%3===1){const l=localItem("wordlisten");if(l)PX.queue.push(l)}
    });
  }catch(e){
    PX.aiDown=true;
    if(PX.active&&!PX.warned){PX.warned=true;toast(e&&e.code?aiErr(e)+" Sigo con ejercicios de palabras.":"Sigo con ejercicios de palabras.")}
    for(let k=0;k<6;k++){const l=localItem();if(l)PX.queue.push(l)}
  }finally{PX.busy=false}
  if(PX.active&&PX.state==="loading")next();
}
function ensureAhead(){
  if(PX.mode==="words"){while(PX.queue.length-PX.i<4){const l=localItem();if(!l)break;PX.queue.push(l)}return}
  if(PX.queue.length-PX.i<4)fetchBatch();
}

/* ---------- flow ---------- */
function start(mode){
  stopSpeaking();PX.mode=mode;PX.active=true;PX.queue=[];PX.i=0;PX.cur=null;PX.combo=0;PX.warned=false;
  PX.round={n:0,good:0,words:new Set()};
  if(mode==="mix"||mode==="words"){for(let k=0;k<2;k++){const l=localItem();if(l)PX.queue.push(l)}}
  sfx("flip");ensureAhead();next();
}
function stop(){PX.active=false;stopListen&&stopListen(true);stopSpeaking();renderPractice()}
function next(){
  stopSpeaking();
  if(PX.round.n>=ROUND){PX.state="round";return render()}
  ensureAhead();
  if(PX.i>=PX.queue.length){PX.state="loading";return render()}
  PX.cur=PX.queue[PX.i++];PX.fresh=true;PX.showHint=false;PX.sel=null;PX.built=[];PX.spoken="";PX.speakScore=0;PX.state="ask";
  const c=PX.cur;
  if(c.type==="order")PX.bank=shuffle([...c.tiles.map((s,k)=>({s,k,used:false})),...(c.extra||[]).map((s,k)=>({s,k:100+k,used:false}))]);
  if(c.type==="match")PX.match={left:shuffle(c.pairs),right:shuffle(c.pairs),picked:null,done:new Set(),bad:new Set(),miss:0};
  PX.justAdded=false;render();
  if(c.type==="listen")setTimeout(()=>speak(plain(c.jp)),350);
  if(c.type==="wordlisten")setTimeout(()=>speak(c.w.jp),350);
}
function canCheck(){const c=PX.cur;if(!c)return false;
  if(c.type==="order")return PX.built.length>0;
  if(c.type==="speak")return !!PX.spoken;
  if(c.type==="match")return false;
  return PX.sel!==null}
function check(forceOk){
  const c=PX.cur;if(!c||PX.state!=="ask")return;
  let ok=false;
  if(["gap","particle","meaning","listen","word","reverse","wordlisten"].includes(c.type))ok=PX.sel===c.answer;
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
  if(c.jp||c.full)PX.recent.push(plain(c.full||c.jp).slice(0,40));
  bumpActivity();updateBadge();saveSettings();
  sfx(ok?"perfect":"wrong");
  catEl(ok?"happy":"oops");setTimeout(()=>{if(pxCat&&PX.state!=="loading"&&PX.state!=="round")catEl("")},1600);
  if(ok&&PX.combo>0&&PX.combo%5===0){confetti();toast(`¡${PX.combo} seguidas!`)}
  render();
  const say=c.full||c.jp||(c.w&&c.w.jp);
  if(say&&c.type!=="match")setTimeout(()=>speak(plain(String(say).replace("＿＿",""))),250);
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
  const sol=c.type==="order"||c.type==="speak"?c.full:(c.type==="gap"||c.type==="particle")?c.full:(c.type==="meaning"||c.type==="listen")?c.options[c.answer]:c.type==="reverse"?c.w.jp:c.type==="match"?"":c.w?c.w.es:"";
  const isJP=["order","speak","gap","particle","reverse"].includes(c.type);
  return `<div class="pxfoot res ${ok?"ok":"ko"}">
    <div class="restop"><span class="resic">${ok?SVG.check:SVG.x}</span><b>${ok?pick(["¡Correcto!","¡Muy bien!","¡Eso es!","すごい！","完璧！"]):"Respuesta correcta:"}</b></div>
    ${!ok&&sol?`<div class="ressol ${isJP?"jp":""}">${isJP?furi(sol):esc(sol)}</div>`:""}
    ${c.type==="speak"&&PX.spoken?`<div class="resexp">Te he entendido: «${esc(PX.spoken)}» (${Math.round(PX.speakScore*100)}% parecido)${!ok?` <button class="mini" data-pxforce="1">Lo he dicho bien</button>`:""}</div>`:""}
    ${c.explain?`<div class="resexp">${furi(c.explain)}</div>`:""}
    ${c.es&&c.type!=="order"&&c.type!=="speak"&&(c.type==="gap"||c.type==="particle")?`<div class="resexp">${esc(c.es)}</div>`:""}
    <button class="btn pxnext" id="pxNext">Continuar</button></div>`;
}
function render(){
  const pane=$("#practicePane");if(!pane)return;
  if(!PX.active)return renderHome();
  const st=pstat(),pct=Math.min(100,PX.round.n/ROUND*100);
  const top=`<div class="pxtop"><button class="iconbtn" id="pxClose" aria-label="Salir">${SVG.x}</button><div class="progress" style="flex:1"><i style="width:${pct}%"></i></div>
    <span class="pxcombo ${PX.combo>=3?"hot":""}" title="Aciertos seguidos"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2s5 4.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 1-3.5S9 11 10.5 11C10.5 6.5 12 2 12 2z"/></svg>${PX.combo}</span></div>`;
  if(PX.state==="loading"){
    pane.innerHTML=`${top}<div class="pxload"><div class="pxcatbig" id="pxCat"></div><b>Tama está preparando ejercicios con tus palabras…</b></div>`;placeCat("think");return}
  if(PX.state==="round"){
    const acc=Math.round(PX.round.good/Math.max(1,PX.round.n)*100);
    pane.innerHTML=`${top}<div class="pxload"><div class="pxcatbig" id="pxCat"></div>
      <h2 class="h2">¡Ronda completada!</h2>
      <div class="stats" style="width:100%"><div class="stat"><b>${PX.round.good}/${PX.round.n}</b><span>aciertos</span></div><div class="stat"><b>${acc}%</b><span>precisión</span></div><div class="stat"><b>${st.xp}</b><span>XP hoy</span></div></div>
      ${PX.round.words.size?`<p style="margin:0;color:var(--muted);font-size:14px">Has practicado: <span class="jp">${[...PX.round.words].slice(0,12).map(esc).join("、")}</span></p>`:""}
      <div class="row" style="justify-content:center"><button class="btn primary" id="pxMore">Otra ronda</button><button class="btn" data-tabgo="chat">Usarlas hablando con Tama</button><button class="btn ghost" id="pxClose2">Terminar</button></div></div>`;
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
}
function renderHome(){
  const st=pstat(),pane=$("#practicePane");
  const {mine}=pool();
  pane.innerHTML=`<div class="pxhome">
    <div class="pxcatbig" id="pxCat"></div>
    <h2 class="h2" style="font-size:24px">練習 · Practicar</h2>
    <p style="margin:0;color:var(--muted);text-align:center;max-width:42ch">Ejercicios cortos con tus palabras para soltarte antes de conversar. Nunca se acaban: los que fallas vuelven, y las palabras flojas salen más.</p>
    <div class="stats" style="width:100%"><div class="stat"><b>${st.done}</b><span>ejercicios hoy</span></div><div class="stat"><b>${st.xp}</b><span>XP hoy</span></div><div class="stat"><b>${st.best}</b><span>mejor racha</span></div></div>
    <div class="pxmodes">${MODES.map(([k,n,d])=>`<button class="pxmode" data-pxmode="${k}"><b>${n}</b><small>${d}</small></button>`).join("")}</div>
    ${!mine.length?`<div class="notice">Aún no tienes palabras propias: practicarás con lo básico. Añade palabras en <b>Vocabulario</b> y los ejercicios girarán en torno a ellas.</div>`:""}
    ${!settings.key?`<div class="notice">Sin clave de Gemini solo funciona el modo <b>Palabras</b>.</div>`:""}
  </div>`;
  placeCat("");
}
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
  const el=e.target.closest("button");if(!el||!el.closest("#practicePane"))return;
  const d=el.dataset;
  if(d.pxmode){if(d.pxmode!=="words"&&!settings.key){showOnboarding();return}return start(d.pxmode)}
  if(el.id==="pxClose"||el.id==="pxClose2")return stop();
  if(el.id==="pxMore"){sfx("flip");return next()}
  if(el.id==="pxCheck")return check();
  if(el.id==="pxNext")return next();
  if(d.pxforce){const c=PX.cur;PX.state="ask";PX.round.n--;const st=pstat();st.done--;
    PX.queue.splice(PX.queue.findIndex((q,k)=>k>=PX.i&&q.retry&&q.full===c.full),1);return finish(true)}
  if(d.pxopt!==undefined&&PX.state==="ask"){PX.sel=+d.pxopt;sfx("tap");
    const c=PX.cur;if(c.type==="reverse")speak(c.options[PX.sel].jp);
    return render()}
  if(d.pxbank!==undefined&&PX.state==="ask"){const b=PX.bank[+d.pxbank];if(b.used)return;b.used=true;PX.built.push(b);PX.justAdded=true;sfx("tap");speak(plain(b.s),1.05);return render()}
  if(d.pxbuilt!==undefined&&PX.state==="ask"){PX.justAdded=false;const b=PX.built.splice(+d.pxbuilt,1)[0];b.used=false;sfx("flip");return render()}
  if(d.pxsay){const c=PX.cur;if(!c)return;
    if(d.pxsay==="word")return speak(c.w.jp);
    const t=plain(c.full||c.jp||"").replace("＿＿","");return speak(t,d.pxsay==="slow"?Math.max(.5,settings.rate-.3):null)}
  if(d.pxhint){PX.showHint=!PX.showHint;return render()}
  if(d.pxskip){settings.pracSpeak=false;saveSettings();toast("Vale, quito los ejercicios de hablar por ahora.");PX.queue=PX.queue.filter((q,k)=>k<PX.i||q.type!=="speak");return next()}
  if(el.id==="pxMic")return speakNow();
  if(d.pxm){const M=PX.match,[side,id]=d.pxm.split("|");const p=PX.cur.pairs.find(x=>(x.id||x.jp)===id);
    if(side==="l")speak(p.jp);
    if(!M.picked||M.picked.side===side){M.picked={side,p};sfx("tap");return render()}
    const other=M.picked.p;M.picked=null;
    if(other===p){M.done.add(id);sfx("receive");if(M.done.size===PX.cur.pairs.length){render();return setTimeout(()=>check(),250)}return render()}
    M.miss++;M.bad.add(other.id);M.bad.add(p.id);sfx("wrong");
    render();const btns=document.querySelectorAll(".mt");btns.forEach(b=>{if(b.dataset.pxm.endsWith("|"+id)||b.dataset.pxm.endsWith("|"+(other.id||other.jp))){b.classList.add("shake");setTimeout(()=>b.classList.remove("shake"),450)}});return}
});
document.addEventListener("keydown",e=>{
  if(typeof tab==="undefined"||tab!=="practice"||!PX.active||$("#scrim"))return;
  if(["INPUT","TEXTAREA"].includes(document.activeElement.tagName))return;
  const c=PX.cur;if(!c)return;
  if(PX.state==="ask"&&c.options&&ESC_KEYS.includes(e.key)){const k=+e.key-1;if(k<c.options.length){PX.sel=k;sfx("tap");render()}e.preventDefault();return}
  if(e.key==="Enter"){e.preventDefault();if(PX.state==="ask"){if(canCheck())check()}else if(PX.state==="right"||PX.state==="wrong"||PX.state==="round")next()}
});
// keep Practice's Tama reacting to taps like the main one
})();
