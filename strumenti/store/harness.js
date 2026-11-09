// Apre l'app (app/www) in Chromium con i dati veri di Roma+ salvati in contenuti.json, e fotografa le schermate.
const { chromium } = require("playwright"); const fs = require("fs"); const path = require("path");
const R = "/home/claude/curvaroma/", W = R + "app/www/";
const C = JSON.parse(fs.readFileSync(__dirname + "/contenuti.json", "utf8"));
const P = JSON.parse(fs.readFileSync(__dirname + "/pagelle.json", "utf8"));
const medie = [["Mora",8],["Hermoso",8],["Soulé",7],["Molina",7],["Malen",7],["Koné",7],["Cristante",7],["Wesley",6],["Vasquez",6],["Pisilli",6],["Ndicka",6],["Koulierakis",6],["Ghilardi",6],["De Roon",6],["Castro",6],["Balerdi",6]].map(([n,m])=>({n,m}));
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
      if (u.pathname === "/api/stato") return r.fulfill({ json: { schede: 0, medie, pronostico: null, formazioni: { n: 0, conti: {} }, miei: { pagella: null, pronostico: null, formazione: null }, annunci: [], voto: { aperte: true, chiusura: "2026-11-09T23:00:00.000Z" } } });
      if (u.pathname.startsWith("/api/")) return r.fulfill({ json: {} });
      try { return r.fulfill({ body: fs.readFileSync(R + u.pathname.slice(1)) }); } catch { return r.fulfill({ status: 404, body: "" }); }
    }
    return r.abort();
  });
  await pg.goto("https://app.local/"); await pg.waitForTimeout(3500);
  await scatta(pg, "pagelle", out + "/1-pagelle.png", async pg => { await pg.evaluate(() => { const b = [...document.querySelectorAll(".voti button")]; const v = { 0: 7, 1: 6, 2: 6, 3: 8 }; document.querySelectorAll(".gioc").forEach((g, i) => { if (v[i]) g.querySelectorAll(".voti button")[v[i] - 1].click(); }); }); });
  await scatta(pg, "pagelle", out + "/2-voto-tifosi.png", async pg => { await pg.evaluate(() => { const h = [...document.querySelectorAll("h2")].find(x => /voto dei tifosi/i.test(x.textContent)); if (h) h.closest(".card").scrollIntoView({ block: "start" }); }); await pg.waitForTimeout(300); });
  await scatta(pg, "vigilia", out + "/3-vigilia.png");
  await scatta(pg, "analisi", out + "/4-analisi.png", async pg => { await pg.evaluate(() => document.querySelector(".sez .card, .sez [class*=art]")?.click()); await pg.waitForTimeout(700); });
  await scatta(pg, "biglietti", out + "/5-biglietti.png");
  console.log("errori:", errs);
  await b.close();
})();
