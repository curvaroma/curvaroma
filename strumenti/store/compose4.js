// Screenshot verticali con mockup: pieghevole, iPad, iPhone 6,3".
const { chromium } = require("playwright"); const fs = require("fs");
const R = "/home/claude/curvaroma/";
const b64 = f => fs.readFileSync(f).toString("base64"), font = f => `data:font/woff2;base64,${b64(R + f)}`, img = f => `data:image/png;base64,${b64(f)}`;
const TESTI = {
  "1-pagelle": ["Dai i voti alla Roma", "Le pagelle dei tifosi dopo ogni partita"],
  "2-voto-tifosi": ["Il voto dei tifosi", "Scopri chi è il migliore per i romanisti"],
  "3-vigilia": ["Indovina il risultato", "Pronostico e classifica prima di ogni gara"],
  "4-analisi": ["Analisi da tifosi", "Numeri e punti di vista su ogni partita"],
  "5-biglietti": ["Biglietti tra tifosi", "Una bacheca di annunci, senza pagamenti"]
};
const css = `@font-face{font-family:T;font-weight:900;src:url(${font("fonts/titoli-900.woff2")})}
@font-face{font-family:C;font-weight:600;src:url(${font("fonts/testo-600.woff2")})}
*{box-sizing:border-box;margin:0}body{overflow:hidden;position:relative;font-family:C,Arial,sans-serif;color:#FFF6F0;background:radial-gradient(circle at 50% 0,#A52A3B 0,#8E1F2F 40%,#5F0E24 100%)}
h1{font-family:T;font-weight:900;color:#F0BC42;text-transform:uppercase;line-height:.95;letter-spacing:.5px}.dev{position:absolute;filter:drop-shadow(0 40px 60px rgba(0,0,0,.5))}`;
// iPad disegnato come il mockup: cornice nera sottile, bordo grigio scuro, fotocamera in alto, tasti in alto a sinistra
const ipad = (w, shot) => { const b = w * 0.032, rim = w * 0.006, r = w * 0.055;
  return `<div class="dev" style="width:${w}px;padding:${rim}px;border-radius:${r}px;background:linear-gradient(135deg,#55575c,#2a2b2e 40%,#3c3d41);">
<div style="position:absolute;left:${-w * .006}px;top:${w * .06}px;width:${w * .006}px;height:${w * .05}px;border-radius:3px;background:#3a3b3f"></div>
<div style="position:absolute;left:${-w * .006}px;top:${w * .125}px;width:${w * .006}px;height:${w * .05}px;border-radius:3px;background:#3a3b3f"></div>
<div style="padding:${b}px;border-radius:${r - rim}px;background:#050505;position:relative"><div style="position:absolute;left:50%;top:${b * .38}px;width:${b * .24}px;height:${b * .24}px;margin-left:${-b * .12}px;border-radius:50%;background:#1d2633"></div>
<img src="${img(shot)}" style="display:block;width:100%;border-radius:${r - rim - b * .7}px"></div></div>`; };
const pagina = (W, H, k, tipo) => {
  const [t, s] = TESTI[k], u = W, fs1 = Math.round(u * (tipo === "ipad" ? 0.072 : 0.1)), fs2 = Math.round(u * (tipo === "ipad" ? 0.03 : 0.04));
  const top = Math.round(H * 0.045 + fs1 * 1.25 + fs2 * 2.2), disp = H - top - H * 0.03;
  let dev;
  if (tipo === "ipad") { const w = Math.min(W * 0.84, disp / 1.355); dev = `<div style="position:absolute;left:${(W - w) / 2}px;top:${top}px">${ipad(w, `${__dirname}/ipad-m/${k}.png`)}</div>`; }
  else { const asp = tipo === "fold" ? 1710 / 2443 : 0.492, file = tipo === "fold" ? `${__dirname}/pieghevoli/${k}.png` : `${__dirname}/telefoni/${k}.png`;
    const w = Math.min(W * (tipo === "fold" ? 0.84 : 0.86), disp * asp); dev = `<img class="dev" style="width:${w}px;left:${(W - w) / 2}px;top:${top}px" src="${img(file)}">`; }
  return `<!doctype html><meta charset="utf-8"><style>${css}body{width:${W}px;height:${H}px}.t{position:absolute;left:5%;right:5%;top:${Math.round(H * 0.045)}px;text-align:center}
h1{font-size:${fs1}px;white-space:nowrap}p{margin-top:${Math.round(fs2 * .6)}px;font-size:${fs2}px;line-height:1.25}</style><div class="t"><h1>${t}</h1><p>${s}</p></div>${dev}`;
};
(async () => {
  const b = await chromium.launch(), out = __dirname + "/store3/";
  for (const [W, H, dir, tipo] of [[2007, 2853, "apple-pieghevole-2007x2853", "fold"], [1398, 2034, "apple-pieghevole-1398x2034", "fold"], [2064, 2752, "apple-ipad-13-2064x2752", "ipad"], [2048, 2732, "apple-ipad-12.9-2048x2732", "ipad"], [1206, 2622, "apple-iphone-6.3-1206x2622", "iphone"], [1179, 2556, "apple-iphone-6.1-1179x2556", "iphone"]]) {
    fs.mkdirSync(out + dir, { recursive: true });
    const pg = await b.newPage({ viewport: { width: W, height: H } });
    for (const k of Object.keys(TESTI)) { await pg.setContent(pagina(W, H, k, tipo)); await pg.waitForTimeout(300); await pg.screenshot({ path: `${out}${dir}/${k}.png` }); }
    await pg.close();
  }
  await b.close();
})();
