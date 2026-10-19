/* ¿Wakarú? — progression: lifetime XP and levels, a learning path with real milestones, streak rewards.
   XP comes from practice, conversation, new words and mastered words; the path also asks for real things
   (words you know, verb forms, sentences said), so levelling up means actually progressing. */
(function(){
"use strict";
const P=()=>{if(!settings.prog)settings.prog={xp:0,conv:0,perfect:0,badges:[],stage:0,addDay:"",addN:0,seenLvl:1};return settings.prog};

/* ---- levels ---- */
const need=n=>Math.round(40+45*Math.pow(n,1.4));            // XP from level n to n+1
function lvlInfo(xp){let l=1,base=0;while(xp>=base+need(l)){base+=need(l);l++}return {lvl:l,into:xp-base,need:need(l),pct:Math.min(100,(xp-base)/need(l)*100)}}
function streakDays(){const s=settings.streak||{};const k=dayKey(),y=dayKey(now()-DAY);return s.day===k||s.day===y?s.n||0:0}
function mult(){const d=streakDays();return d>=30?1.5:d>=14?1.3:d>=7?1.2:d>=3?1.1:1}

/* ---- the path: each stage asks for real progress ---- */
const learned=()=>words.filter(w=>!w.basic&&((w.reps||0)>=2||(w.interval||0)>=3)).length;
const mastered=()=>words.filter(w=>!w.basic&&(w.interval||0)>=21).length;
const mine=()=>words.filter(w=>!w.basic).length;
const verbLvl=()=>{const v=settings.verbs;if(!v)return 0;let best=0;Object.entries(v.stats||{}).forEach(([l,s])=>{if(s.good>=15&&s.good/Math.max(1,s.n)>=.8)best=Math.max(best,+l)});return best};
const STAGES=[
 {jp:"はじめまして",t:"Primeros pasos",learn:"Saludar, decir quién eres, です.",req:{lvl:2,words:10,conv:3}},
 {jp:"あいさつ",t:"Saludos y cortesía",learn:"Frases de cada día, partículas は y か.",req:{lvl:3,words:25,conv:10,verbs:1}},
 {jp:"じこしょうかい",t:"Presentarte",learn:"De dónde eres, a qué te dedicas, gustos. Forma ます y ません.",req:{lvl:5,words:45,learned:15,conv:25,verbs:2}},
 {jp:"すうじ",t:"Números y horas",learn:"Contar, precios, horas y días. Pasado ました.",req:{lvl:7,words:70,learned:30,verbs:3}},
 {jp:"まいにち",t:"Tu rutina",learn:"Qué haces cada día. Partículas を に で へ.",req:{lvl:9,words:100,learned:50,conv:60,verbs:4}},
 {jp:"かいもの",t:"De compras",learn:"Pedir, preguntar precios, 〜をください, 〜たいです.",req:{lvl:11,words:140,learned:75,mastered:10,verbs:4}},
 {jp:"すききらい",t:"Gustos y opiniones",learn:"Adjetivos, 好き/嫌い, forma て para pedir.",req:{lvl:13,words:180,learned:100,mastered:25,conv:120,verbs:5}},
 {jp:"りょこう",t:"De viaje",learn:"Transporte, direcciones, 〜ています.",req:{lvl:15,words:240,learned:140,mastered:45,verbs:6}},
 {jp:"N5",t:"Nivel N5 completo",learn:"Todo lo básico del JLPT N5: ない, た, comparaciones.",req:{lvl:18,words:350,learned:220,mastered:80,conv:200,verbs:8}},
 {jp:"ともだち",t:"Hablar con amigos",learn:"Japonés informal, potencial y volitiva.",req:{lvl:21,words:450,learned:300,mastered:130,verbs:10}},
 {jp:"N4",t:"Hacia el N4",learn:"Condicionales, frases más largas y naturales.",req:{lvl:25,words:650,learned:450,mastered:220,conv:400,verbs:11}},
 {jp:"ペラペラ",t:"Conversación fluida",learn:"Pasiva y causativa; hablar de casi todo con soltura.",req:{lvl:30,words:900,learned:650,mastered:350,conv:600,verbs:12}}
];
const REQ_LABEL={lvl:"Nivel",words:"Palabras en tu vocabulario",learned:"Palabras aprendidas",mastered:"Palabras dominadas",conv:"Frases dichas a Tama",verbs:"Nivel de verbos"};
function reqNow(k){const p=P();return k==="lvl"?lvlInfo(p.xp).lvl:k==="words"?mine():k==="learned"?learned():k==="mastered"?mastered():k==="conv"?p.conv||0:k==="verbs"?verbLvl():0}
const stageDone=s=>Object.entries(s.req).every(([k,v])=>reqNow(k)>=v);
function curStage(){let i=0;while(i<STAGES.length&&stageDone(STAGES[i]))i++;return i}   // index of the stage you are on

/* what the learner can handle now: used by the exercise and conversation prompts */
window.learnerStage=function(){
  const i=Math.min(curStage(),STAGES.length-1),v=Math.max(1,verbLvl()+1);
  const G=["partículas は が を に で へ と の も か ね よ, です/じゃないです, interrogativos (なに どこ いつ だれ どう いくら), これ/それ/あれ, ここ/そこ/あそこ"];
  const VF=window.VERBS?window.VERBS.LEVELS.slice(0,Math.min(12,v)).map(l=>l.title).join(", "):"forma ます";
  const len=i<=1?"2 a 5 palabras":i<=4?"3 a 8 palabras":i<=8?"4 a 10 palabras":"5 a 14 palabras";
  return {i,stage:STAGES[i],grammar:`${G[0]}. Verbos: ${VF}${i>=6?". Adjetivos い/な en presente y pasado":""}${i>=9?". Algo de japonés informal":""}`,len,lvl:lvlInfo(P().xp).lvl};
};

/* ---- XP ---- */
let floatT=0;
window.gainXP=function(n,why,opts){
  opts=opts||{};const p=P();const before=lvlInfo(p.xp).lvl,stBefore=curStage();
  const amt=Math.round(n*(opts.noMult?1:mult()));p.xp+=amt;saveSettings();
  floatXP(amt);renderLvl();
  const after=lvlInfo(p.xp).lvl;
  if(after>before)setTimeout(()=>levelUp(after),opts.delay||900);
  else{const stAfter=curStage();if(stAfter>stBefore)setTimeout(()=>stageUp(stBefore),1200)}
  return amt;
};
// counts for the path that are not XP
window.progNote=function(kind){const p=P();if(kind==="conv")p.conv=(p.conv||0)+1;if(kind==="perfect")p.perfect=(p.perfect||0)+1;saveSettings()};
window.xpForWord=function(){const p=P(),d=dayKey();if(p.addDay!==d){p.addDay=d;p.addN=0}if(p.addN>=50)return;p.addN++;gainXP(3,"word",{noMult:true})};
window.xpCheckStreak=function(){
  const d=streakDays(),p=P();p.badges=p.badges||[];
  const M=[[3,50],[7,150],[14,300],[30,700],[60,1500],[100,3000],[200,5000],[365,10000]];
  const hit=M.find(([n])=>d>=n&&!p.badges.includes("s"+n));
  if(hit){p.badges.push("s"+hit[0]);saveSettings();setTimeout(()=>{celebrate(`¡Racha de ${hit[0]} días!`,`+${hit[1]} XP de premio. ${d>=7?`Tu XP se multiplica ×${mult()} mientras mantengas la racha.`:"Sigue así: a los 7 días tu XP sube un 20 %."}`,"streak");gainXP(hit[1],"streak",{noMult:true,delay:2600})},1500)}
};
function floatXP(n){
  const pill=document.getElementById("lvlPill");if(!pill||!n)return;
  const r=pill.getBoundingClientRect(),f=document.createElement("div");f.className="xpfloat";f.textContent=`+${n} XP`;
  f.style.left=(r.left+r.width/2)+"px";f.style.top=(r.bottom+4)+"px";document.body.appendChild(f);setTimeout(()=>f.remove(),1300);
  pill.classList.remove("bump");void pill.offsetWidth;pill.classList.add("bump");
}
function renderLvl(){
  const pill=document.getElementById("lvlPill");if(!pill)return;const li=lvlInfo(P().xp);
  pill.querySelector("b").textContent=li.lvl;pill.querySelector(".lv-fg").setAttribute("stroke-dasharray",`${li.pct} 100`);
  pill.title=`Nivel ${li.lvl} · ${li.into}/${li.need} XP`;
  if(typeof tab!=="undefined"&&tab==="path")renderPath();
}
window.renderLvl=renderLvl;
const pending=[];
const busyPracticing=()=>{try{const x=window._px&&window._px();return !!(x&&x.active&&x.state!=="round")}catch(e){return false}};
window.flushCelebrations=function(){if(!pending.length)return;const c=pending.shift();celebrate(...c);};
function celebrate(title,sub,kind){
  if(busyPracticing()||document.querySelector(".celebrate")){pending.push([title,sub,kind]);return}
  const d=document.createElement("div");d.className="celebrate";
  d.innerHTML=`<div class="cbox"><div class="cimg"><img src="tama-happy.webp" alt=""></div>${kind==="lvl"?`<div class="cbig">${sub.split("|")[0]}</div>`:""}
    <h2>${title}</h2><p>${kind==="lvl"?sub.split("|")[1]:sub}</p><button class="btn primary" data-cclose>¡Seguir!</button></div>`;
  document.body.appendChild(d);sfx("done");confetti();
  d.addEventListener("click",e=>{if(e.target===d||e.target.closest("[data-cclose]")){d.remove();setTimeout(window.flushCelebrations,300)}});
}
function levelUp(l){
  const p=P();if((p.seenLvl||1)>=l)return;p.seenLvl=l;saveSettings();
  const st=STAGES[Math.min(curStage(),STAGES.length-1)];
  celebrate(`¡Nivel ${l}!`,`${l}|Tu etapa: ${st.t}. Cada nivel desbloquea frases un poco más largas y gramática nueva.`,"lvl");
}
function stageUp(i){const s=STAGES[i];const p=P();p.badges=p.badges||[];if(p.badges.includes("st"+i))return;p.badges.push("st"+i);saveSettings();
  celebrate(`Etapa superada: ${s.t}`,`+200 XP. Siguiente: ${STAGES[i+1]?STAGES[i+1].t:"¡has completado el camino!"}`,"stage");setTimeout(()=>gainXP(200,"stage",{noMult:true}),2000)}

/* ---- path view ---- */
function renderPath(){
  const pane=document.getElementById("pathPane");if(!pane)return;
  const p=P(),li=lvlInfo(p.xp),cur=curStage(),d=streakDays(),m=mult();
  const stats=[[li.lvl,"nivel"],[p.xp.toLocaleString("es-ES"),"XP total"],[d,"días de racha"],[mine(),"palabras"],[learned(),"aprendidas"],[mastered(),"dominadas"]];
  const badges=[[3,"3 días"],[7,"1 semana"],[14,"2 semanas"],[30,"1 mes"],[60,"2 meses"],[100,"100 días"],[365,"1 año"]];
  pane.innerHTML=`<div class="pathhead">
      <div class="lvbig"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" class="q-bg"/><circle cx="18" cy="18" r="15.5" class="lv-fg2" pathLength="100" stroke-dasharray="${li.pct} 100"/></svg><b>${li.lvl}</b><small>nivel</small></div>
      <div class="pathinfo"><span class="eyebrow">Etapa ${Math.min(cur+1,STAGES.length)} de ${STAGES.length}</span><h2 class="h2">${esc((STAGES[cur]||STAGES[STAGES.length-1]).t)}</h2>
        <div class="xpbar"><i style="width:${li.pct}%"></i></div><small>${li.into} / ${li.need} XP para el nivel ${li.lvl+1}${m>1?` · <b class="mul">×${m} por tu racha</b>`:""}</small></div>
    </div>
    <div class="pstats">${stats.map(([v,l])=>`<div><b>${v}</b><span>${l}</span></div>`).join("")}</div>
    <div class="badges">${badges.map(([n,l])=>`<div class="bdg ${(p.badges||[]).includes("s"+n)?"on":""}"><span>${n}</span><small>${l}</small></div>`).join("")}</div>
    <div class="hrow"><h2 class="h2">Tu camino</h2>${INFO}</div>
    <p class="info" style="margin:0;color:var(--muted);font-size:15px">Cada etapa pide progreso real: nivel (XP de practicar y hablar), palabras que conoces, verbos y frases dichas a Tama. Las palabras nuevas dan 3 XP (hasta 50 al día) y cada palabra dominada, 20. Con racha de 3, 7, 14 y 30 días tu XP se multiplica ×1,1 · ×1,2 · ×1,3 · ×1,5.</p>
    <div class="path">${STAGES.map((s,i)=>{const done=i<cur,on=i===cur;const x=Math.round(Math.sin(i*1.1)*70);
      const reqs=Object.entries(s.req),okN=reqs.filter(([k,v])=>reqNow(k)>=v).length;
      return `<div class="pnode ${done?"done":on?"on":"lock"}" style="--x:${x}px">
        <button class="pdot" data-stage="${i}">${done?SVG.check:`<span class="jp">${esc(s.jp)}</span>`}</button>
        ${on?`<img class="ptama" src="tama-neutral.webp" alt="">`:""}
        <div class="plbl"><b>${esc(s.t)}</b>${on?`<small>${okN}/${reqs.length} objetivos</small>`:""}</div></div>`}).join("")}</div>`;
}
window.renderPath=renderPath;
function stageSheet(i){
  const s=STAGES[i],cur=curStage();
  openSheet(`<div class="grab"></div><span class="eyebrow" style="font-size:13px;font-weight:700;color:var(--muted)">ETAPA ${i+1}${i<cur?" · SUPERADA":i===cur?" · ACTUAL":""}</span>
   <h3 class="h2"><span class="jp">${esc(s.jp)}</span> · ${esc(s.t)}</h3>
   <p style="margin:0;color:var(--muted)">${esc(s.learn)}</p>
   <div class="reqs">${Object.entries(s.req).map(([k,v])=>{const n=reqNow(k),ok=n>=v;return `<div class="req ${ok?"ok":""}"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><span>${REQ_LABEL[k]}</span><b>${Math.min(n,v)}/${v}</b></div><div class="xpbar"><i style="width:${Math.min(100,n/v*100)}%"></i></div></div>`}).join("")}</div>
   ${i===cur?`<div class="row"><button class="btn primary" data-tabgo="practice">Practicar</button><button class="btn" data-tabgo="vocab">Añadir palabras</button><button class="btn ghost" data-tabgo="chat">Hablar con Tama</button></div>`:""}`);
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-stage]");if(b){sfx("tap");stageSheet(+b.dataset.stage)}
  if(e.target.closest("#lvlPill")&&typeof setTab==="function"){sfx("tap");setTab("path")}});

// first paint + migrate: give credit for what was done before levels existed
(function init(){const p=P();if(!p.migrated){p.migrated=1;p.xp=Math.max(p.xp||0,mine()*3+learned()*5+mastered()*20);words.forEach(w=>{if((w.interval||0)>=21&&!w.masteredAt)w.masteredAt=1});saveWord();p.seenLvl=lvlInfo(p.xp).lvl;saveSettings()}
  renderLvl();xpCheckStreak()})();
})();
