// Apre l'app (app/www) in Chromium con i dati veri di Roma+ salvati in contenuti.json, e fotografa le schermate.
const { chromium } = require("playwright"); const fs = require("fs"); const path = require("path");
const R = "/home/claude/curvaroma/", W = R + "app/www/";
const C = JSON.parse(fs.readFileSync(__dirname + "/contenuti.json", "utf8"));
const P = JSON.parse(fs.readFileSync(__dirname + "/pagelle.json", "utf8"));
const medie = [["Mora",8],["Hermoso",8],["Soulé",7],["Molina",7],["Malen",7],["Koné",7],["Cristante",7],["Wesley",6],["Vasquez",6],["Pisilli",6],["Ndicka",6],["Koulierakis",6],["Ghilardi",6],["De Roon",6],["Castro",6],["Balerdi",6]].map(([n,m])=>({n,m}));
function barraStato(m) {
  const alto = { iphone: 62, fold: 44, ipad: 34 }[m], dx = { iphone: 34, fold: 92, ipad: 26 }[m], sx = { iphone: 44, fold: 60, ipad: 26 }[m];
  return `.testa{padding-top:${alto}px!important}.barra{padding-bottom:${m === "ipad" ? 16 : 28}px!important}
#sb{position:fixed;z-index:99;top:0;left:0;right:0;height:${alto - 6}px;display:flex;align-items:center;justify-content:space-between;padding:${m === "iphone" ? 6 : 2}px ${dx}px 0 ${sx}px;color:#fff;font:600 ${m === "ipad" ? 15 : 17}px/1 -apple-system,system-ui,sans-serif;pointer-events:none}
#sb svg{height:13px;margin-left:6px}
#hi{position:fixed;z-index:99;bottom:8px;left:50%;transform:translateX(-50%);width:140px;height:5px;border-radius:3px;background:#fff;opacity:.9}`;
}
async function scatta(pg, sez, file, prep) {
  await pg.evaluate(k => document.querySelector(`#barra [data-k="${k}"]`)?.click(), sez);
  await pg.waitForTimeout(900);
  await pg.evaluate(() => window.scrollTo(0, 0)); await pg.waitForTimeout(200);
  if (prep) await prep(pg);
  await pg.screenshot({ path: file });
}
(async () => {
  const [w, h, dsf, out] = [+process.argv[2], +process.argv[3], +process.argv[4], process.argv[5]];
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, locale: "it-IT", timezoneId: "Europe/Rome", isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  await ctx.addInitScript(() => { Date.now = (orig => () => Date.parse("2026-11-08T10:00:00Z"))(Date.now); });
  const pg = await ctx.newPage(); const errs = []; pg.on("pageerror", e => errs.push(e.message));
  await pg.route("**/*", async r => {
    const u = new URL(r.request().url());
    if (u.hostname === "app.local") { const f = W + (u.pathname === "/" ? "index.html" : u.pathname.slice(1)); try { return r.fulfill({ body: fs.readFileSync(f), contentType: f.endsWith(".html") ? "text/html" : f.endsWith(".css") ? "text/css" : f.endsWith(".js") ? "application/javascript" : undefined }); } catch { return r.fulfill({ status: 404, body: "" }); } }
    if (u.hostname === "roma-plus.it") {
      if (u.pathname === "/api/pubblico") return r.fulfill({ json: { contenuti: C, pagelle: P, prodotti: [], immagini: {}, seo: {} } });
      if (u.pathname === "/api/stato") return r.fulfill({ json: { schede: 0, medie, pronostico: null, formazioni: { n: 0, conti: {} }, miei: { pagella: null, pronostico: { casa: 0, ospiti: 2 }, formazione: null }, annunci: [], voto: { aperte: true, chiusura: "2026-11-09T23:00:00.000Z" } } });
      if (u.pathname.startsWith("/api/")) return r.fulfill({ json: {} });
      try { return r.fulfill({ body: fs.readFileSync(R + u.pathname.slice(1)) }); } catch { return r.fulfill({ status: 404, body: "" }); }
    }
    return r.abort();
  });
  await pg.goto("https://app.local/"); await pg.waitForTimeout(3500);
  const MODO = process.env.MODO || (process.env.IPHONE ? "iphone" : "");
  if (MODO) await pg.addStyleTag({ content: barraStato(MODO) }).then(() => pg.evaluate(m => {
    const ic = '<svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="#fff"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="#fff"/><rect x="10" y="3" width="3" height="9" rx="1" fill="#fff"/><rect x="15" y="0" width="3" height="12" rx="1" fill="#fff"/></svg><svg viewBox="0 0 16 12"><path d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0zM3.4 6.8a6.5 6.5 0 0 1 9.2 0l-1.5 1.5a4.4 4.4 0 0 0-6.2 0zM1.1 4.5a9.7 9.7 0 0 1 13.8 0l-1.4 1.4a7.7 7.7 0 0 0-11 0z" fill="#fff"/></svg><svg viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="#fff" opacity=".5"/><rect x="2" y="2" width="20" height="9" rx="2" fill="#fff"/><rect x="24.5" y="4.5" width="1.8" height="4" rx="1" fill="#fff" opacity=".5"/></svg>';
    const d = document.createElement("div"); d.id = "sb"; d.innerHTML = `<span>${m === "ipad" ? "9:41&nbsp;&nbsp;lun 9 nov" : "9:41"}</span><span>${ic}</span>`; document.body.append(d);
    if (m !== "ipad") { const h = document.createElement("div"); h.id = "hi"; document.body.append(h); }
  }, MODO));
  await scatta(pg, "pagelle", out + "/1-pagelle.png", async pg => { await pg.evaluate(() => { const b = [...document.querySelectorAll(".voti button")]; const v = { 0: 7, 1: 6, 2: 6, 3: 8 }; document.querySelectorAll(".gioc").forEach((g, i) => { if (v[i]) g.querySelectorAll(".voti button")[v[i] - 1].click(); }); }); });
  await scatta(pg, "pagelle", out + "/2-voto-tifosi.png", async pg => { await pg.evaluate(() => { const h = [...document.querySelectorAll("h2")].find(x => /voto dei tifosi/i.test(x.textContent)); if (h) h.closest(".card").scrollIntoView({ block: "start" }); }); await pg.waitForTimeout(300); });
  await scatta(pg, "vigilia", out + "/3-vigilia.png");
  await scatta(pg, "analisi", out + "/4-analisi.png", async pg => { await pg.evaluate(() => document.querySelector(".sez .card, .sez [class*=art]")?.click()); await pg.waitForTimeout(700); });
  await scatta(pg, "biglietti", out + "/5-biglietti.png");
  console.log("errori:", errs);
  await b.close();
})();
