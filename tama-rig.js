/* Tama rig — cartoon animation for the red panda illustrations.
   Each pose image is drawn on a deformable mesh (WebGL). Named regions of the drawing
   (head, eyes, mouth, ears, tail) are bent independently, so the character can blink,
   talk, wag its tail, twitch its ears and squash & stretch like a cartoon.
   Moods are read from the CSS classes of the .cat element: happy, oops/sad, talk, think, listen. */
(function(){
  "use strict";
  // Anchors are in image coordinates (0..1, y down) of each 528x512 pose image.
  const A={
    neutral:{neck:[.49,.62],eyes:[[.381,.413],[.605,.413]],er:[.085,.092],mouth:[.49,.52,.05],tailB:[.78,.81],tailC:[.87,.72,.17],ears:[[.25,.21],[.73,.21]]},
    happy:  {neck:[.48,.62],eyes:[],er:[.08,.08],               mouth:[.48,.53,.07],tailB:[.80,.82],tailC:[.88,.75,.16],ears:[[.22,.19],[.75,.19]]},
    talk:   {neck:[.42,.64],eyes:[[.313,.422],[.516,.436]],er:[.075,.085],mouth:[.41,.56,.065],tailB:[.72,.82],tailC:[.86,.74,.17],ears:[[.20,.17],[.73,.20]]},
    listen: {neck:[.45,.66],eyes:[[.355,.478],[.537,.386]],er:[.075,.085],mouth:[.50,.54,.04],tailB:[.22,.86],tailC:[.10,.79,.15],ears:[[.12,.31],[.55,.12]]},
    think:  {neck:[.48,.62],eyes:[[.354,.395],[.597,.394]],er:[.08,.09],mouth:[.50,.50,.04],tailB:[.78,.83],tailC:[.88,.75,.16],ears:[[.22,.19],[.73,.21]]},
    oops:   {neck:[.47,.64],eyes:[[.356,.434],[.583,.439]],er:[.08,.088],mouth:[.46,.54,.04],tailB:[.80,.83],tailC:[.88,.76,.16],ears:[[.13,.27],[.84,.27]]}
  };
  const POSES=Object.keys(A);
  const IMG_ASPECT=528/512;
  const SRC=p=>`tama-${p}.webp`;
  const reduce=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;

  const VS=`
attribute vec2 aUV;
uniform vec2 uNeck;uniform float uHeadA;uniform vec2 uHeadT;
uniform vec4 uEyes;uniform float uEyeN;uniform float uBlink;uniform vec2 uLook;uniform vec2 uEyeR;
uniform vec3 uMouth;uniform float uMouthC;
uniform vec2 uTailB;uniform vec3 uTailC;uniform float uTailA;
uniform vec4 uEars;uniform vec2 uEarA;
uniform vec2 uSquash;uniform vec2 uMove;uniform float uRot;uniform float uBreath;
uniform vec4 uFrame;
varying vec2 vUV;
vec2 rot(vec2 p,vec2 c,float a){float s=sin(a),k=cos(a);p-=c;return c+vec2(k*p.x-s*p.y,s*p.x+k*p.y);}
vec2 eye(vec2 p,vec2 e){
  vec2 d=(p-e)/uEyeR;float w=1.0-smoothstep(.55,1.0,length(d));
  float cy=e.y+uEyeR.y*.12;
  p.y=cy+(p.y-cy)*(1.0-uBlink*w);
  return p;
}
void main(){
  vec2 p=aUV;
  if(uEyeN>0.5)p=eye(p,uEyes.xy);
  if(uEyeN>1.5)p=eye(p,uEyes.zw);
  if(uMouthC>0.001){
    vec2 d=(p-uMouth.xy)/vec2(uMouth.z*1.35,uMouth.z*1.1);float w=smoothstep(1.0,.35,length(d));
    float top=uMouth.y-uMouth.z*.6;p.y=top+(p.y-top)*(1.0-uMouthC*w*.6);
  }
  float we=smoothstep(.13,.05,distance(p,uEars.xy));p=rot(p,uEars.xy+vec2(0.0,.08),uEarA.x*we);
  we=smoothstep(.13,.05,distance(p,uEars.zw));p=rot(p,uEars.zw+vec2(0.0,.08),uEarA.y*we);
  float wt=smoothstep(uTailC.z,uTailC.z*.5,distance(p,uTailC.xy));
  float bend=clamp(distance(p,uTailB)/(uTailC.z*1.7),0.0,1.0);
  p=rot(p,uTailB,uTailA*wt*bend);
  float wh=smoothstep(uNeck.y+.05,uNeck.y-.08,p.y);
  vec2 ph=rot(p,uNeck,uHeadA)+uHeadT;p=mix(p,ph,wh);
  p.y=1.0+(p.y-1.0)*(1.0+uBreath);p.x=.5+(p.x-.5)*(1.0-uBreath*.35);
  p=vec2(.5,1.0)+(p-vec2(.5,1.0))*uSquash;p=rot(p,vec2(.5,1.0),uRot);p+=uMove;
  vUV=aUV;
  gl_Position=vec4(uFrame.xy+p*uFrame.zw,0.0,1.0);
}`;
  const FS=`precision mediump float;varying vec2 vUV;uniform sampler2D uTex;uniform float uAlpha;
void main(){gl_FragColor=texture2D(uTex,vUV)*uAlpha;}`;

  // shared decoded images
  const imgCache={};
  function img(p){if(!imgCache[p]){const i=new Image();i.decoding="async";i.src=SRC(p);imgCache[p]=i}return imgCache[p]}

  // small helpers
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
  const noise=t=>Math.sin(t*1.0)*.5+Math.sin(t*2.31+1.7)*.3+Math.sin(t*4.13+.4)*.2;
  function spring(x,k,z){return{x,v:0,t:x,k,z}}
  function step(s,dt){const c=2*Math.sqrt(s.k)*s.z;s.v+=(s.k*(s.t-s.x)-c*s.v)*dt;s.x+=s.v*dt}

  class Rig{
    constructor(el){
      this.el=el;this.cv=document.createElement("canvas");this.cv.className="rig-cv";el.prepend(this.cv);
      const gl=this.cv.getContext("webgl",{premultipliedAlpha:true,alpha:true,antialias:true});
      if(!gl){this.dead=true;return}
      this.gl=gl;this.tex={};this.t0=performance.now();this.last=this.t0;
      this.mood="idle";this.pose="neutral";this.prev=null;this.fade=1;
      this.s={headA:spring(0,90,.55),headY:spring(0,120,.6),tail:spring(0,30,.35),earL:spring(0,260,.25),earR:spring(0,260,.25),look:spring(0,60,.8)};
      this.blink=0;this.nextBlink=1.2+Math.random()*2;this.blinkT=-1;this.dbl=false;
      this.ev={pop:-9,jump:-9,flinch:-9,mini:-9,poke:-9,spin:-9};this.pokes=0;this.lastPoke=-9;this.override=null;this.overUntil=0;this.pokeDir=1;this.giggleUntil=0;this.nextIdle=3+Math.random()*4;this.idleAct=null;this.idleUntil=0;
      this.build();POSES.forEach(p=>this.load(p));
      this.mo=new MutationObserver(()=>this.readMood());this.mo.observe(el,{attributes:true,attributeFilter:["class"]});
      this.ro=new ResizeObserver(()=>this.resize());this.ro.observe(el);
      this.readMood();this.resize();el.classList.add("rigged");
      el.addEventListener("pointerdown",e=>this.poke(e));
      this.loop=this.loop.bind(this);requestAnimationFrame(this.loop);
    }
    build(){
      const gl=this.gl;const sh=(t,src)=>{const s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw gl.getShaderInfoLog(s);return s};
      const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);
      if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw gl.getProgramInfoLog(pr);
      this.pr=pr;gl.useProgram(pr);
      const N=64,v=[],ix=[];for(let y=0;y<=N;y++)for(let x=0;x<=N;x++)v.push(x/N,y/N);
      for(let y=0;y<N;y++)for(let x=0;x<N;x++){const a=y*(N+1)+x,b=a+1,c=a+N+1,d=c+1;ix.push(a,b,c,b,d,c)}
      const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.STATIC_DRAW);
      const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(ix),gl.STATIC_DRAW);
      this.count=ix.length;const loc=gl.getAttribLocation(pr,"aUV");gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
      this.u={};["uEyeR","uNeck","uHeadA","uHeadT","uEyes","uEyeN","uBlink","uLook","uMouth","uMouthC","uTailB","uTailC","uTailA","uEars","uEarA","uSquash","uMove","uRot","uBreath","uFrame","uTex","uAlpha"].forEach(n=>this.u[n]=gl.getUniformLocation(pr,n));
      gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    }
    load(p){
      const i=img(p);const up=()=>{if(this.dead)return;const gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,i);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);this.tex[p]=t};
      if(i.complete&&i.naturalWidth)up();else i.addEventListener("load",up,{once:true});
    }
    resize(){
      const r=this.el.getBoundingClientRect(),d=Math.min(2.5,window.devicePixelRatio||1);
      const w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));
      if(this.cv.width!==w||this.cv.height!==h){this.cv.width=w;this.cv.height=h}
    }
    readMood(){
      const c=this.el.classList;
      const m=c.contains("happy")?"happy":(c.contains("oops")||c.contains("sad"))?"oops":c.contains("talk")?"talk":c.contains("think")?"think":c.contains("listen")?"listen":c.contains("peek")?"peek":"idle";
      if(m===this.mood)return;const t=this.now();
      this.mood=m;
      if(m==="happy")this.ev.jump=t;
      if(m==="oops")this.ev.flinch=t;
      this.applyPose(t);
      // a quick ear flick on every change makes the switch feel reactive
      this.s.earL.v+=(Math.random()-.5)*6;this.s.earR.v+=(Math.random()-.5)*6;
    }
    applyPose(t){
      const want=(this.override&&t<this.overUntil)?this.override:({idle:"neutral",peek:"listen"}[this.mood]||this.mood);
      if(want!==this.pose){this.prev=this.pose;this.pose=want;this.fade=0;this.ev.pop=t}
    }
    // tapping Tama: startle → tickles → dizzy spin, escalating with quick repeated taps
    poke(e){
      const t=this.now(),r=this.el.getBoundingClientRect(),s=this.s;
      const side=((e.clientX-r.left)/r.width)<.5?-1:1;
      this.pokes=t-this.lastPoke<1.1?this.pokes+1:1;this.lastPoke=t;this.pokeDir=side;
      s.headA.v+=-side*4;s.earL.v+=9;s.earR.v-=9;s.tail.v+=side*7;
      let kind="startle";
      if(this.pokes>=7&&t-this.ev.spin>1.8){kind="spin";this.ev.spin=t;this.override="oops";this.overUntil=t+2.4;this.pokes=0}
      else if(this.pokes>=3){kind="giggle";this.override="happy";this.overUntil=t+1.4;this.giggleUntil=t+1.4;this.ev.poke=t}
      else{this.override="listen";this.overUntil=t+.9;this.ev.poke=t;this.blinkT=t+.35}
      this.applyPose(t);
      window.dispatchEvent(new CustomEvent("tamapoke",{detail:{kind,count:this.pokes,el:this.el}}));
    }
    now(){return(performance.now()-this.t0)/1000}
    loop(ts){
      if(!this.el.isConnected){this.destroy();return}
      requestAnimationFrame(this.loop);
      if(document.hidden||!this.el.offsetParent)return;
      const t=this.now(),dt=clamp((ts-this.last)/1000,0,.05);this.last=ts;
      this.update(t,dt);this.draw(t);
    }
    update(t,dt){
      this.applyPose(t);
      const s=this.s,m=this.mood,calm=reduce()?.35:1;
      // --- head ---
      let ha=noise(t*.55)*.03, hy=0;
      if(m==="talk"){ha=Math.sin(t*4.7)*.045+Math.sin(t*7.9+1)*.02;hy=-Math.abs(Math.sin(t*6.1))*.012}
      else if(m==="listen"||m==="peek"){ha=-.07+Math.sin(t*1.3)*.015;hy=-.006}
      else if(m==="think"){ha=Math.sin(t*1.25)*.06}
      else if(m==="happy"){ha=Math.sin(t*8.5)*.06}
      else if(m==="oops"){ha=.03+Math.sin(t*23)*.006*Math.max(0,1-(t-this.ev.flinch)/1.2);hy=.01}
      // idle micro-acts: look around, curious peek, tail flick, little hop
      if(m==="idle"&&t>this.nextIdle){const r=Math.random();this.idleAct=r<.35?"look":r<.55?"flick":r<.75?"ear":"hop";this.idleUntil=t+1.4;this.nextIdle=t+4+Math.random()*6;
        if(this.idleAct==="flick")s.tail.v+=(Math.random()<.5?-1:1)*4;
        if(this.idleAct==="ear"){(Math.random()<.5?s.earL:s.earR).v+=(Math.random()<.5?-1:1)*9}
        if(this.idleAct==="hop"&&!reduce())this.ev.mini=t;
        this.lookDir=Math.random()<.5?-1:1}
      if(m==="idle"&&this.idleAct==="look"&&t<this.idleUntil)ha+=.07*this.lookDir;
      s.headA.t=ha*calm;s.headY.t=hy*calm;
      // --- tail: lazy swish, faster when excited ---
      const tf=m==="happy"?8.5:m==="talk"?2.6:m==="oops"?.8:1.5,ta=m==="happy"?.32:m==="oops"?.06:.15;
      s.tail.t=(Math.sin(t*tf)*ta+Math.sin(t*tf*1.9+.6)*ta*.35)*calm;
      if(t<this.giggleUntil){s.tail.t=Math.sin(t*14)*.35;s.headA.t=Math.sin(t*18)*.07}
      // --- ears ---
      s.earL.t=m==="listen"||m==="peek"?-.06:0;s.earR.t=m==="listen"||m==="peek"?.08:0;
      for(const k in s)step(s[k],dt);
      // --- blink (eyes closed in the happy drawing already) ---
      if(t>this.nextBlink&&this.blinkT<0){this.blinkT=t;this.dbl=Math.random()<.22}
      if(this.blinkT>=0){const e=t-this.blinkT,c=.065,h=.05,o=.1,d=c+h+o;
        this.blink=e<0?0:e<c?ease(e/c):e<c+h?1:e<d?1-ease((e-c-h)/o):0;
        if(e>=d){if(this.dbl){this.dbl=false;this.blinkT=t+.08}else{this.blinkT=-1;this.nextBlink=t+1.8+Math.random()*3.8}}}
      else this.blink=0;
      if(this.fade<1)this.fade=Math.min(1,this.fade+dt/.16);
    }
    globalMotion(t){
      let sx=1,sy=1,mx=0,my=0,rot=0;
      // pose switch: springy squash
      const p=t-this.ev.pop;if(p<.35){const f=Math.sin(p/.35*Math.PI*2)*(1-p/.35);sx+=.05*f;sy-=.05*f}
      // happy: anticipation → jump with stretch → land squash, twice
      const j=t-this.ev.jump;if(j<1.25&&!reduce()){const u=(j%.62)/.62;
        if(u<.16){const e=ease(u/.16);sx+=.1*e;sy-=.12*e}
        else if(u<.7){const a=(u-.16)/.54;my-=.15*Math.sin(a*Math.PI);const st=Math.max(0,1-a*2.2);sx-=.06*st;sy+=.08*st;rot=Math.sin(a*Math.PI)*.04}
        else{const a=(u-.7)/.3;const d=Math.exp(-a*5)*Math.cos(a*Math.PI*2.5);sx+=.09*d;sy-=.11*d}}
      // oops: flinch shake
      const f=t-this.ev.flinch;if(f<.5){const k=1-f/.5;mx+=Math.sin(f*42)*.022*k;rot+=Math.sin(f*42)*.02*k;if(f>.25){sy-=.025*(f-.25)/.25}}
      else if(this.mood==="oops"){sy-=.025;sx+=.012}
      // tapped: tiny crouch, startled hop, springy landing
      const k=t-this.ev.poke;if(k<.6&&!reduce()){const u=k/.6;
        if(u<.1){const e=ease(u/.1);sx+=.07*e;sy-=.09*e}
        else if(u<.55){const a=(u-.1)/.45;my-=.11*Math.sin(a*Math.PI);sy+=.06*Math.max(0,1-a*2);sx-=.04*Math.max(0,1-a*2);rot+=this.pokeDir*.05*Math.sin(a*Math.PI)}
        else{const a=(u-.55)/.45;const d=Math.exp(-a*4)*Math.cos(a*Math.PI*3);sx+=.07*d;sy-=.08*d}}
      if(t<this.giggleUntil)rot+=Math.sin(t*28)*.035;
      // many taps: full spin around the body centre, then a dizzy wobble
      const sp=t-this.ev.spin;if(sp<.85){const u=sp/.85,a=ease(u)*Math.PI*2*this.pokeDir;rot+=a;my-=.13*Math.sin(u*Math.PI);const sh=1-.16*Math.sin(u*Math.PI);sx*=sh;sy*=sh;
        const dy=-.42;mx+=-(-Math.sin(a)*dy);my+=dy-Math.cos(a)*dy}
      else if(sp<2.4){const w=1-(sp-.85)/1.55;rot+=Math.sin(t*9)*.07*w;mx+=Math.sin(t*4.5)*.02*w}
      // little idle hop
      const h=t-this.ev.mini;if(h<.55){const u=h/.55;if(u<.2){const e=ease(u/.2);sx+=.05*e;sy-=.06*e}else if(u<.75){const a=(u-.2)/.55;my-=.05*Math.sin(a*Math.PI)}else{const a=(u-.75)/.25;const d=(1-a)*Math.sin(a*Math.PI);sx+=.04*d;sy-=.04*d}}
      return{sx,sy,mx,my,rot};
    }
    draw(t){
      const gl=this.gl,u=this.u,W=this.cv.width,H=this.cv.height;
      gl.viewport(0,0,W,H);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
      // image box: 82% of the height, bottom-aligned, leaves headroom for jumps
      let bh=H*.82,bw=bh*IMG_ASPECT;if(bw>W*.96){bw=W*.96;bh=bw/IMG_ASPECT}
      const left=(W-bw)/2,top=H*.985-bh;
      gl.uniform4f(u.uFrame,left/W*2-1,1-top/H*2,bw/W*2,-bh/H*2);
      const s=this.s,g=this.globalMotion(t),calm=reduce()?.4:1;
      const breath=(Math.sin(t*1.75)*.011+Math.sin(t*.9)*.004)*calm*(this.mood==="think"?.6:1);
      gl.uniform2f(u.uSquash,g.sx,g.sy);gl.uniform2f(u.uMove,g.mx,g.my);gl.uniform1f(u.uRot,g.rot);gl.uniform1f(u.uBreath,breath);
      gl.uniform1f(u.uHeadA,s.headA.x);gl.uniform2f(u.uHeadT,0,s.headY.x);gl.uniform1f(u.uTailA,s.tail.x);gl.uniform2f(u.uEarA,s.earL.x,s.earR.x);
      // mouth flaps while talking (syllable-like, with natural pauses)
      const talking=this.mood==="talk";
      const gate=clamp(noise(t*2.2)*1.6+.9,0,1);
      const mouthC=talking?clamp(.5+.5*Math.sin(t*15+2*Math.sin(t*5.3)),0,1)*gate:0;
      const drawPose=(p,alpha)=>{
        const a=A[p],tex=this.tex[p];if(!tex||alpha<=0)return;
        gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1f(u.uAlpha,alpha);
        gl.uniform2f(u.uNeck,a.neck[0],a.neck[1]);
        const e=a.eyes;gl.uniform1f(u.uEyeN,e.length);gl.uniform4f(u.uEyes,e[0]?e[0][0]:0,e[0]?e[0][1]:0,e[1]?e[1][0]:0,e[1]?e[1][1]:0);
        gl.uniform1f(u.uBlink,this.blink);gl.uniform2f(u.uEyeR,a.er[0],a.er[1]);
        gl.uniform3f(u.uMouth,a.mouth[0],a.mouth[1],a.mouth[2]);gl.uniform1f(u.uMouthC,p==="talk"?mouthC:0);
        gl.uniform2f(u.uTailB,a.tailB[0],a.tailB[1]);gl.uniform3f(u.uTailC,a.tailC[0],a.tailC[1],a.tailC[2]);
        gl.uniform4f(u.uEars,a.ears[0][0],a.ears[0][1],a.ears[1][0],a.ears[1][1]);
        gl.drawElements(gl.TRIANGLES,this.count,gl.UNSIGNED_SHORT,0);
      };
      if(this.prev&&this.fade<1)drawPose(this.prev,1-this.fade);
      drawPose(this.pose,this.fade<1?this.fade:1);
    }
    destroy(){if(this.dead)return;this.dead=true;try{this.mo.disconnect();this.ro.disconnect()}catch(e){}const x=this.gl&&this.gl.getExtension("WEBGL_lose_context");if(x)x.loseContext()}
  }

  // mount on every .cat that appears in the page
  function mountAll(root){(root.querySelectorAll?root:document).querySelectorAll(".cat:not(.rigged):not(.norig)").forEach(el=>{
    try{const r=new Rig(el);if(r.dead){el.classList.add("norig")}else el._rig=r}catch(e){console.warn("rig",e);el.classList.add("norig")}})}
  const mo=new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1){if(n.matches&&n.matches(".cat"))mountAll(n.parentNode);else if(n.querySelector&&n.querySelector(".cat"))mountAll(n)}});
  function start(){POSES.forEach(img);mountAll(document);mo.observe(document.body,{childList:true,subtree:true})}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
  window.TamaRig={mountAll};
})();
