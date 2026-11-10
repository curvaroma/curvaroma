// Modelli delle grafiche Instagram per la scheda Post Instagram del pannello.
// Stessi modelli di strumenti/post.js (numero, confronto, domanda, lista, risultato, storia, tre giocatori), disegnati su canvas 1080x1350.
(() => {
const W = 1080, H = 1350, GIALLO = "#F0BC42", ROSSO = "#8E1F2F", SCURO = "#2B0A15", BORDO = "#5F0E24", CREMA = "#FFF6F0", ROSA = "#F3D9DE";
const SCONTORNI = ["balerdi", "castro", "cristante", "de-marzi", "de-roon", "dybala", "ghilardi", "gollini", "hermoso", "kone", "koulierakis", "lulli", "malen", "mancini", "molina", "mora", "ndicka", "pellegrini", "pisilli", "rensch", "soule", "svilar", "vasquez", "wesley"];
let font = null;
const carica = u => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error("Foto non caricata: " + u)); i.src = u; });
const fonts = () => font ||= Promise.all([["T", "/fonts/titoli-900.woff2", 900], ["C", "/fonts/testo-600.woff2", 600], ["C7", "/fonts/testo-700.woff2", 700]].map(([n, u, w]) => new FontFace("RP" + n, `url(${u})`, { weight: String(w) }).load())).then(l => l.forEach(f => document.fonts.add(f)));
const F = (tipo, px) => `${tipo === "T" ? 900 : tipo === "C7" ? 700 : 600} ${px}px RP${tipo}`;
const righe = t => String(t || "").split("\n").map(x => x.trim()).filter(Boolean);
const coppie = t => righe(t).map(r => r.split("|").map(x => x.trim()));
function testo(g, t, x, y, { f = F("T", 60), c = CREMA, a = "left", sp = 0, up = false } = {}) { g.font = f; g.fillStyle = c; g.textAlign = a; g.letterSpacing = sp + "px"; g.fillText(up ? String(t).toUpperCase() : String(t), x, y); g.letterSpacing = "0px"; }
function adatta(g, linee, tipo, max, larg, min = 40) { let c = max; do { g.font = F(tipo, c); if (Math.max(...linee.map(x => g.measureText(x.toUpperCase()).width), 0) <= larg) break; c -= 2; } while (c > min); return c; }
function aCapo(g, t, f, larg) { g.font = f; const out = []; let r = ""; for (const p of String(t || "").split(/\s+/).filter(Boolean)) { const k = r ? r + " " + p : p; if (g.measureText(k).width > larg && r) { out.push(r); r = p; } else r = k; } if (r) out.push(r); return out; }
function copri(g, img, x, y, w, h, pos = 50) { const k = Math.max(w / img.width, h / img.height), sw = w / k, sh = h / k; g.drawImage(img, (img.width - sw) / 2, (img.height - sh) * pos / 100, sw, sh, x, y, w, h); }
function titoloGrande(g, linee, top, { max = 120, c = CREMA, lh = .95 } = {}) { const l = linee.length ? linee : ["Il tuo titolo"], px = adatta(g, l, "T", max, 950); l.forEach((x, i) => testo(g, x, 64, top + px * .78 + i * px * lh, { f: F("T", px), c, up: true })); return top + l.length * px * lh; }
async function cornice(g, d, { logo = "/img/logo-chiaro.png", tagFondo = GIALLO, tagTesto = SCURO, sitoFondo = GIALLO, sitoTesto = SCURO, ctaColore = CREMA } = {}) {
  const lg = await carica(logo); g.drawImage(lg, 64, 56, 300, 300 * lg.height / lg.width);
  if (d.tag) { g.font = F("T", 34); g.letterSpacing = "2px"; const w = g.measureText(d.tag.toUpperCase()).width; g.letterSpacing = "0px"; g.fillStyle = tagFondo; g.fillRect(W - 64 - w - 36, 66, w + 36, 56); testo(g, d.tag, W - 64 - 18, 106, { f: F("T", 34), c: tagTesto, a: "right", sp: 2, up: true }); }
  g.font = F("T", 46); const ws = g.measureText("roma-plus.it").width; g.fillStyle = sitoFondo; g.fillRect(64, H - 56 - 68, ws + 40, 68); testo(g, "roma-plus.it", 84, H - 56 - 19, { f: F("T", 46), c: sitoTesto });
  if (d.cta) { const l = aCapo(g, d.cta, F("C7", 30), 560); l.forEach((x, i) => testo(g, x, W - 64, H - 66 - 8 - (l.length - 1 - i) * 36, { f: F("C7", 30), c: ctaColore, a: "right" })); }
}
const MODELLI = {
  foto: { nome: "Foto e titolo", campi: [["titolo", "Titolo, una riga per ogni a capo", "area"], ["testo", "Frase sotto il titolo"], ["foto", "Foto", "foto"], ["alto", "Posizione foto (0 alto, 100 basso)", "number"]],
    async disegna(g, d) {
      g.fillStyle = BORDO; g.fillRect(0, 0, W, H);
      const lg = await carica("/img/logo-chiaro.png"); g.drawImage(lg, 540 - 230, 50, 460, 460 * lg.height / lg.width);
      copri(g, await carica(d.foto || "/img/tifosi.jpg"), 0, 158, W, 590, +d.alto || 60);
      g.fillStyle = ROSSO; g.fillRect(0, 748, W, 602);
      const l = (righe(d.titolo).length ? righe(d.titolo) : ["Il tuo titolo"]).slice(0, 3), px = adatta(g, l, "T", 138, 960, 48);
      let y = 800 + px * .8; for (const x of l) { testo(g, x, 60, y, { f: F("T", px), c: GIALLO, up: true }); y += px * .98; }
      y += 34 - px * .98; for (const x of aCapo(g, d.testo, F("C", 39), 960).slice(0, 3)) { y += 44; testo(g, x, 60, y, { f: F("C", 39) }); }
      g.font = F("T", 54); const ls = g.measureText("roma-plus.it").width; g.fillStyle = GIALLO; g.fillRect(60, 1226, ls + 48, 80); testo(g, "roma-plus.it", 84, 1285, { f: F("T", 54), c: SCURO });
    } },
  tridente: { nome: "Tre giocatori", campi: [["titolo", "Titolo, una riga per ogni a capo", "area"], ["testo", "Frase sotto il titolo"], ["foto", "Foto di sfondo", "foto"], ["g0", "Giocatore a sinistra", "giocatore"], ["g1", "Giocatore al centro", "giocatore"], ["g2", "Giocatore a destra", "giocatore"]],
    async disegna(g, d) {
      g.fillStyle = SCURO; g.fillRect(0, 0, W, H);
      g.save(); g.filter = "blur(5px) brightness(.5)"; copri(g, await carica(d.foto || "/img/curva.jpg"), 0, 0, W, 1000, 50); g.restore();
      let gr = g.createRadialGradient(540, 567, 0, 540, 567, 600); gr.addColorStop(0, "rgba(240,188,66,.38)"); gr.addColorStop(1, "rgba(240,188,66,0)"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "rgba(43,10,21,.72)"); gr.addColorStop(.22, "rgba(43,10,21,0)"); gr.addColorStop(.56, "rgba(95,14,36,0)"); gr.addColorStop(.74, ROSSO); gr.addColorStop(1, ROSSO); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      const lg = await carica("/img/logo-chiaro.png"); g.drawImage(lg, 280, 75 - 260 * lg.height / lg.width, 520, 520 * lg.height / lg.width);
      const gioc = await Promise.all([d.g0, d.g1, d.g2].map(x => x ? carica(`/img/giocatori/${x}-scontorno.png`) : null));
      g.save(); g.shadowColor = "rgba(0,0,0,.55)"; g.shadowBlur = 26; g.shadowOffsetY = 18;
      for (const i of [0, 2, 1]) { const im = gioc[i]; if (!im) continue; const h = i === 1 ? 800 : 740, w = h * im.width / im.height, x = i === 0 ? -36 : i === 2 ? W + 36 - w : 540 - w / 2; g.drawImage(im, x, i === 1 ? 176 : 232, w, h); }
      g.restore();
      gr = g.createLinearGradient(0, H - 540, 0, H); gr.addColorStop(0, "rgba(142,31,47,0)"); gr.addColorStop(.16, "rgba(142,31,47,.82)"); gr.addColorStop(.28, ROSSO); gr.addColorStop(1, ROSSO); g.fillStyle = gr; g.fillRect(0, H - 540, W, 540);
      const fr = aCapo(g, d.testo, F("C", 37), 960).slice(0, 2), l = (righe(d.titolo).length ? righe(d.titolo) : ["Il tuo titolo"]).slice(0, 3), px = adatta(g, l, "T", 138, 960, 48);
      let y = H - 44 - 76 - 24 - fr.length * 45 - 18 - l.length * px * .98 + px * .8;
      for (const x of l) { testo(g, x, 60, y, { f: F("T", px), c: GIALLO, up: true }); y += px * .98; }
      y += 18 - px * .98 + 8; for (const x of fr) { y += 45; testo(g, x, 60, y, { f: F("C", 37) }); }
      g.font = F("T", 50); const ls = g.measureText("roma-plus.it").width; g.fillStyle = GIALLO; g.fillRect(60, H - 44 - 74, ls + 44, 74); testo(g, "roma-plus.it", 82, H - 44 - 20, { f: F("T", 50), c: SCURO });
    } },
  numero: { nome: "Numero grande", campi: [["tag", "Etichetta in alto (es. Dato di stagione)"], ["numero", "Numero"], ["etichetta", "Sotto il numero, una riga per ogni a capo", "area"], ["dati", "Fino a 3 dati, uno per riga (valore | testo)", "area"], ["giocatore", "Giocatore a destra", "giocatore"], ["cta", "Frase in basso a destra"]],
    async disegna(g, d) {
      g.fillStyle = SCURO; g.fillRect(0, 0, W, H);
      const gr = g.createRadialGradient(842, 621, 0, 842, 621, 760); gr.addColorStop(0, "rgba(142,31,47,.95)"); gr.addColorStop(1, "rgba(43,10,21,0)"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      if (d.giocatore) { const im = await carica(`/img/giocatori/${d.giocatore}-scontorno.png`), w = 900 * im.width / im.height; g.save(); g.shadowColor = "rgba(0,0,0,.6)"; g.shadowBlur = 30; g.shadowOffsetY = 20; g.drawImage(im, W + 60 - w, H - 250 - 900, w, 900); g.restore(); }
      testo(g, d.numero || "0", 52, 190 + 400, { f: F("T", 520), c: GIALLO, sp: -10 });
      const et = righe(d.etichetta), larg = d.giocatore ? 560 : 950; et.forEach((x, i) => testo(g, x, 64, 640 + 64 + i * 74, { f: F("T", adatta(g, et, "T", 76, larg)), up: true }));
      const dati = coppie(d.dati).slice(0, 3), n = dati.length;
      if (n) { const gap = 16, bw = (952 - gap * (n - 1)) / n, top = H - 170 - 178; dati.forEach(([v, t], i) => { const x = 64 + i * (bw + gap); g.fillStyle = "rgba(255,246,240,.08)"; g.fillRect(x, top, bw, 178); g.fillStyle = GIALLO; g.fillRect(x, top, bw, 6); testo(g, v || "", x + 22, top + 28 + 76, { f: F("T", 92) }); aCapo(g, t, F("C", 28), bw - 44).slice(0, 2).forEach((r, k) => testo(g, r, x + 22, top + 140 + k * 32, { f: F("C", 28), c: ROSA })); }); }
      await cornice(g, d);
    } },
  confronto: { nome: "Confronto", campi: [["tag", "Etichetta in alto (es. Numeri della sfida)"], ["titolo", "Titolo, una riga per ogni a capo", "area"], ["sq1", "Prima squadra"], ["sq2", "Seconda squadra"], ["righe", "Statistiche, una per riga (nome | prima | seconda)", "area"], ["cta", "Frase in basso a destra"]],
    async disegna(g, d) {
      g.fillStyle = BORDO; g.fillRect(0, 0, W, H);
      const l = righe(d.titolo), fine = titoloGrande(g, l, 200, { max: 110 });
      const ys = fine + 60 + 40; testo(g, d.sq1 || "Roma", 64, ys, { f: F("T", 54), c: GIALLO, up: true }); testo(g, d.sq2 || "Avversario", W - 64, ys, { f: F("T", 54), a: "right", up: true });
      const r = coppie(d.righe).slice(0, 6), top = ys + 60, alt = (H - 170 - top) / Math.max(r.length, 1);
      r.forEach(([t, a, b], i) => {
        const cy = top + alt * i + alt / 2, na = parseFloat(String(a).replace(",", ".")) || 0, nb = parseFloat(String(b).replace(",", ".")) || 0, tot = na + nb || 1;
        testo(g, a ?? "", 64, cy + 28, { f: F("T", 80), c: GIALLO }); testo(g, b ?? "", W - 64, cy + 28, { f: F("T", 80), a: "right" });
        const x0 = 64 + 170 + 22, x1 = W - 64 - 170 - 22, w = x1 - x0, wa = Math.max(4, (w - 6) * na / tot), wb = Math.max(4, w - 6 - wa);
        testo(g, t || "", (x0 + x1) / 2, cy - 6, { f: F("C7", 30), c: ROSA, a: "center", sp: 1, up: true });
        g.fillStyle = GIALLO; g.beginPath(); g.roundRect(x0, cy + 6, wa, 22, [11, 0, 0, 11]); g.fill(); g.fillStyle = CREMA; g.beginPath(); g.roundRect(x0 + wa + 6, cy + 6, wb, 22, [0, 11, 11, 0]); g.fill();
      });
      await cornice(g, d);
    } },
  domanda: { nome: "Sondaggio", campi: [["tag", "Etichetta in alto (es. Sondaggio)"], ["titolo", "Domanda, una riga per ogni a capo", "area"], ["opzioni", "Risposte, una per riga (da 2 a 4)", "area"], ["cta", "Frase in basso a destra (es. Rispondi A, B o C nei commenti)"]],
    async disegna(g, d) {
      g.fillStyle = GIALLO; g.fillRect(0, 0, W, H);
      titoloGrande(g, righe(d.titolo), 200, { max: 120, c: BORDO });
      const o = righe(d.opzioni).slice(0, 4), h = 122, gap = 20, top = H - 180 - o.length * h - (o.length - 1) * gap;
      o.forEach((x, i) => { const y = top + i * (h + gap); g.fillStyle = SCURO; g.fillRect(64, y, 952, h); g.fillStyle = GIALLO; g.fillRect(92, y + 22, 78, 78); testo(g, "ABCD"[i], 131, y + 22 + 60, { f: F("T", 56), c: SCURO, a: "center" }); testo(g, x, 196, y + 22 + 60, { f: F("T", adatta(g, [x], "T", 58, 780)), up: true }); });
      await cornice(g, d, { logo: "/img/logo.png", tagFondo: ROSSO, tagTesto: CREMA, sitoFondo: SCURO, sitoTesto: GIALLO, ctaColore: SCURO });
    } },
  lista: { nome: "Lista o pagella", campi: [["tag", "Etichetta in alto (es. Pagella dei tifosi)"], ["titolo", "Titolo, una riga per ogni a capo", "area"], ["testo", "Frase sotto il titolo"], ["righe", "Righe, una per riga (nome | valore), massimo 8", "area"], ["cta", "Frase in basso a destra"]],
    async disegna(g, d) {
      g.fillStyle = SCURO; g.fillRect(0, 0, W, H);
      const fine = titoloGrande(g, righe(d.titolo), 190, { max: 110 });
      if (d.testo) aCapo(g, d.testo, F("C", 34), 952).slice(0, 2).forEach((x, i) => testo(g, x, 64, fine + 30 + 30 + i * 42, { f: F("C", 34), c: ROSA }));
      const r = coppie(d.righe).slice(0, 8), h = 98, gap = 14, top = H - 170 - r.length * h - (r.length - 1) * gap;
      r.forEach(([n, v], i) => { const y = top + i * (h + gap); g.fillStyle = i ? "rgba(255,246,240,.07)" : ROSSO; g.fillRect(64, y, 952, h); g.fillStyle = i ? ROSSO : GIALLO; g.fillRect(64, y, 8, h); testo(g, i + 1, 104, y + 64, { f: F("T", 40), c: ROSA }); testo(g, n || "", 180, y + 68, { f: F("T", adatta(g, [n || ""], "T", 54, 650)), up: true }); testo(g, v || "", W - 64 - 24, y + 72, { f: F("T", 66), c: GIALLO, a: "right" }); });
      await cornice(g, d);
    } },
  risultato: { nome: "Risultato", campi: [["tag", "Etichetta in alto (es. Finale)"], ["competizione", "Competizione (es. Serie A, 12ª giornata)"], ["casa", "Squadra in casa"], ["golCasa", "Gol casa", "number"], ["ospiti", "Squadra ospite"], ["golOspiti", "Gol ospiti", "number"], ["testo", "Marcatori"], ["foto", "Foto", "foto"], ["alto", "Posizione foto (0 alto, 100 basso)", "number"], ["cta", "Frase in basso a destra"]],
    async disegna(g, d) {
      g.fillStyle = SCURO; g.fillRect(0, 0, W, H); copri(g, await carica(d.foto || "/img/curva.jpg"), 0, 0, W, H, d.alto === "" || d.alto == null ? 30 : +d.alto);
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "rgba(43,10,21,.55)"); gr.addColorStop(.3, "rgba(43,10,21,.1)"); gr.addColorStop(.62, "rgba(43,10,21,.85)"); gr.addColorStop(.8, SCURO); gr.addColorStop(1, SCURO); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      if (d.competizione) testo(g, d.competizione, 64, H - 560, { f: F("C7", 30), c: GIALLO, sp: 2, up: true });
      const ris = `${d.golCasa ?? ""}-${d.golOspiti ?? ""}`, y = H - 330; testo(g, ris, 540, y, { f: F("T", 230), c: GIALLO, a: "center", sp: -4 });
      g.font = F("T", 230); const half = g.measureText(ris).width / 2 + 24, lw = 540 - half - 64;
      testo(g, d.casa || "", 64, y - 70, { f: F("T", adatta(g, [d.casa || ""], "T", 64, lw, 30)), up: true }); testo(g, d.ospiti || "", W - 64, y - 70, { f: F("T", adatta(g, [d.ospiti || ""], "T", 64, lw, 30)), a: "right", up: true });
      aCapo(g, d.testo, F("C", 32), 952).slice(0, 3).forEach((x, i) => testo(g, x, 64, H - 170 - 90 + 36 + i * 43, { f: F("C", 32), c: ROSA }));
      await cornice(g, d);
    } },
  storia: { nome: "Storia", campi: [["tag", "Etichetta in alto (es. Storia)"], ["anno", "Anno"], ["titolo", "Titolo, una riga per ogni a capo", "area"], ["testo", "Frase sotto il titolo"], ["foto", "Foto", "foto"], ["alto", "Posizione foto (0 alto, 100 basso)", "number"], ["cta", "Frase in basso a destra"]],
    async disegna(g, d) {
      g.fillStyle = "#1C0A10"; g.fillRect(0, 0, W, H);
      g.save(); g.filter = "grayscale(1) sepia(.35) contrast(1.05) brightness(.8)"; copri(g, await carica(d.foto || "/img/stadio.jpg"), 0, 0, W, 900, d.alto === "" || d.alto == null ? 40 : +d.alto); g.restore();
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "rgba(28,10,16,.6)"); gr.addColorStop(.25, "rgba(28,10,16,0)"); gr.addColorStop(.45, "rgba(28,10,16,.2)"); gr.addColorStop(.68, "#1C0A10"); gr.addColorStop(1, "#1C0A10"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      if (d.anno) { g.font = F("T", 250); g.textAlign = "left"; g.lineWidth = 4; g.strokeStyle = GIALLO; g.strokeText(d.anno, 56, 560 + 196); }
      titoloGrande(g, righe(d.titolo), 800, { max: 96 });
      aCapo(g, d.testo, F("C", 34), 952).slice(0, 2).forEach((x, i, a) => testo(g, x, 64, H - 170 - (a.length - 1 - i) * 42, { f: F("C", 34), c: ROSA }));
      await cornice(g, d);
    } }
};
window.MODELLI_POST = { MODELLI, SCONTORNI, async disegna(tela, d) { await fonts(); const g = tela.getContext("2d"); g.clearRect(0, 0, W, H); g.textBaseline = "alphabetic"; await (MODELLI[d.stile] || MODELLI.foto).disegna(g, d); } };
})();
