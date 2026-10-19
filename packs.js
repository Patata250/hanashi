/* ¿Wakarú? — word packs: families of words that are learnt together (こ・そ・あ・ど, numbers, days…).
   When you add one word of a family, Tama offers the rest. All local, no AI. */
(function(){
"use strict";
// [jp, kana, es]
const P=[];
const pack=(id,title,desc,items,type)=>P.push({id,title,desc,type:type||"",items:items.map(([jp,kana,es])=>({jp,kana,es}))});

/* ---- numbers 1–100, built by rule ---- */
const U=["","一","二","三","四","五","六","七","八","九"],UK=["","いち","に","さん","よん","ご","ろく","なな","はち","きゅう"];
const TK=["","じゅう","にじゅう","さんじゅう","よんじゅう","ごじゅう","ろくじゅう","ななじゅう","はちじゅう","きゅうじゅう"];
const num=n=>{if(n===100)return["百","ひゃく","100"];const t=Math.floor(n/10),u=n%10;
  return [(t?(t>1?U[t]:"")+"十":"")+U[u],TK[t]+UK[u],String(n)]};
pack("num10","Números 1–10","Los primeros números. Ojo: 4 = よん (o し) y 7 = なな (o しち); 0 = ゼロ / れい.",
  [["ゼロ","ぜろ","0"],...Array.from({length:10},(_,i)=>num(i+1))],"número");
pack("num100","Números 11–100","Del 11 al 100. Se forman como «diez-uno» (十一), «dos-diez» (二十)…",Array.from({length:90},(_,i)=>num(i+11)),"número");
pack("numbig","Números grandes","Centenas, millares y diez mil (万), que en japonés es una unidad propia.",[
  ["百","ひゃく","100"],["二百","にひゃく","200"],["三百","さんびゃく","300"],["六百","ろっぴゃく","600"],["八百","はっぴゃく","800"],
  ["千","せん","1.000"],["三千","さんぜん","3.000"],["八千","はっせん","8.000"],["一万","いちまん","10.000"],["十万","じゅうまん","100.000"],["百万","ひゃくまん","1.000.000"]],"número");
pack("tsu","Contar cosas (ひとつ, ふたつ…)","Números japoneses nativos, para contar objetos en general y pedir en tiendas.",[
  ["一つ","ひとつ","uno (cosa)"],["二つ","ふたつ","dos (cosas)"],["三つ","みっつ","tres"],["四つ","よっつ","cuatro"],["五つ","いつつ","cinco"],
  ["六つ","むっつ","seis"],["七つ","ななつ","siete"],["八つ","やっつ","ocho"],["九つ","ここのつ","nueve"],["十","とお","diez"],["いくつ","いくつ","¿cuántos?"]],"contador");
pack("people","Contar personas","Contador 人 (にん). Ojo con 1 y 2, que son irregulares.",[
  ["一人","ひとり","una persona; solo"],["二人","ふたり","dos personas"],["三人","さんにん","tres personas"],["四人","よにん","cuatro personas"],
  ["五人","ごにん","cinco personas"],["何人","なんにん","¿cuántas personas?"]],"contador");

/* ---- こ・そ・あ・ど ---- */
pack("koko","Lugares: ここ・そこ・あそこ・どこ","こ = cerca de mí, そ = cerca de ti, あ = lejos de los dos, ど = pregunta.",[
  ["ここ","ここ","aquí"],["そこ","そこ","ahí"],["あそこ","あそこ","allí"],["どこ","どこ","¿dónde?"]],"pronombre");
pack("kore","Cosas: これ・それ・あれ・どれ","Sustituyen a un objeto: «esto», «eso», «aquello», «¿cuál?».",[
  ["これ","これ","esto"],["それ","それ","eso"],["あれ","あれ","aquello"],["どれ","どれ","¿cuál? (entre varios)"]],"pronombre");
pack("kono","Delante de un nombre: この・その・あの・どの","Van siempre seguidos de un nombre: この本 = este libro.",[
  ["この","この","este … (+ nombre)"],["その","その","ese …"],["あの","あの","aquel …"],["どの","どの","¿qué …? ¿cuál …?"]],"pronombre");
pack("kochira","Dirección / educado: こちら・そちら・あちら・どちら","Versión educada de lugares y personas: こちらは田中さんです.",[
  ["こちら","こちら","por aquí; esta persona (educado)"],["そちら","そちら","por ahí; usted"],["あちら","あちら","por allí"],["どちら","どちら","¿dónde? ¿cuál de dos? (educado)"]],"pronombre");
pack("konna","Así: こんな・そんな・あんな・どんな","«Un … así»: こんな人 = una persona así.",[
  ["こんな","こんな","así (como esto)"],["そんな","そんな","así (como eso)"],["あんな","あんな","así (como aquello)"],["どんな","どんな","¿qué tipo de…?"]],"pronombre");
pack("kou","Manera: こう・そう・ああ・どう","«De esta manera»: そうです = así es.",[
  ["こう","こう","así, de esta manera"],["そう","そう","así, de esa manera"],["ああ","ああ","así, de aquella manera"],["どう","どう","¿cómo? ¿qué tal?"]],"pronombre");
pack("q","Palabras para preguntar","Con estas puedes preguntar casi cualquier cosa.",[
  ["何","なに","¿qué?"],["誰","だれ","¿quién?"],["どこ","どこ","¿dónde?"],["いつ","いつ","¿cuándo?"],["どう","どう","¿cómo?"],["どれ","どれ","¿cuál?"],
  ["どうして","どうして","¿por qué?"],["いくら","いくら","¿cuánto cuesta?"],["いくつ","いくつ","¿cuántos? ¿qué edad?"],["何時","なんじ","¿qué hora?"],["どのくらい","どのくらい","¿cuánto? (tiempo, cantidad)"]],"interrogativo");

/* ---- time ---- */
pack("week","Días de la semana","Cada día lleva un elemento: luna, fuego, agua, árbol, oro, tierra, sol.",[
  ["月曜日","げつようび","lunes"],["火曜日","かようび","martes"],["水曜日","すいようび","miércoles"],["木曜日","もくようび","jueves"],
  ["金曜日","きんようび","viernes"],["土曜日","どようび","sábado"],["日曜日","にちようび","domingo"],["何曜日","なんようび","¿qué día de la semana?"]],"sustantivo");
pack("months","Meses","Número + 月 (がつ). Ojo: 4 = しがつ, 7 = しちがつ, 9 = くがつ.",[
  ["一月","いちがつ","enero"],["二月","にがつ","febrero"],["三月","さんがつ","marzo"],["四月","しがつ","abril"],["五月","ごがつ","mayo"],["六月","ろくがつ","junio"],
  ["七月","しちがつ","julio"],["八月","はちがつ","agosto"],["九月","くがつ","septiembre"],["十月","じゅうがつ","octubre"],["十一月","じゅういちがつ","noviembre"],["十二月","じゅうにがつ","diciembre"],["何月","なんがつ","¿qué mes?"]],"sustantivo");
pack("dates","Días del mes","Del 1 al 10 son irregulares; también 14, 20 y 24. El resto: número + にち.",[
  ["一日","ついたち","día 1"],["二日","ふつか","día 2"],["三日","みっか","día 3"],["四日","よっか","día 4"],["五日","いつか","día 5"],["六日","むいか","día 6"],
  ["七日","なのか","día 7"],["八日","ようか","día 8"],["九日","ここのか","día 9"],["十日","とおか","día 10"],["十四日","じゅうよっか","día 14"],["二十日","はつか","día 20"],["二十四日","にじゅうよっか","día 24"],["何日","なんにち","¿qué día?"]],"sustantivo");
pack("hours","Las horas","Número + 時 (じ). Ojo: 4 = よじ, 7 = しちじ, 9 = くじ. Media = 半.",[
  ["一時","いちじ","la una"],["二時","にじ","las dos"],["三時","さんじ","las tres"],["四時","よじ","las cuatro"],["五時","ごじ","las cinco"],["六時","ろくじ","las seis"],
  ["七時","しちじ","las siete"],["八時","はちじ","las ocho"],["九時","くじ","las nueve"],["十時","じゅうじ","las diez"],["十一時","じゅういちじ","las once"],["十二時","じゅうにじ","las doce"],
  ["半","はん","y media"],["午前","ごぜん","a.m., por la mañana"],["午後","ごご","p.m., por la tarde"],["何時","なんじ","¿qué hora?"]],"sustantivo");
pack("rel","Hoy, ayer, mañana…","Días, semanas, meses y años relativos a hoy.",[
  ["おととい","おととい","anteayer"],["昨日","きのう","ayer"],["今日","きょう","hoy"],["明日","あした","mañana"],["あさって","あさって","pasado mañana"],
  ["先週","せんしゅう","la semana pasada"],["今週","こんしゅう","esta semana"],["来週","らいしゅう","la semana que viene"],
  ["先月","せんげつ","el mes pasado"],["今月","こんげつ","este mes"],["来月","らいげつ","el mes que viene"],
  ["去年","きょねん","el año pasado"],["今年","ことし","este año"],["来年","らいねん","el año que viene"],["毎日","まいにち","todos los días"]],"sustantivo");
pack("dayparts","Partes del día","",[
  ["朝","あさ","mañana (temprano)"],["昼","ひる","mediodía"],["夕方","ゆうがた","atardecer"],["夜","よる","noche"],["今","いま","ahora"],
  ["今朝","けさ","esta mañana"],["今晩","こんばん","esta noche"],["毎朝","まいあさ","todas las mañanas"],["毎晩","まいばん","todas las noches"]],"sustantivo");
pack("seasons","Estaciones y tiempo","",[
  ["春","はる","primavera"],["夏","なつ","verano"],["秋","あき","otoño"],["冬","ふゆ","invierno"],["天気","てんき","el tiempo"],["晴れ","はれ","soleado"],
  ["曇り","くもり","nublado"],["雨","あめ","lluvia"],["雪","ゆき","nieve"],["風","かぜ","viento"],["暑い","あつい","hace calor"],["寒い","さむい","hace frío"],["暖かい","あたたかい","templado"],["涼しい","すずしい","fresco"]],"sustantivo");

/* ---- people ---- */
pack("pron","Personas: yo, tú, él…","En japonés se omiten mucho; あなた puede sonar distante: mejor el nombre + さん.",[
  ["私","わたし","yo"],["僕","ぼく","yo (chico, informal)"],["あなた","あなた","tú, usted"],["彼","かれ","él; novio"],["彼女","かのじょ","ella; novia"],
  ["私たち","わたしたち","nosotros"],["みんな","みんな","todos"],["友達","ともだち","amigo"],["人","ひと","persona"]],"pronombre");
pack("family","Familia","La familia propia (父, 母…) y la de otros (お父さん, お母さん…).",[
  ["家族","かぞく","familia"],["両親","りょうしん","padres"],["父","ちち","mi padre"],["母","はは","mi madre"],["兄","あに","mi hermano mayor"],["姉","あね","mi hermana mayor"],
  ["弟","おとうと","hermano menor"],["妹","いもうと","hermana menor"],["お父さん","おとうさん","padre (de otro / al llamarlo)"],["お母さん","おかあさん","madre (de otro)"],
  ["お兄さん","おにいさん","hermano mayor (de otro)"],["お姉さん","おねえさん","hermana mayor (de otro)"],["子供","こども","niño; hijo"],["夫","おっと","mi marido"],["妻","つま","mi mujer"]],"sustantivo");
pack("greet","Saludos y frases de cortesía","Las frases que se usan a diario.",[
  ["おはようございます","おはようございます","buenos días"],["こんにちは","こんにちは","hola, buenas tardes"],["こんばんは","こんばんは","buenas noches (saludo)"],
  ["さようなら","さようなら","adiós"],["おやすみなさい","おやすみなさい","buenas noches (al dormir)"],["ありがとうございます","ありがとうございます","muchas gracias"],
  ["すみません","すみません","perdón; disculpe"],["ごめんなさい","ごめんなさい","lo siento"],["はじめまして","はじめまして","encantado (al conocer)"],
  ["よろしくお願いします","よろしくおねがいします","un placer; cuento contigo"],["いただきます","いただきます","que aproveche (antes de comer)"],
  ["ごちそうさまでした","ごちそうさまでした","gracias por la comida"],["いってきます","いってきます","me voy (y vuelvo)"],["ただいま","ただいま","ya estoy en casa"],["お元気ですか","おげんきですか","¿qué tal estás?"]],"expresión");

/* ---- things ---- */
pack("colors","Colores","Muchos colores son adjetivos con い: 赤い = rojo (adjetivo), 赤 = el rojo.",[
  ["赤","あか","rojo"],["青","あお","azul"],["白","しろ","blanco"],["黒","くろ","negro"],["黄色","きいろ","amarillo"],["緑","みどり","verde"],
  ["茶色","ちゃいろ","marrón"],["ピンク","ぴんく","rosa"],["紫","むらさき","morado"],["オレンジ","おれんじ","naranja"],["灰色","はいいろ","gris"],["色","いろ","color"]],"sustantivo");
pack("body","El cuerpo","",[
  ["体","からだ","cuerpo"],["頭","あたま","cabeza"],["顔","かお","cara"],["目","め","ojo"],["耳","みみ","oreja"],["鼻","はな","nariz"],["口","くち","boca"],
  ["歯","は","diente"],["首","くび","cuello"],["手","て","mano"],["足","あし","pie; pierna"],["お腹","おなか","tripa"],["背中","せなか","espalda"],["髪","かみ","pelo"]],"sustantivo");
pack("food","Comida y bebida","",[
  ["ご飯","ごはん","arroz; comida"],["パン","ぱん","pan"],["肉","にく","carne"],["魚","さかな","pescado"],["野菜","やさい","verdura"],["果物","くだもの","fruta"],
  ["卵","たまご","huevo"],["水","みず","agua"],["お茶","おちゃ","té"],["コーヒー","こーひー","café"],["牛乳","ぎゅうにゅう","leche"],["お酒","おさけ","alcohol; sake"],
  ["朝ご飯","あさごはん","desayuno"],["昼ご飯","ひるごはん","comida (mediodía)"],["晩ご飯","ばんごはん","cena"]],"sustantivo");
pack("animals","Animales","",[
  ["動物","どうぶつ","animal"],["犬","いぬ","perro"],["猫","ねこ","gato"],["鳥","とり","pájaro"],["魚","さかな","pez"],["馬","うま","caballo"],["牛","うし","vaca"],
  ["豚","ぶた","cerdo"],["うさぎ","うさぎ","conejo"],["熊","くま","oso"],["猿","さる","mono"],["虫","むし","insecto"]],"sustantivo");
pack("places","Lugares de la ciudad","",[
  ["駅","えき","estación"],["学校","がっこう","escuela"],["病院","びょういん","hospital"],["銀行","ぎんこう","banco"],["郵便局","ゆうびんきょく","correos"],
  ["図書館","としょかん","biblioteca"],["公園","こうえん","parque"],["店","みせ","tienda"],["レストラン","れすとらん","restaurante"],["コンビニ","こんびに","tienda 24 h"],
  ["スーパー","すーぱー","supermercado"],["ホテル","ほてる","hotel"],["空港","くうこう","aeropuerto"],["会社","かいしゃ","empresa"],["家","いえ","casa"]],"sustantivo");
pack("pos","Posiciones","Se usan con の: 机の上 = encima de la mesa.",[
  ["上","うえ","encima"],["下","した","debajo"],["前","まえ","delante"],["後ろ","うしろ","detrás"],["右","みぎ","derecha"],["左","ひだり","izquierda"],
  ["中","なか","dentro"],["外","そと","fuera"],["隣","となり","al lado"],["近く","ちかく","cerca"],["間","あいだ","entre"],["横","よこ","al lado; horizontal"]],"sustantivo");
pack("transport","Transporte","",[
  ["電車","でんしゃ","tren"],["地下鉄","ちかてつ","metro"],["バス","ばす","autobús"],["車","くるま","coche"],["タクシー","たくしー","taxi"],["自転車","じてんしゃ","bicicleta"],
  ["飛行機","ひこうき","avión"],["新幹線","しんかんせん","tren bala"],["船","ふね","barco"],["切符","きっぷ","billete"]],"sustantivo");

/* ---- adjectives & verbs ---- */
pack("opp","Adjetivos opuestos","Se aprenden mejor por parejas.",[
  ["大きい","おおきい","grande"],["小さい","ちいさい","pequeño"],["高い","たかい","caro; alto"],["安い","やすい","barato"],["低い","ひくい","bajo"],
  ["新しい","あたらしい","nuevo"],["古い","ふるい","viejo (cosas)"],["長い","ながい","largo"],["短い","みじかい","corto"],["多い","おおい","mucho"],["少ない","すくない","poco"],
  ["いい","いい","bueno"],["悪い","わるい","malo"],["早い","はやい","temprano"],["遅い","おそい","tarde; lento"],["熱い","あつい","caliente"],["冷たい","つめたい","frío (al tacto)"],
  ["難しい","むずかしい","difícil"],["易しい","やさしい","fácil"],["近い","ちかい","cerca"],["遠い","とおい","lejos"],["忙しい","いそがしい","ocupado"],["暇","ひま","libre, sin nada que hacer"]],"adjetivo");
pack("feel","Sentimientos y estados","",[
  ["嬉しい","うれしい","contento"],["楽しい","たのしい","divertido"],["悲しい","かなしい","triste"],["寂しい","さびしい","solo, que echa de menos"],
  ["怖い","こわい","que da miedo"],["眠い","ねむい","con sueño"],["痛い","いたい","que duele"],["疲れた","つかれた","cansado"],["好き","すき","que gusta"],
  ["嫌い","きらい","que no gusta"],["元気","げんき","con energía, bien"],["大丈夫","だいじょうぶ","bien, no pasa nada"]],"adjetivo");
pack("move","Verbos de movimiento","",[
  ["行く","いく","ir"],["来る","くる","venir"],["帰る","かえる","volver (a casa)"],["歩く","あるく","andar"],["走る","はしる","correr"],["乗る","のる","subir (a un vehículo)"],
  ["降りる","おりる","bajar (de un vehículo)"],["入る","はいる","entrar"],["出る","でる","salir"],["着く","つく","llegar"],["出かける","でかける","salir (de casa)"]],"verbo");
pack("daily","Verbos de cada día","",[
  ["起きる","おきる","levantarse"],["寝る","ねる","dormir"],["食べる","たべる","comer"],["飲む","のむ","beber"],["見る","みる","ver"],["聞く","きく","escuchar; preguntar"],
  ["読む","よむ","leer"],["書く","かく","escribir"],["話す","はなす","hablar"],["買う","かう","comprar"],["勉強する","べんきょうする","estudiar"],["働く","はたらく","trabajar"],
  ["作る","つくる","hacer, cocinar"],["使う","つかう","usar"],["待つ","まつ","esperar"],["休む","やすむ","descansar"]],"verbo");
pack("house","En casa","",[
  ["部屋","へや","habitación"],["台所","だいどころ","cocina"],["トイレ","といれ","baño"],["お風呂","おふろ","bañera; baño"],["窓","まど","ventana"],["ドア","どあ","puerta"],
  ["机","つくえ","mesa, escritorio"],["椅子","いす","silla"],["ベッド","べっど","cama"],["テレビ","てれび","tele"],["冷蔵庫","れいぞうこ","nevera"],["鍵","かぎ","llave"]],"sustantivo");

window.PACKS=P;
const nj=s=>String(s||"").replace(/[\s〜～]/g,"");
const isDigits=s=>/^[0-9０-９]+$/.test(String(s||"").trim());
/* packs containing this word (by writing, reading, or a number written in digits) */
window.packsFor=function(w){
  if(!w)return [];const a=nj(w.jp),k=nj(w.kana);
  const dig=isDigits(w.jp)?String(+String(w.jp).replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248))):null;
  return P.filter(p=>p.items.some(it=>nj(it.jp)===a||(k&&nj(it.kana)===k&&!/^[ぁ-ん]{1,2}$/.test(k))||(dig&&it.es===dig)));
};
})();
