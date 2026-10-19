/* ¿Wakarú? — Japanese verb conjugation engine + verb exercise builder (no AI).
   Classes: g = godan (u-verbs), i = ichidan (ru-verbs), k = 来る, x = する, s = noun+する, x2 = word already ending in する. */
(function(){
"use strict";
const ROWS={ // godan ending → [a, i, e, o, te, ta]
  "う":["わ","い","え","お","って","った"],"く":["か","き","け","こ","いて","いた"],"ぐ":["が","ぎ","げ","ご","いで","いだ"],
  "す":["さ","し","せ","そ","して","した"],"つ":["た","ち","て","と","って","った"],"ぬ":["な","に","ね","の","んで","んだ"],
  "ぶ":["ば","び","べ","ぼ","んで","んだ"],"む":["ま","み","め","も","んで","んだ"],"る":["ら","り","れ","ろ","って","った"]
};
const HONOR_I=new Set(["いらっしゃる","おっしゃる","くださる","なさる","ござる"]); // masu-stem in い

const FORMS={
  masu:{label:"〜ます",name:"presente educado",es:"hago / haré"},
  masen:{label:"〜ません",name:"negativo educado",es:"no hago"},
  mashita:{label:"〜ました",name:"pasado educado",es:"hice"},
  masendeshita:{label:"〜ませんでした",name:"pasado negativo educado",es:"no hice"},
  mashou:{label:"〜ましょう",name:"invitación",es:"¡hagamos…!"},
  tai:{label:"〜たいです",name:"deseo",es:"quiero hacer…"},
  te:{label:"forma て",name:"forma て",es:"une acciones, pide, etc."},
  teimasu:{label:"〜ています",name:"acción en curso",es:"estoy haciendo"},
  nai:{label:"〜ない",name:"negativo informal",es:"no hago"},
  ta:{label:"〜た",name:"pasado informal",es:"hice"},
  nakatta:{label:"〜なかった",name:"pasado negativo informal",es:"no hice"},
  pot:{label:"potencial",name:"poder hacer",es:"puedo hacer"},
  vol:{label:"volitiva",name:"«vamos a…» informal",es:"hagamos / voy a"},
  ba:{label:"〜ば",name:"condicional ば",es:"si hago…"},
  tara:{label:"〜たら",name:"condicional たら",es:"si / cuando haga…"},
  pass:{label:"pasiva",name:"pasiva",es:"ser hecho"},
  caus:{label:"causativa",name:"causativa",es:"hacer / dejar que haga"},
  dict:{label:"diccionario",name:"forma de diccionario",es:"hacer"}
};
const LEVELS=[
  {n:1,title:"Forma ます",sub:"Presente educado",forms:["masu"],ex:"食べます"},
  {n:2,title:"Negativo ません",sub:"No hacer, educado",forms:["masen"],ex:"食べません"},
  {n:3,title:"Pasado educado",sub:"ました · ませんでした",forms:["mashita","masendeshita"],ex:"食べました"},
  {n:4,title:"Invitar y querer",sub:"ましょう · たいです",forms:["mashou","tai"],ex:"食べましょう"},
  {n:5,title:"Forma て",sub:"La llave de muchas frases",forms:["te"],ex:"食べて"},
  {n:6,title:"〜ています",sub:"Estar haciendo",forms:["teimasu"],ex:"食べています"},
  {n:7,title:"Negativo ない",sub:"Informal",forms:["nai"],ex:"食べない"},
  {n:8,title:"Pasado informal",sub:"た · なかった",forms:["ta","nakatta"],ex:"食べた"},
  {n:9,title:"Potencial",sub:"Poder hacer",forms:["pot"],ex:"食べられる"},
  {n:10,title:"Volitiva",sub:"Vamos a… (informal)",forms:["vol"],ex:"食べよう"},
  {n:11,title:"Condicionales",sub:"ば · たら",forms:["ba","tara"],ex:"食べれば"},
  {n:12,title:"Pasiva y causativa",sub:"Nivel avanzado",forms:["pass","caus"],ex:"食べさせる"}
];

// normalize a verb into {jp, kana, cls, pj, pk} (pj/pk = prefix for する verbs)
function norm(v){
  let {jp,kana,cls}=v;jp=String(jp);kana=String(kana||jp);
  if(cls==="s"){return{jp:jp+"する",kana:kana+"する",cls:"x",pj:jp,pk:kana,es:v.es}}
  if(cls==="x2"){return{jp,kana,cls:"x",pj:jp.slice(0,-2),pk:kana.endsWith("する")?kana.slice(0,-2):kana,es:v.es}}
  if(cls==="x")return{jp,kana,cls:"x",pj:"",pk:"",es:v.es};
  return{jp,kana,cls,pj:"",pk:"",es:v.es};
}
// core: conjugate the kana reading; the written form reuses the kanji stem
function stems(V){
  const k=V.kana,j=V.jp;
  if(V.cls==="x"){const P={jp:V.pj,kana:V.pk};
    const f=(kj,kk)=>({jp:P.jp+kj,kana:P.kana+(kk||kj)});
    return{i:f("し"),a:f("し"),neg:f("しな"),e:f("すれ"),vol:f("しよう"),te:f("して"),ta:f("した"),pot:f("できる"),pass:f("される"),caus:f("させる"),dict:f("する")};}
  if(V.cls==="k"){const kanji=j.startsWith("来");const f=(r)=>({jp:kanji?"来"+r.slice(1):r,kana:r});
    return{i:f("き"),a:f("こ"),neg:f("こな"),e:f("くれ"),vol:f("こよう"),te:f("きて"),ta:f("きた"),pot:f("こられる"),pass:f("こられる"),caus:f("こさせる"),dict:f("くる")};}
  if(V.cls==="i"){const sj=j.slice(0,-1),sk=k.slice(0,-1);const f=s=>({jp:sj+s,kana:sk+s});
    return{i:f(""),a:f(""),neg:f("な"),e:f("れ"),vol:f("よう"),te:f("て"),ta:f("た"),pot:f("られる"),pass:f("られる"),caus:f("させる"),dict:f("る")};}
  // godan
  const end=k.slice(-1),R=ROWS[end]||ROWS["る"],sj=j.slice(0,-1),sk=k.slice(0,-1);const f=s=>({jp:sj+s,kana:sk+s});
  const iku=/^(い|ゆ)く$/.test(k)||/(行|往)く$/.test(j)&&k.endsWith("いく");
  const aru=k==="ある";
  return{i:f(HONOR_I.has(k)?"い":R[1]),a:f(R[0]),neg:aru?{jp:"な",kana:"な"}:f(R[0]+"な"),e:f(R[2]),vol:f(R[3]+"う"),
    te:iku?f("って"):f(R[4]),ta:iku?f("った"):f(R[5]),pot:f(R[2]+"る"),pass:f(R[0]+"れる"),caus:f(R[0]+"せる"),dict:f(end)};
}
const cat=(s,x)=>({jp:s.jp+x,kana:s.kana+x});
function conj(v,form){
  const V=norm(v),S=stems(V);
  switch(form){
    case"masu":return cat(S.i,"ます");case"masen":return cat(S.i,"ません");case"mashita":return cat(S.i,"ました");
    case"masendeshita":return cat(S.i,"ませんでした");case"mashou":return cat(S.i,"ましょう");case"tai":return cat(S.i,"たいです");
    case"te":return S.te;case"teimasu":return cat(S.te,"います");
    case"nai":return cat(S.neg,"い");case"ta":return S.ta;case"nakatta":return cat(S.neg,"かった");
    case"pot":return S.pot;case"vol":return S.vol;case"ba":return cat(S.e,"ば");case"tara":return cat(S.ta,"ら");
    case"pass":return S.pass;case"caus":return S.caus;case"dict":return S.dict;
  }
  return S.dict;
}
// short rule explanation shown after answering
function explain(v,form){
  const V=norm(v),end=V.kana.slice(-1),d=V.jp,r=conj(v,form).jp;
  if(V.cls==="x")return `する es irregular: ${form==="pot"?"su potencial es できる":"se conjuga como し〜 / さ〜"} → ${r}`;
  if(V.cls==="k")return `来る es irregular: cambia su lectura (き / こ / く) → ${r}`;
  const G=V.cls==="g",kind=G?`godan (termina en ${end})`:"ichidan (〜る)";
  const R=ROWS[end]||ROWS["る"];
  const iRule=G?`${end}→${R[1]}`:"quita る";
  const aRule=G?`${end}→${R[0]}`:"quita る";
  const teRule=G?(/^(い|ゆ)く$/.test(V.kana)?"行く es excepción: 行って":`${end}→${R[4]}`):"quita る + て";
  const taRule=G?(/^(い|ゆ)く$/.test(V.kana)?"行く es excepción: 行った":`${end}→${R[5]}`):"quita る + た";
  const T={
    masu:`Verbo ${kind}: ${iRule} + ます`,masen:`Verbo ${kind}: ${iRule} + ません`,mashita:`Verbo ${kind}: ${iRule} + ました`,
    masendeshita:`Verbo ${kind}: ${iRule} + ませんでした`,mashou:`Verbo ${kind}: ${iRule} + ましょう`,tai:`Verbo ${kind}: ${iRule} + たい(です)`,
    te:`Forma て de un ${kind}: ${teRule}`,teimasu:`Forma て + います. ${teRule}`,
    nai:V.kana==="ある"?"ある es especial: su negativo es ない":`Verbo ${kind}: ${aRule} + ない`,
    ta:`Pasado informal de un ${kind}: ${taRule}`,nakatta:`Negativo ない → なかった (${aRule} + なかった)`,
    pot:G?`Potencial godan: ${end}→${R[2]} + る`:"Potencial ichidan: quita る + られる",
    vol:G?`Volitiva godan: ${end}→${R[3]} + う`:"Volitiva ichidan: quita る + よう",
    ba:G?`Condicional godan: ${end}→${R[2]} + ば`:"Condicional ichidan: quita る + れば",
    tara:`Pasado た + ら (${taRule})`,
    pass:G?`Pasiva godan: ${end}→${R[0]} + れる`:"Pasiva ichidan: quita る + られる",
    caus:G?`Causativa godan: ${end}→${R[0]} + せる`:"Causativa ichidan: quita る + させる",
    dict:"Forma de diccionario"
  };
  return `${T[form]||""}: ${d} → ${r}`;
}
// plausible wrong answers: wrong class rule, wrong sound change, neighbouring forms
function wrongs(v,form,n){
  const V=norm(v),right=conj(v,form),out=[],seen=new Set([right.kana]);
  const push=c=>{if(c&&c.kana&&!seen.has(c.kana)){seen.add(c.kana);out.push(c)}};
  if(V.cls==="g"&&V.kana.endsWith("る"))push(conj({...v,cls:"i"},form));
  if(V.cls==="i")push(conj({...v,cls:"g"},form));
  if(["te","ta","teimasu","tara"].includes(form)&&V.cls==="g"){
    const sj=V.jp.slice(0,-1),sk=V.kana.slice(0,-1);
    const tail={te:"",ta:"",teimasu:"います",tara:"ら"}[form],past=form==="ta"||form==="tara";
    ["って","んで","いて","して"].forEach(x=>{const y=past?x.replace("て","た").replace("で","だ"):x;push({jp:sj+y+tail,kana:sk+y+tail})});
  }
  if(form==="nai"&&V.cls==="g"&&V.kana.endsWith("う")){const sj=V.jp.slice(0,-1),sk=V.kana.slice(0,-1);push({jp:sj+"あない",kana:sk+"あない"})}
  const near={masu:["masen","mashita","te"],masen:["masu","masendeshita","nai"],mashita:["masu","masendeshita","ta"],masendeshita:["mashita","masen","nakatta"],
    mashou:["masu","tai","vol"],tai:["masu","mashou","te"],te:["ta","masu","teimasu"],teimasu:["masu","te","mashita"],nai:["masen","nakatta","ta"],
    ta:["te","mashita","nakatta"],nakatta:["nai","ta","masendeshita"],pot:["pass","masu","caus"],vol:["mashou","masu","ba"],ba:["tara","pot","vol"],
    tara:["ta","ba","te"],pass:["caus","pot","masu"],caus:["pass","pot","masu"]};
  (near[form]||[]).forEach(f=>push(conj(v,f)));
  Object.keys(FORMS).forEach(f=>{if(out.length<n+2)push(conj(v,f))});
  return out.slice(0,n);
}
window.VERBS={FORMS,LEVELS,conj,explain,wrongs,norm};
if(typeof module!=="undefined")module.exports=window.VERBS;
})();
