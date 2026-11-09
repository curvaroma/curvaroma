// Grafiche per gli store con il mockup iPhone di Andrea.
const { chromium } = require("playwright"); const fs = require("fs");
const R = "/home/claude/curvaroma/", T = __dirname + "/telefoni/";
const b64 = f => fs.readFileSync(f).toString("base64"), font = f => `data:font/woff2;base64,${b64(R + f)}`;
const img = f => `data:image/png;base64,${b64(f)}`;
const TESTI = {
  "1-pagelle": ["Dai i voti alla Roma", "Le pagelle dei tifosi dopo ogni partita"],
  "2-voto-tifosi": ["Il voto dei tifosi", "Scopri chi è il migliore per i romanisti"],
  "3-vigilia": ["Indovina il risultato", "Pronostico e classifica prima di ogni gara"],
  "4-analisi": ["Analisi da tifosi", "Numeri e punti di vista su ogni partita"],
  "5-biglietti": ["Biglietti tra tifosi", "Una bacheca di annunci, senza pagamenti"]
};
const base = `@font-face{font-family:T;font-weight:900;src:url(${font("fonts/titoli-900.woff2")})}
@font-face{font-family:C;font-weight:600;src:url(${font("fonts/testo-600.woff2")})}
*{box-sizing:border-box;margin:0}body{overflow:hidden;background:radial-gradient(circle at 50% 0,#A52A3B 0,#8E1F2F 40%,#5F0E24 100%);font-family:C,Arial,sans-serif;color:#FFF6F0;position:relative}
h1{font-family:T;font-weight:900;color:#F0BC42;text-transform:uppercase;line-height:.95;letter-spacing:.5px}.tel{position:absolute;filter:drop-shadow(0 30px 50px rgba(0,0,0,.5))}`;
const verticale = (W, H, k) => {
  const u = Math.min(W, H / 2.17), top = Math.round(H * 0.045 + u * 0.31), pw = Math.round(Math.min(u * 0.86, (H - top - H * 0.015) * 0.492));
  const [t, s] = TESTI[k];
  return `<!doctype html><meta charset="utf-8"><style>${base}body{width:${W}px;height:${H}px}
.t{position:absolute;left:5%;right:5%;top:${Math.round(H * 0.045)}px;text-align:center}h1{font-size:${Math.round(u * 0.105)}px}p{margin-top:${Math.round(u * 0.025)}px;font-size:${Math.round(u * 0.042)}px;line-height:1.25}
.tel{width:${pw}px;left:${Math.round((W - pw) / 2)}px;top:${top}px}</style><div class="t"><h1>${t}</h1><p>${s}</p></div><img class="tel" src="${img(T + k + ".png")}">`;
};
const orizzontale = (W, H) => {
  const stretto = W / H < 1.7, ph = Math.round(H * (stretto ? 0.8 : 0.86)), pw = Math.round(ph * 0.492), gap = Math.round(pw * (stretto ? 0.58 : 0.78)), right = Math.round(W * 0.04), top = Math.round((H - ph) / 2 + H * 0.03);
  const tel = ["4-analisi", "3-vigilia", "1-pagelle"].map((k, i) => `<img class="tel" style="width:${pw}px;top:${top + (i === 2 ? -Math.round(H * .03) : Math.round(H * .02))}px;left:${W - right - pw - (2 - i) * gap}px;z-index:${i}" src="${img(T + k + ".png")}">`).join("");
  const tw = W - right - pw - 2 * gap - W * 0.07;
  return `<!doctype html><meta charset="utf-8"><style>${base}body{width:${W}px;height:${H}px}
.t{position:absolute;left:${Math.round(W * 0.06)}px;width:${Math.round(tw)}px;top:50%;transform:translateY(-50%)}
.t img{width:${Math.round(Math.min(tw, W * 0.33))}px;display:block;margin-bottom:${Math.round(H * 0.05)}px}h1{font-size:${Math.round(H * 0.085)}px}p{margin-top:${Math.round(H * 0.03)}px;font-size:${Math.round(H * 0.036)}px;line-height:1.3;max-width:95%}</style>
<div class="t"><img src="${img(R + "img/logo-chiaro.png")}"><h1>L'app dei tifosi della Roma</h1><p>Pagelle dei tifosi, pronostici, notizie e analisi dopo ogni partita.</p></div>${tel}`;
};
const grafica = () => `<!doctype html><meta charset="utf-8"><style>${base}body{width:1024px;height:500px;background:radial-gradient(circle at 30% 20%,#A52A3B 0,#8E1F2F 45%,#5F0E24 100%)}
.l{position:absolute;left:64px;top:150px;width:470px}.l img{width:100%;display:block}p{position:absolute;left:66px;top:262px;width:470px;font-size:30px;line-height:1.25}
.tel{width:290px;right:96px;top:34px;transform:rotate(5deg)}</style><div class="l"><img src="${img(R + "img/logo-chiaro.png")}"></div><p>Pagelle, notizie e pronostici: l'app dei tifosi della Roma.</p><img class="tel" src="${img(T + "1-pagelle.png")}">`;
(async () => {
  const b = await chromium.launch(), out = __dirname + "/store2/";
  const fai = async (W, H, html, file) => { const pg = await b.newPage({ viewport: { width: W, height: H } }); await pg.setContent(html); await pg.waitForTimeout(400); fs.mkdirSync(require("path").dirname(file), { recursive: true }); await pg.screenshot({ path: file }); await pg.close(); };
  for (const [W, H, dir] of [[1320, 2868, "apple-iphone-6.9"], [1284, 2778, "apple-iphone-6.5"], [1080, 1920, "google-telefono"]])
    for (const k of Object.keys(TESTI)) await fai(W, H, verticale(W, H, k), `${out}${dir}/${k}.png`);
  for (const [W, H] of [[5244, 2950], [3840, 2560], [1920, 1280]]) await fai(W, H, orizzontale(W, H), `${out}apple-orizzontali/roma-plus-${W}x${H}.png`);
  await fai(1024, 500, grafica(), `${out}google-grafica-1024x500.png`);
  await b.close();
})();
