// Anteprima video dell'app: registrazione vera dell'app con i dati di Roma+, poi ffmpeg.
const { chromium } = require("playwright"); const fs = require("fs");
const R = "/home/claude/curvaroma/", W = R + "app/www/";
const C = JSON.parse(fs.readFileSync(__dirname + "/contenuti.json", "utf8")), P = JSON.parse(fs.readFileSync(__dirname + "/pagelle.json", "utf8"));
const medie = [["Mora",8],["Hermoso",8],["Soulé",7],["Molina",7],["Malen",7],["Koné",7],["Cristante",7],["Wesley",6],["Vasquez",6],["Pisilli",6],["Ndicka",6],["Koulierakis",6],["Ghilardi",6],["De Roon",6],["Castro",6],["Balerdi",6]].map(([n,m])=>({n,m}));
const [vw, vh, ow, oh, modo, out] = [+process.argv[2], +process.argv[3], +process.argv[4], +process.argv[5], process.argv[6], process.argv[7]];
const harness = fs.readFileSync(__dirname + "/harness.js", "utf8"), barraStato = eval("(" + harness.match(/function barraStato[\s\S]*?\n}\n/)[0] + ")");
const attesa = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const Z = ow / vw;
  const ctx = await b.newContext({ viewport: { width: ow, height: oh }, deviceScaleFactor: 1, isMobile: modo !== "ipad", hasTouch: true, locale: "it-IT" });
  const pg = await ctx.newPage();
  await pg.route("**/*", async r => {
    const u = new URL(r.request().url());
    if (u.hostname === "app.local") { const f = W + (u.pathname === "/" ? "index.html" : u.pathname.slice(1)); try { return r.fulfill({ body: fs.readFileSync(f), contentType: f.endsWith(".html") ? "text/html" : f.endsWith(".css") ? "text/css" : f.endsWith(".js") ? "application/javascript" : undefined }); } catch { return r.fulfill({ status: 404, body: "" }); } }
    if (u.hostname === "roma-plus.it") {
      if (u.pathname === "/api/pubblico") return r.fulfill({ json: { contenuti: C, pagelle: P, prodotti: [], immagini: {}, seo: {} } });
      if (u.pathname === "/api/stato") return r.fulfill({ json: { schede: 0, medie, pronostico: null, formazioni: { n: 0, conti: {} }, miei: { pagella: null, pronostico: null, formazione: null }, annunci: [], voto: { aperte: true, chiusura: "2026-11-09T23:00:00.000Z" } } });
      if (u.pathname.startsWith("/api/archivio")) return r.fulfill({ json: { notizie: [] } });
      if (u.pathname.startsWith("/api/")) return r.fulfill({ json: { ok: true } });
      try { return r.fulfill({ body: fs.readFileSync(R + u.pathname.slice(1)) }); } catch { return r.fulfill({ status: 404, body: "" }); }
    }
    return r.abort();
  });
  await pg.addInitScript(([css, m, Z, VW, VH]) => {
    addEventListener("DOMContentLoaded", () => {
      const s = document.createElement("style"); s.textContent = css + `html{zoom:${Z}}body{height:${VH}px!important}.avvio-logo{width:min(${VW * .72}px,340px)!important}.avvio-linea{width:min(${VW * .42}px,200px)!important}.tocco{position:fixed;z-index:999;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(255,255,255,.45);pointer-events:none;animation:tocco .45s ease-out forwards}@keyframes tocco{from{transform:scale(.4);opacity:1}to{transform:scale(1.3);opacity:0}}`; document.head.append(s);
      const ic = '<svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="#fff"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="#fff"/><rect x="10" y="3" width="3" height="9" rx="1" fill="#fff"/><rect x="15" y="0" width="3" height="12" rx="1" fill="#fff"/></svg><svg viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="#fff" opacity=".5"/><rect x="2" y="2" width="20" height="9" rx="2" fill="#fff"/></svg>';
      const d = document.createElement("div"); d.id = "sb"; d.innerHTML = `<span>${m === "ipad" ? "9:41&nbsp;&nbsp;lun 9 nov" : "9:41"}</span><span>${ic}</span>`; document.body.append(d);
      if (m !== "ipad") { const h = document.createElement("div"); h.id = "hi"; document.body.append(h); }
      addEventListener("pointerdown", e => { const t = document.createElement("div"); t.className = "tocco"; t.style.left = e.clientX + "px"; t.style.top = e.clientY + "px"; document.body.append(t); setTimeout(() => t.remove(), 600); }, true);
    });
  }, [barraStato(modo), modo, Z, vw, vh]);
  const cdp = await ctx.newCDPSession(pg), fotogrammi = [], cart = out + "-frames/"; fs.rmSync(cart, { recursive: true, force: true }); fs.mkdirSync(cart, { recursive: true });
  cdp.on("Page.screencastFrame", async f => { const n = fotogrammi.length; fs.writeFileSync(`${cart}${String(n).padStart(5, "0")}.jpg`, Buffer.from(f.data, "base64")); fotogrammi.push(f.metadata.timestamp); cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {}); });
  await pg.goto("https://app.local/");
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: ow, maxHeight: oh, everyNthFrame: 1 });
  const t0 = Date.now();
  await attesa(3200);
  const tocca = async sel => { const el = await pg.$(sel); if (!el) return; await el.scrollIntoViewIfNeeded(); const bx = await el.boundingBox(); await pg.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await pg.mouse.down(); await attesa(60); await pg.mouse.up(); };
  const scorri = async (y, ms = 900) => { await pg.evaluate(([y, ms]) => new Promise(ok => { const v = document.querySelector("#vista"), a = v.scrollTop, t = performance.now(); const f = n => { const k = Math.min(1, (n - t) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; v.scrollTop = a + (y - a) * e; k < 1 ? requestAnimationFrame(f) : ok(); }; requestAnimationFrame(f); }), [y, ms]); };
  // Pagelle
  await tocca('#barra [data-k="pagelle"]'); await attesa(1100);
  for (const [i, v] of [[0, 7], [1, 6], [2, 6], [3, 8], [4, 7]]) { await tocca(`.gioc:nth-of-type(${i + 1}) .voti button:nth-child(${v})`); await attesa(380); if (i === 2) { await scorri(230, 700); await attesa(200); } }
  await scorri(99999, 1400); await attesa(500);
  await tocca(".btn"); await attesa(1300);
  // Vigilia
  await tocca('#barra [data-k="vigilia"]'); await attesa(1300);
  const passi = await pg.$$(".pass button");
  for (const k of [0, 0, 3, 3]) { const bx = await passi[k].boundingBox(); await pg.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await pg.mouse.down(); await attesa(50); await pg.mouse.up(); await attesa(420); }
  await tocca(".btn"); await attesa(1500);
  await scorri(700, 1300); await attesa(600);
  // Analisi
  await tocca('#barra [data-k="analisi"]'); await attesa(1100);
  await tocca(".art"); await attesa(1200);
  await scorri(900, 2200); await attesa(500); await scorri(1700, 1800); await attesa(700);
  // Biglietti
  await tocca('#barra [data-k="biglietti"]'); await attesa(1800);
  await tocca('#barra [data-k="pagelle"]'); await attesa(1500);
  console.log("durata", (Date.now() - t0) / 1000);
  await cdp.send("Page.stopScreencast"); await attesa(300);
  // elenco per ffmpeg: ogni fotogramma dura fino al successivo
  let txt = ""; for (let i = 0; i < fotogrammi.length; i++) { const d = (fotogrammi[i + 1] ?? fotogrammi[i] + 0.04) - fotogrammi[i]; txt += `file '${cart}${String(i).padStart(5, "0")}.jpg'\nduration ${d.toFixed(4)}\n`; }
  txt += `file '${cart}${String(fotogrammi.length - 1).padStart(5, "0")}.jpg'\n`;
  fs.writeFileSync(out + ".txt", txt); console.log("fotogrammi", fotogrammi.length, "secondi", (fotogrammi.at(-1) - fotogrammi[0]).toFixed(1));
  await ctx.close(); await b.close();
})();
