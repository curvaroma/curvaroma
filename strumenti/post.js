// Crea la grafica Instagram 1080x1350 di Curva Roma.
// Uso: node strumenti/post.js strumenti/dati.json social/AAAA-MM-GG.jpg
// dati.json: { "titolo": ["Riga uno", "Riga due"], "testo": "Frase breve", "foto": "img/tifosi.jpg", "alto": 60 }
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const radice = path.join(__dirname, "..");
const dati = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const uscita = process.argv[3];
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const b64 = f => fs.readFileSync(path.join(radice, f)).toString("base64");
const tipo = f => ({ ".png": "png", ".webp": "webp" }[path.extname(f)] || "jpeg");
const immagine = f => `data:image/${tipo(f)};base64,${b64(f)}`;
const font = f => `data:font/woff2;base64,${b64(f)}`;
const righe = [].concat(dati.titolo || []);
const corpo = Math.min(138, Math.floor(960 / (Math.max(...righe.map(r => r.length), 1) * .5)));

// Variante con i giocatori: aggiungi "giocatori": ["sinistra.png", "centro.png", "destra.png"], scontorni trasparenti.
const tridente = dati.giocatori ? `<!doctype html><html lang="it"><meta charset="utf-8"><style>
@font-face{font-family:T;font-weight:900;src:url(${font("fonts/titoli-900.woff2")})}
@font-face{font-family:C;font-weight:600;src:url(${font("fonts/testo-600.woff2")})}
*{box-sizing:border-box}
body{margin:0;width:1080px;height:1350px;position:relative;overflow:hidden;background:#2B0A15;color:#FFF6F0;font-family:C,Arial,sans-serif}
.sfondo{position:absolute;inset:0 0 auto;width:1080px;height:1000px;object-fit:cover;filter:blur(5px) brightness(.5)}
.vel{position:absolute;inset:0;background:radial-gradient(circle at 50% 42%,rgba(240,188,66,.38),rgba(240,188,66,0) 52%),linear-gradient(180deg,rgba(43,10,21,.72) 0,rgba(43,10,21,0) 22%,rgba(95,14,36,0) 56%,#8E1F2F 74%)}
.alto{position:absolute;top:0;left:0;right:0;height:150px;display:flex;align-items:center;justify-content:center;gap:22px}
.alto img{width:190px;display:block}
.nome{font:900 84px/1 T;letter-spacing:1px;text-transform:uppercase}
.g{position:absolute;display:block;filter:drop-shadow(0 18px 26px rgba(0,0,0,.55))}
.g0{height:740px;left:-36px;top:232px}
.g2{height:740px;right:-36px;top:232px}
.g1{height:800px;left:50%;top:176px;transform:translateX(-50%)}
.pann{position:absolute;left:0;right:0;bottom:0;height:540px;padding:0 60px 44px;display:flex;flex-direction:column;justify-content:flex-end;gap:18px;background:linear-gradient(180deg,rgba(142,31,47,0) 0,rgba(142,31,47,.82) 16%,#8E1F2F 28%)}
h1{margin:0;font:900 ${corpo}px/.98 T;color:#F0BC42;text-transform:uppercase}
p{margin:0;font-size:37px;line-height:1.22;font-weight:600}
.piede{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-top:6px}
.sito{background:#F0BC42;color:#2B0A15;font:900 50px/1 T;padding:11px 22px 13px}
.nota{font-size:26px}
</style><img class="sfondo" src="${immagine(dati.foto || "img/curva.jpg")}" alt=""><div class="vel"></div>
<div class="alto"><img src="${immagine("img/logo-chiaro.png")}" alt=""><div class="nome">Curva Roma</div></div>
${dati.giocatori.map((f, i) => `<img class="g g${i}" src="${immagine(f)}" alt="">`).sort((a, b) => a.includes("g g1") - b.includes("g g1")).join("")}
<div class="pann"><h1>${righe.map(esc).join("<br>")}</h1><p>${esc(dati.testo)}</p>
<div class="piede"><div class="sito">curvaroma.it</div></div></div></html>` : null;

const html = tridente || `<!doctype html><html lang="it"><meta charset="utf-8"><style>
@font-face{font-family:T;font-weight:900;src:url(${font("fonts/titoli-900.woff2")})}
@font-face{font-family:C;font-weight:600;src:url(${font("fonts/testo-600.woff2")})}
*{box-sizing:border-box}
body{margin:0;width:1080px;height:1350px;display:flex;flex-direction:column;background:#5F0E24;color:#FFF6F0;font-family:C,Arial,sans-serif;overflow:hidden}
.alto{height:158px;flex:none;display:flex;align-items:center;justify-content:center;gap:24px}
.alto img{width:216px;display:block}
.nome{font:900 96px/1 T;letter-spacing:1px;text-transform:uppercase}
.foto{width:1080px;height:590px;flex:none;object-fit:cover;object-position:center ${Number(dati.alto ?? 60)}%;display:block}
.pann{flex:1;padding:48px 60px 44px;background:#8E1F2F;display:flex;flex-direction:column;gap:24px}
h1{margin:0;font:900 ${corpo}px/.98 T;color:#F0BC42;text-transform:uppercase}
p{margin:0;font-size:39px;line-height:1.25;font-weight:600}
.piede{margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:24px}
.sito{background:#F0BC42;color:#2B0A15;font:900 54px/1 T;padding:12px 24px 14px}
.nota{font-size:26px}
</style><div class="alto"><img src="${immagine("img/logo-chiaro.png")}" alt=""><div class="nome">Curva Roma</div></div>
<img class="foto" src="${immagine(dati.foto || "img/tifosi.jpg")}" alt="">
<div class="pann"><h1>${righe.map(esc).join("<br>")}</h1><p>${esc(dati.testo)}</p>
<div class="piede"><div class="sito">curvaroma.it</div></div></div></html>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await p.setContent(html, { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  fs.mkdirSync(path.dirname(uscita), { recursive: true });
  await p.screenshot({ path: uscita, type: "jpeg", quality: 90 });
  await b.close();
})();
