// Grafiche per gli store: sfondo rosso Roma+, titolo, schermata vera dell'app.
const { chromium } = require("playwright"); const fs = require("fs");
const R = "/home/claude/curvaroma/";
const b64 = f => fs.readFileSync(f).toString("base64");
const font = f => `data:font/woff2;base64,${b64(R + f)}`;
const TESTI = {
  "1-pagelle": ["Dai i voti alla Roma", "Le pagelle dei tifosi dopo ogni partita"],
  "2-voto-tifosi": ["Il voto dei tifosi", "Scopri chi è il migliore per i romanisti"],
  "3-vigilia": ["Indovina il risultato", "Pronostico e classifica prima di ogni gara"],
  "4-analisi": ["Analisi da tifosi", "Numeri e punti di vista su ogni partita"],
  "5-biglietti": ["Biglietti tra tifosi", "Una bacheca di annunci, senza pagamenti"]
};
const pagina = (W, H, shot, [t, s], ipad) => {
  const u = ipad ? W : Math.min(W, H / 2.17), pad = Math.round(W * 0.07), top = Math.round(ipad ? H * 0.15 : H * 0.045 + u * 0.31);
  const shotW = Math.round(ipad ? W - pad * 2 * 1.2 : Math.min(W - pad * 2 * 1.35, u * 0.81)), r = Math.round(W * (ipad ? 0.025 : 0.05));
  return `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:T;font-weight:900;src:url(${font("fonts/titoli-900.woff2")})}
@font-face{font-family:C;font-weight:600;src:url(${font("fonts/testo-600.woff2")})}
*{box-sizing:border-box;margin:0}
body{width:${W}px;height:${H}px;overflow:hidden;background:radial-gradient(circle at 50% 0,#A52A3B 0,#8E1F2F 38%,#5F0E24 100%);font-family:C,Arial,sans-serif;color:#FFF6F0;position:relative}
.t{position:absolute;left:${pad}px;right:${pad}px;top:${Math.round(H * 0.045)}px;text-align:center}
h1{font:900 ${Math.round(u * (ipad ? 0.072 : 0.105))}px/0.95 T;color:#F0BC42;text-transform:uppercase;letter-spacing:.5px}
p{margin-top:${Math.round(W * 0.025)}px;font-size:${Math.round(u * (ipad ? 0.03 : 0.042))}px;line-height:1.25}
.s{position:absolute;left:50%;transform:translateX(-50%);top:${top}px;width:${shotW}px;border-radius:${r}px;overflow:hidden;box-shadow:0 ${Math.round(W*.02)}px ${Math.round(W*.06)}px rgba(0,0,0,.55);border:${Math.max(4, Math.round(W * 0.008))}px solid #2B0A15}
.s img{display:block;width:100%}
</style><div class="t"><h1>${t}</h1><p>${s}</p></div><div class="s"><img src="data:image/png;base64,${b64(shot)}"></div>`;
};
(async () => {
  const b = await chromium.launch();
  const lavori = JSON.parse(process.argv[2]);
  for (const [W, H, dir, out, ipad] of lavori) {
    fs.mkdirSync(out, { recursive: true });
    const pg = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    for (const k of Object.keys(TESTI)) {
      await pg.setContent(pagina(W, H, `${dir}/${k}.png`, TESTI[k], ipad)); await pg.waitForTimeout(300);
      await pg.screenshot({ path: `${out}/${k}.png` });
    }
    await pg.close();
  }
  await b.close();
})();
