// Intestazione della pagina App Store: un solo concetto, soggetto al centro, testo breve.
const { chromium } = require("playwright"); const fs = require("fs");
const R = "/home/claude/curvaroma/", T = __dirname + "/telefoni/";
const b64 = f => fs.readFileSync(f).toString("base64"), font = f => `data:font/woff2;base64,${b64(R + f)}`, img = f => `data:image/png;base64,${b64(f)}`;
const pagina = (W, H) => {
  const largo = W / H > 2, ph = Math.round(H * (largo ? 0.92 : 0.74)), pw = Math.round(ph * 0.492);
  const fs1 = Math.round(H * (largo ? 0.13 : 0.105)), top = Math.round(H * (largo ? 0.36 : 0.30)), cx = W / 2;
  const tel = (k, dx, rot, dy, z, sc) => `<img class="tel" style="width:${pw * sc}px;left:${cx - pw * sc / 2 + dx}px;top:${top + dy}px;transform:rotate(${rot}deg);z-index:${z}" src="${img(T + k + ".png")}">`;
  return `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:T;font-weight:900;src:url(${font("fonts/titoli-900.woff2")})}
*{margin:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;overflow:hidden;position:relative;background:#5F0E24}
.fondo{position:absolute;inset:0;background:
 radial-gradient(ellipse 60% 55% at 50% 62%,rgba(240,188,66,.34) 0,rgba(240,188,66,.08) 45%,rgba(240,188,66,0) 70%),
 radial-gradient(ellipse 120% 90% at 50% 20%,#A52A3B 0,#8E1F2F 45%,#4A0A1C 100%)}
.raggio{position:absolute;width:${W * 0.09}px;height:${H * 3}px;top:${-H}px;background:linear-gradient(180deg,rgba(240,188,66,0),rgba(240,188,66,.55) 50%,rgba(240,188,66,0));filter:blur(${W * .002}px)}
.fascia{position:absolute;height:${H * .05}px;width:${W * .5}px;background:linear-gradient(90deg,#F0BC42,#E39A1E);box-shadow:0 0 ${W * .01}px rgba(240,188,66,.5)}
h1{position:absolute;left:0;right:0;top:${Math.round(H * (largo ? 0.07 : 0.085))}px;text-align:center;font:900 ${fs1}px/1 T;color:#F0BC42;text-transform:uppercase;letter-spacing:${fs1 * .01}px;text-shadow:0 ${fs1 * .04}px ${fs1 * .12}px rgba(0,0,0,.35)}
h1 b{color:#FFF6F0;font-weight:900}
.tel{position:absolute;filter:drop-shadow(0 ${H * .03}px ${H * .05}px rgba(0,0,0,.55))}
</style><div class="fondo"></div>
<div class="fascia" style="left:${-W * .12}px;top:${H * .08}px;transform:rotate(-24deg)"></div>
<div class="fascia" style="right:${-W * .12}px;bottom:${H * .1}px;transform:rotate(-24deg)"></div>
<div class="raggio" style="left:${W * .2}px;transform:rotate(28deg);opacity:.35"></div><div class="raggio" style="right:${W * .2}px;transform:rotate(-28deg);opacity:.35"></div>
<h1>Il voto è <b>dei tifosi</b></h1>
${tel("4-analisi", -pw * 0.82, -9, ph * 0.08, 1, 0.9)}${tel("3-vigilia", pw * 0.82, 9, ph * 0.08, 1, 0.9)}${tel("1-pagelle", 0, 0, 0, 2, 1)}`;
};
(async () => {
  const b = await chromium.launch(), out = __dirname + "/store3/apple-intestazione/"; fs.mkdirSync(out, { recursive: true });
  for (const [W, H] of [[5244, 2950], [3840, 1646]]) { const pg = await b.newPage({ viewport: { width: W, height: H } }); await pg.setContent(pagina(W, H)); await pg.waitForTimeout(500); await pg.screenshot({ path: `${out}intestazione-${W}x${H}.png` }); await pg.close(); }
  await b.close();
})();
