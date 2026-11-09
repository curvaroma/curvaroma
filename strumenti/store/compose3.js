// Grafiche 5244x2950 per i risultati di ricerca dell'App Store: titolo a sinistra, iPhone con l'app a destra.
const { chromium } = require("playwright"); const fs = require("fs");
const R = "/home/claude/curvaroma/", T = __dirname + "/telefoni/";
const b64 = f => fs.readFileSync(f).toString("base64"), font = f => `data:font/woff2;base64,${b64(R + f)}`, img = f => `data:image/png;base64,${b64(f)}`;
const W = 5244, H = 2950;
const SCHEDE = [
  ["1-pagelle", "2-voto-tifosi", "Dai i voti<br>alla Roma", "Dopo ogni partita voti titolari ed entrati, da 1 a 10. Poi scopri la pagella dei tifosi."],
  ["3-vigilia", "1-pagelle", "Indovina<br>il risultato", "Prima di ogni gara: la presentazione della partita, il tuo pronostico e la classifica di Serie A."],
  ["4-analisi", "2-voto-tifosi", "Analisi<br>da tifosi", "Numeri e punti di vista su ogni partita della Roma, scritti da romanisti."],
  ["5-biglietti", "3-vigilia", "Biglietti<br>tra tifosi", "Una bacheca di annunci tra romanisti. Nessun pagamento in app, il biglietto passa solo dai canali ufficiali."]
];
const css = `@font-face{font-family:T;font-weight:900;src:url(${font("fonts/titoli-900.woff2")})}
@font-face{font-family:C;font-weight:600;src:url(${font("fonts/testo-600.woff2")})}
*{box-sizing:border-box;margin:0}body{width:${W}px;height:${H}px;overflow:hidden;position:relative;font-family:C,Arial,sans-serif;color:#FFF6F0;
background:radial-gradient(circle at 72% 45%,rgba(240,188,66,.22) 0,rgba(240,188,66,0) 32%),radial-gradient(circle at 20% 0,#A52A3B 0,#8E1F2F 42%,#5F0E24 100%)}
.t{position:absolute;left:330px;top:50%;transform:translateY(-50%);width:2350px}
.logo{width:980px;display:block;margin-bottom:150px}
h1{font:900 400px/.9 T;color:#F0BC42;text-transform:uppercase;letter-spacing:2px}
p{margin-top:110px;font-size:118px;line-height:1.28;max-width:2250px}
.tag{display:inline-block;margin-top:150px;padding:34px 70px 38px;border:6px solid #F0BC42;border-radius:999px;font:900 92px/1 T;color:#F0BC42;text-transform:uppercase;letter-spacing:2px}
.tel{position:absolute;filter:drop-shadow(0 60px 90px rgba(0,0,0,.55))}
.dietro{opacity:.92;filter:drop-shadow(0 50px 80px rgba(0,0,0,.5)) brightness(.82)}`;
const scheda = ([fronte, retro, titolo, testo]) => {
  const ph = Math.round(H * 0.86), pw = Math.round(ph * 0.492), left = W - 470 - pw, top = Math.round((H - ph) / 2);
  return `<!doctype html><meta charset="utf-8"><style>${css}</style>
<div class="t"><img class="logo" src="${img(R + "img/logo-chiaro.png")}"><h1>${titolo}</h1><p>${testo}</p><span class="tag">L'app dei tifosi della Roma</span></div>
<img class="tel dietro" style="width:${Math.round(pw * .9)}px;left:${left - Math.round(pw * .62)}px;top:${top + Math.round(ph * .07)}px;transform:rotate(-7deg)" src="${img(T + retro + ".png")}">
<img class="tel" style="width:${pw}px;left:${left}px;top:${top}px" src="${img(T + fronte + ".png")}">`;
};
(async () => {
  const b = await chromium.launch(), out = __dirname + "/store2/apple-risultati-ricerca/"; fs.mkdirSync(out, { recursive: true });
  let i = 1;
  for (const s of SCHEDE) { const pg = await b.newPage({ viewport: { width: W, height: H } }); await pg.setContent(scheda(s)); await pg.waitForTimeout(500); await pg.screenshot({ path: `${out}${++i}-${s[0].slice(2)}-5244x2950.png` }); await pg.close(); }
  await b.close();
})();
