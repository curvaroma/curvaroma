// Crea la grafica Instagram 1080x1350 di Roma+.
// Uso: node strumenti/post.js strumenti/dati.json social/AAAA-MM-GG.jpg
// Senza "stile": foto in alto e testo sotto (o tre giocatori con "giocatori"). Con "stile": vedi MODELLI più sotto e gli esempi in strumenti/modelli/.
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
.alto img{width:520px;display:block}
.nome{font:900 84px/1 T;letter-spacing:1px;text-transform:uppercase;transform:translateY(5px)}
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
<div class="alto"><img src="${immagine("img/logo-chiaro.png")}" alt=""></div>
${dati.giocatori.map((f, i) => `<img class="g g${i}" src="${immagine(f)}" alt="">`).sort((a, b) => a.includes("g g1") - b.includes("g g1")).join("")}
<div class="pann"><h1>${righe.map(esc).join("<br>")}</h1><p>${esc(dati.testo)}</p>
<div class="piede"><div class="sito">roma-plus.it</div></div></div></html>` : null;

// Altri modelli: campo "stile" = numero, confronto, domanda, lista, risultato, storia. Esempi in strumenti/modelli/.
const testa = (fondo) => `<!doctype html><html lang="it"><meta charset="utf-8"><style>
@font-face{font-family:T;font-weight:900;src:url(${font("fonts/titoli-900.woff2")})}
@font-face{font-family:T8;font-weight:800;src:url(${font("fonts/titoli-800.woff2")})}
@font-face{font-family:C;font-weight:600;src:url(${font("fonts/testo-600.woff2")})}
@font-face{font-family:C7;font-weight:700;src:url(${font("fonts/testo-700.woff2")})}
*{box-sizing:border-box}
body{margin:0;width:1080px;height:1350px;position:relative;overflow:hidden;background:${fondo};color:#FFF6F0;font-family:C,Arial,sans-serif}
.logo{position:absolute;top:56px;left:64px;width:300px}
.tag{position:absolute;top:66px;right:64px;font:900 34px/1 T;letter-spacing:2px;text-transform:uppercase;color:#2B0A15;background:#F0BC42;padding:12px 18px 10px}
.sito{position:absolute;left:64px;bottom:56px;background:#F0BC42;color:#2B0A15;font:900 46px/1 T;padding:10px 20px 12px}
.cta{position:absolute;right:64px;bottom:66px;font:700 30px/1.2 C7;color:#FFF6F0;text-align:right;max-width:560px}
.gialla{color:#F0BC42}
</style>`;
const logo = () => `<img class="logo" src="${immagine("img/logo-chiaro.png")}" alt="">`;
const piede = () => `<div class="sito">roma-plus.it</div>${dati.cta ? `<div class="cta">${esc(dati.cta)}</div>` : ""}`;
const tag = () => dati.tag ? `<div class="tag">${esc(dati.tag)}</div>` : "";
const titoloGrande = (max = 120, larg = 950) => { const r = [].concat(dati.titolo || []); const c = Math.min(max, Math.floor(larg / (Math.max(...r.map(x => x.length), 1) * .5))); return `<h1 style="margin:0;font:900 ${c}px/.95 T;text-transform:uppercase">${r.map(esc).join("<br>")}</h1>`; };
const MODELLI = {
  // Un numero enorme e tre dati sotto. Facoltativo un giocatore a destra.
  numero: () => `${testa("#2B0A15")}<style>
.alone{position:absolute;inset:0;background:radial-gradient(circle at 78% 46%,rgba(142,31,47,.95),rgba(43,10,21,0) 62%)}
.gio{position:absolute;right:-60px;bottom:250px;height:900px;filter:drop-shadow(0 20px 30px rgba(0,0,0,.6))}
.num{position:absolute;left:52px;top:190px;font:900 520px/.8 T;color:#F0BC42;letter-spacing:-10px}
.et{position:absolute;left:64px;top:640px;width:${dati.giocatore ? 560 : 950}px;font:900 76px/.98 T;text-transform:uppercase}
.dati{position:absolute;left:64px;right:64px;bottom:170px;display:grid;grid-template-columns:repeat(${(dati.dati || []).length || 1},1fr);gap:16px}
.dati div{background:rgba(255,246,240,.08);border-top:6px solid #F0BC42;padding:22px 22px 20px}
.dati b{display:block;font:900 92px/.9 T;color:#FFF6F0}
.dati span{font:600 28px/1.15 C;color:#F3D9DE}
</style><div class="alone"></div>${dati.giocatore ? `<img class="gio" src="${immagine(dati.giocatore)}" alt="">` : ""}${logo()}${tag()}
<div class="num">${esc(dati.numero)}</div><div class="et">${[].concat(dati.etichetta || []).map(esc).join("<br>")}</div>
<div class="dati">${(dati.dati || []).map(([v, t]) => `<div><b>${esc(v)}</b><span>${esc(t)}</span></div>`).join("")}</div>${piede()}</html>`,
  // Due squadre a confronto, una riga per statistica con barre proporzionali.
  confronto: () => { const [a, b] = dati.squadre || ["Roma", "Avversario"]; return `${testa("#5F0E24")}<style>
.tit{position:absolute;left:64px;right:64px;top:200px}
.sq{position:absolute;left:64px;right:64px;top:${200 + 60 + [].concat(dati.titolo || []).length * 110}px;display:flex;justify-content:space-between;font:900 54px/1 T;text-transform:uppercase}
.sq span:first-child{color:#F0BC42}
.righe{position:absolute;left:64px;right:64px;top:${200 + 160 + [].concat(dati.titolo || []).length * 110}px;bottom:170px;display:flex;flex-direction:column;justify-content:space-evenly}
.r{display:grid;grid-template-columns:170px 1fr 170px;gap:22px;align-items:center}
.r b{font:900 80px/1 T}.r b:last-child{text-align:right}
.r .m{display:grid;gap:8px}.r .m span{font:700 30px/1 C7;text-align:center;color:#F3D9DE;text-transform:uppercase;letter-spacing:1px}
.bar{display:flex;height:22px;gap:6px}.bar i{display:block;height:22px}.bar i:first-child{background:#F0BC42;border-radius:8px 0 0 8px}.bar i:last-child{background:#FFF6F0;border-radius:0 8px 8px 0}
</style>${logo()}${tag()}<div class="tit">${titoloGrande(110)}</div><div class="sq"><span>${esc(a)}</span><span>${esc(b)}</span></div>
<div class="righe">${(dati.righe || []).map(([t, x, y]) => { const nx = parseFloat(String(x).replace(",", ".")) || 0, ny = parseFloat(String(y).replace(",", ".")) || 0, tot = nx + ny || 1; return `<div class="r"><b class="gialla">${esc(x)}</b><div class="m"><span>${esc(t)}</span><div class="bar"><i style="flex:${nx / tot || .001}"></i><i style="flex:${ny / tot || .001}"></i></div></div><b>${esc(y)}</b></div>`; }).join("")}</div>${piede()}</html>`; },
  // Sondaggio da commenti: domanda grande e due-quattro risposte con lettera.
  domanda: () => `${testa("#F0BC42")}<style>
body{color:#2B0A15}.sito{background:#2B0A15;color:#F0BC42}.cta{color:#2B0A15}.tag{background:#8E1F2F;color:#FFF6F0}
.tit{position:absolute;left:64px;right:64px;top:200px;color:#5F0E24}
.op{position:absolute;left:64px;right:64px;bottom:180px;display:grid;gap:20px}
.op div{display:flex;align-items:center;gap:26px;background:#2B0A15;color:#FFF6F0;padding:22px 28px;font:900 58px/1 T;text-transform:uppercase}
.op b{flex:none;width:78px;height:78px;display:grid;place-items:center;background:#F0BC42;color:#2B0A15;font:900 56px/1 T}
</style><img class="logo" src="${immagine("img/logo.png")}" alt="">${tag()}<div class="tit">${titoloGrande(120)}</div>
<div class="op">${(dati.opzioni || []).map((o, i) => `<div><b>${"ABCD"[i]}</b>${esc(o)}</div>`).join("")}</div>${piede()}</html>`,
  // Classifica o pagella: nomi e valori, il primo in evidenza.
  lista: () => `${testa("#2B0A15")}<style>
.tit{position:absolute;left:64px;right:64px;top:190px}
.sub{position:absolute;left:64px;right:64px;top:${190 + 20 + [].concat(dati.titolo || []).length * 112}px;font:600 34px/1.2 C;color:#F3D9DE}
.el{position:absolute;left:64px;right:64px;bottom:170px;display:grid;gap:14px}
.el div{display:grid;grid-template-columns:64px 1fr auto;gap:22px;align-items:center;padding:16px 24px;background:rgba(255,246,240,.07);border-left:8px solid #8E1F2F}
.el div:first-child{background:#8E1F2F;border-left-color:#F0BC42}
.el i{font:900 40px/1 T;font-style:normal;color:#F3D9DE}.el span{font:900 54px/1 T;text-transform:uppercase}.el b{font:900 66px/1 T;color:#F0BC42}
</style>${logo()}${tag()}<div class="tit">${titoloGrande(110)}</div>${dati.testo ? `<div class="sub">${esc(dati.testo)}</div>` : ""}
<div class="el">${(dati.righe || []).slice(0, 8).map(([n, v], i) => `<div><i>${i + 1}</i><span>${esc(n)}</span><b>${esc(v)}</b></div>`).join("")}</div>${piede()}</html>`,
  // Risultato finale su foto: punteggio enorme e marcatori.
  risultato: () => `${testa("#2B0A15")}<style>
.f{position:absolute;inset:0;width:1080px;height:1350px;object-fit:cover;object-position:center ${Number(dati.alto ?? 30)}%}
.v{position:absolute;inset:0;background:linear-gradient(180deg,rgba(43,10,21,.55) 0,rgba(43,10,21,.1) 30%,rgba(43,10,21,.85) 62%,#2B0A15 80%)}
.sc{position:absolute;left:64px;right:64px;bottom:330px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:20px}
.sc span{font:900 64px/1 T;text-transform:uppercase}.sc span:last-child{text-align:right}
.sc b{font:900 230px/.8 T;color:#F0BC42;letter-spacing:-4px}
.mar{position:absolute;left:64px;right:64px;bottom:170px;font:600 32px/1.35 C;color:#F3D9DE}
.comp{position:absolute;left:64px;bottom:560px;font:700 30px/1 C7;letter-spacing:2px;text-transform:uppercase;color:#F0BC42}
</style><img class="f" src="${immagine(dati.foto || "img/curva.jpg")}" alt=""><div class="v"></div>${logo()}${tag()}
${dati.competizione ? `<div class="comp">${esc(dati.competizione)}</div>` : ""}<div class="sc"><span>${esc(dati.casa)}</span><b>${esc(dati.golCasa)}-${esc(dati.golOspiti)}</b><span>${esc(dati.ospiti)}</span></div>
<div class="mar">${esc(dati.testo || "")}</div>${piede()}</html>`,
  // Racconto della sezione Storia: foto virata, anno grande, titolo.
  storia: () => `${testa("#1C0A10")}<style>
.f{position:absolute;inset:0 0 auto;width:1080px;height:900px;object-fit:cover;object-position:center ${Number(dati.alto ?? 40)}%;filter:grayscale(1) sepia(.35) contrast(1.05) brightness(.8)}
.v{position:absolute;inset:0;background:linear-gradient(180deg,rgba(28,10,16,.6) 0,rgba(28,10,16,0) 25%,rgba(28,10,16,.2) 45%,#1C0A10 68%)}
.anno{position:absolute;left:56px;top:560px;font:900 250px/.8 T;color:transparent;-webkit-text-stroke:4px #F0BC42}
.tit{position:absolute;left:64px;right:64px;top:800px}
.sub{position:absolute;left:64px;right:64px;bottom:170px;font:600 34px/1.25 C;color:#F3D9DE}
</style><img class="f" src="${immagine(dati.foto || "img/stadio.jpg")}" alt=""><div class="v"></div>${logo()}${tag()}
${dati.anno ? `<div class="anno">${esc(dati.anno)}</div>` : ""}<div class="tit">${titoloGrande(96)}</div><div class="sub">${esc(dati.testo || "")}</div>${piede()}</html>`,
  // Prodotto Amazon, stile giovane: fondo a strisce diagonali, foto del prodotto su card inclinata, adesivi e titolo enorme.
  prodotto: () => `${testa("#8E1F2F")}<style>
.righe{position:absolute;inset:-200px;background:repeating-linear-gradient(-28deg,#8E1F2F 0 70px,#7A1828 70px 140px)}
.onda{position:absolute;left:-80px;right:-80px;top:780px;height:700px;background:#F0BC42;transform:rotate(-7deg)}
.card{position:absolute;left:150px;top:170px;width:780px;height:590px;background:#FFFFFF;border-radius:44px;transform:rotate(-4deg);box-shadow:0 30px 60px rgba(43,10,21,.55);display:flex;align-items:center;justify-content:center;overflow:hidden}
.card img{max-width:90%;max-height:90%;object-fit:contain;transform:rotate(4deg)}
.adesivo{position:absolute;right:70px;top:150px;width:230px;height:230px;border-radius:50%;background:#F0BC42;color:#2B0A15;display:flex;align-items:center;justify-content:center;text-align:center;font:900 46px/.92 T;text-transform:uppercase;transform:rotate(12deg);box-shadow:0 14px 30px rgba(0,0,0,.35);border:6px dashed #2B0A15}
.nastro{position:absolute;left:70px;top:735px;background:#2B0A15;color:#F0BC42;font:900 40px/1 T;letter-spacing:2px;text-transform:uppercase;padding:14px 26px 12px;transform:rotate(-7deg)}
.tit{position:absolute;left:64px;right:64px;top:885px;color:#2B0A15;transform:rotate(-7deg);transform-origin:left top}
.tit h1{margin:0;font:900 132px/.88 T;text-transform:uppercase}
.tit p{margin:18px 0 0;font:700 36px/1.2 C7;max-width:880px}
.sito{background:#2B0A15;color:#F0BC42}
.cta{color:#2B0A15}
.tag{background:#2B0A15;color:#F0BC42}
</style><div class="righe"></div><div class="onda"></div>${logo()}${tag()}
<div class="card"><img src="${immagine(dati.foto || "img/logo.png")}" alt=""></div>
${dati.adesivo ? `<div class="adesivo">${[].concat(dati.adesivo).map(esc).join("<br>")}</div>` : ""}
${dati.nastro ? `<div class="nastro">${esc(dati.nastro)}</div>` : ""}
<div class="tit"><h1>${[].concat(dati.titolo || []).map(esc).join("<br>")}</h1><p>${esc(dati.testo)}</p></div>${piede()}</html>`
};
if (dati.stile && !MODELLI[dati.stile]) throw new Error("Stile sconosciuto: " + dati.stile + ". Stili: " + Object.keys(MODELLI).join(", "));

const html = (dati.stile && MODELLI[dati.stile]()) || tridente || `<!doctype html><html lang="it"><meta charset="utf-8"><style>
@font-face{font-family:T;font-weight:900;src:url(${font("fonts/titoli-900.woff2")})}
@font-face{font-family:C;font-weight:600;src:url(${font("fonts/testo-600.woff2")})}
*{box-sizing:border-box}
body{margin:0;width:1080px;height:1350px;display:flex;flex-direction:column;background:#5F0E24;color:#FFF6F0;font-family:C,Arial,sans-serif;overflow:hidden}
.alto{height:158px;flex:none;display:flex;align-items:center;justify-content:center;gap:24px}
.alto img{width:560px;display:block}
.nome{font:900 96px/1 T;letter-spacing:1px;text-transform:uppercase;transform:translateY(5px)}
.foto{width:1080px;height:590px;flex:none;object-fit:cover;object-position:center ${Number(dati.alto ?? 60)}%;display:block}
.pann{flex:1;padding:48px 60px 44px;background:#8E1F2F;display:flex;flex-direction:column;gap:24px}
h1{margin:0;font:900 ${corpo}px/.98 T;color:#F0BC42;text-transform:uppercase}
p{margin:0;font-size:39px;line-height:1.25;font-weight:600}
.piede{margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:24px}
.sito{background:#F0BC42;color:#2B0A15;font:900 54px/1 T;padding:12px 24px 14px}
.nota{font-size:26px}
</style><div class="alto"><img src="${immagine("img/logo-chiaro.png")}" alt=""></div>
<img class="foto" src="${immagine(dati.foto || "img/tifosi.jpg")}" alt="">
<div class="pann"><h1>${righe.map(esc).join("<br>")}</h1><p>${esc(dati.testo)}</p>
<div class="piede"><div class="sito">roma-plus.it</div></div></div></html>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await p.setContent(html, { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  fs.mkdirSync(path.dirname(uscita), { recursive: true });
  await p.screenshot({ path: uscita, type: "jpeg", quality: 90 });
  await b.close();
})();
