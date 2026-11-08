// App Roma+: stesse API del sito, stessi dati.
const API = "https://roma-plus.it";
const $ = s => document.querySelector(s);
const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
const vista = $("#vista");
const assoluta = u => !u ? "" : u.startsWith("http") ? u : API + u;
function mioId() {
  let id = localStorage.getItem("cr_id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("cr_id", id); }
  return id;
}
const chiama = async (u, o = {}) => {
  const r = await fetch(API + u, { ...o, headers: { "x-tifoso": mioId(), ...(o.body ? { "content-type": "application/json" } : {}) } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.errore || "Errore, riprova tra poco");
  return d;
};
const invia = (u, d) => chiama(u, { method: "POST", body: JSON.stringify(d) });
function apriLink(url) {
  const B = window.Capacitor?.Plugins?.Browser;
  if (B) B.open({ url }); else window.open(url, "_blank");
}
let P = null;
const pubblico = async () => (P ||= await chiama("/api/pubblico"));

/* Notizie: sempre dalla più recente, scorrendo si torna indietro. Tirando giù dall'inizio la lista si aggiorna. */
const QUANDO = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" });
const GIORNO = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" });
const ora = d => { const x = new Date(d), oggi = x.toDateString() === new Date().toDateString(); return oggi ? QUANDO.format(x) : `${GIORNO.format(x)} ${QUANDO.format(x)}`; };
function prodottiMisti() {
  const visti = new Set(), l = (P?.prodotti || []).filter(p => p.foto).sort(() => Math.random() - .5);
  return l.filter(p => { const k = p.nome.trim().toLowerCase(); if (visti.has(k) || visti.has(p.link)) return false; visti.add(k); visti.add(p.link); return true; });
}
function annuncio(p) {
  const a = el("a", "adv"); a.href = "#";
  const i = el("img"); i.src = assoluta(p.foto); i.alt = ""; i.loading = "lazy";
  const t = el("div"); t.append(el("span", "meta", "Annuncio"), el("b", "", p.nome), el("u", "", "Vedi su Amazon"));
  a.append(i, t);
  a.onclick = e => { e.preventDefault(); fetch(API + "/api/clic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prodotto: p.id }) }).catch(() => {}); apriLink(p.link); };
  return a;
}
// Un annuncio a caso, diverso a ogni apertura, nelle sezioni che non sono le notizie.
function unAnnuncio(s) { const l = prodottiMisti(); if (l.length) s.append(annuncio(l[0])); }
const SOGLIA = 70;
async function notizie() {
  const tira = el("div", "tira"), scritta = el("span", "", "Tira per aggiornare"), lista = el("div"), piede = el("div", "carica", "Carico le notizie…");
  tira.append(el("i"), scritta);
  vista.append(tira, lista, piede);
  await pubblico().catch(() => {});
  const adv = prodottiMisti();
  let prima = null, finito = false, inCorso = false, n = 0, primaUrl = null;
  const scrivi = l => {
    for (const x of l) {
      const a = el("a", "notizia"); a.href = "#";
      const f = el("img"); f.alt = ""; f.loading = "lazy"; if (x.foto) f.src = x.foto;
      const c = el("div"); c.append(el("span", "meta", `${ora(x.pubblicata)} · ${x.testata}`), el("b", "", x.titolo));
      a.append(f, c); a.onclick = e => { e.preventDefault(); apriLink(x.url); };
      lista.append(a);
      if (++n % 6 === 0 && adv.length) lista.append(annuncio(adv[(n / 6 - 1) % adv.length]));
      prima = x.pubblicata;
    }
    finito = l.length < 30;
    piede.textContent = finito ? "Sei arrivato all'inizio dell'archivio" : "";
  };
  // Scorrendo verso il basso arrivano le notizie più vecchie.
  const altre = async () => {
    if (inCorso || finito) return;
    inCorso = true;
    try { const d = await chiama(`/api/archivio?limite=30${prima ? "&prima=" + encodeURIComponent(prima) : ""}`); if (!primaUrl) primaUrl = d.notizie[0]?.url || null; scrivi(d.notizie); }
    catch (e) { piede.textContent = e.message; }
    inCorso = false;
  };
  // Tirando giù si riparte dalle più recenti; il server scarica prima i feed, se non lo ha fatto nell'ultimo minuto.
  const daCapo = async () => {
    if (inCorso) return "";
    inCorso = true;
    let esito = "";
    try {
      const d = await chiama("/api/archivio?limite=30&aggiorna=1", { cache: "no-store" });
      const nuovo = d.notizie[0]?.url || null;
      esito = nuovo && nuovo === primaUrl ? "Nessuna notizia nuova" : "Notizie aggiornate";
      lista.textContent = ""; prima = null; n = 0; primaUrl = nuovo; scrivi(d.notizie);
    } catch (e) { esito = e.message || "Connessione assente"; }
    inCorso = false;
    return esito;
  };
  vista.onscroll = () => { if (vista.scrollTop + vista.clientHeight > vista.scrollHeight - 700) altre(); };
  let y0 = null, tirato = 0;
  const altezza = h => { tira.style.height = h + "px"; tira.style.setProperty("--g", h * 4); };
  vista.ontouchstart = e => { y0 = vista.scrollTop <= 0 && !inCorso && e.touches.length === 1 ? e.touches[0].clientY : null; tirato = 0; };
  vista.ontouchmove = e => {
    if (y0 == null) return;
    const d = e.touches[0].clientY - y0;
    if (d <= 0 || vista.scrollTop > 0) { if (tirato) { tirato = 0; altezza(0); } return; }
    tira.classList.add("tocco");
    tirato = Math.min(110, d * .5); altezza(tirato);
    const pronto = tirato >= SOGLIA; tira.classList.toggle("pronto", pronto); scritta.textContent = pronto ? "Rilascia per aggiornare" : "Tira per aggiornare";
    if (e.cancelable) e.preventDefault();
  };
  vista.ontouchend = vista.ontouchcancel = async () => {
    if (y0 == null) return;
    y0 = null; tira.classList.remove("tocco");
    if (tirato < SOGLIA) { tirato = 0; altezza(0); tira.classList.remove("pronto"); return; }
    tirato = 0; tira.classList.remove("pronto"); tira.classList.add("gira"); altezza(52); scritta.textContent = "Aggiorno le notizie…";
    const esito = await daCapo();
    tira.classList.remove("gira"); scritta.textContent = esito; vista.scrollTop = 0;
    setTimeout(() => { if (!tira.classList.contains("gira") && !tira.classList.contains("tocco")) altezza(0); }, 1200);
  };
  await altre();
}

/* Pagelle */
async function pagelle() {
  const s = el("div", "sez"); vista.append(s);
  const { contenuti: C, pagelle: arch } = await pubblico(), p = C.partita;
  const st = await chiama(`/api/stato?partita=${p.id}&prossima=${C.prossima.id}`);
  const t = el("div", "card"), tb = el("div", "tab");
  tb.append(el("span", "", p.casa), el("b", "", `${p.golCasa}-${p.golOspiti}`), el("span", "", p.ospiti));
  t.append(tb, el("span", "nota", `${p.competizione}, ${p.data}`));
  s.append(el("h1", "", "Pagelle dei tifosi"), t);
  const voti = { ...(st.miei.pagella || {}) }, box = el("div", "card");
  box.append(el("h2", "", "Dai i tuoi voti"));
  for (const [nome, ruolo] of p.titolari) {
    const g = el("div", "gioc"), r = el("div", "voti"), tit = el("div"); tit.append(el("b", "", nome), el("span", "nota", ` ${ruolo}`));
    for (let v = 1; v <= 10; v++) {
      const b = el("button", voti[nome] === v ? "si" : "", v);
      b.onclick = () => { voti[nome] = v; [...r.children].forEach(x => x.classList.toggle("si", x === b)); };
      r.append(b);
    }
    g.append(tit, r); box.append(g);
  }
  const sv = el("button", "btn", "Invia i voti"), es = el("p", "esito");
  sv.onclick = async () => {
    if (!Object.keys(voti).length) { es.textContent = "Vota almeno un giocatore"; return; }
    try { await invia("/api/voti", { partita: p.id, voti }); es.textContent = "Voti salvati. Forza Roma!"; } catch (e) { es.textContent = e.message; }
  };
  box.append(sv, es); s.append(box);
  unAnnuncio(s);
  if (st.medie.length) { const m = el("div", "card"); m.append(el("h2", "", "Il voto dei tifosi")); for (const x of st.medie) { const r = el("div", "riga"); r.append(el("span", "", x.n), el("b", "", x.m.toFixed(1).replace(".", ",").replace(",0", ""))); m.append(r); } s.append(m); }
  if (arch?.length > 1) { const m = el("div", "card"); m.append(el("h2", "", "Tutte le pagelle")); for (const x of arch) { const r = el("div", "riga"); r.append(el("span", "", `${x.casa}-${x.ospiti} ${x.golCasa}-${x.golOspiti}`), el("span", "nota", x.data)); r.onclick = () => apriLink(`${API}/pagelle/${x.slug}`); m.append(r); } s.append(m); }
}

/* Analisi */
async function analisi() {
  const s = el("div", "sez"); vista.append(s);
  const { contenuti: C } = await pubblico();
  s.append(el("h1", "", "Analisi"));
  for (const a of C.analisi) {
    const c = el("article", "card art"), i = el("img"), d = el("div"); i.src = assoluta(a.copertina || "/img/lavagna.jpg"); i.alt = ""; i.loading = "lazy";
    d.append(el("span", "meta", a.occhiello || ""), el("h2", "", a.titolo), el("span", "nota", a.riassunto || ""));
    c.append(i, d); c.onclick = () => leggi(a); s.append(c);
    if (s.querySelectorAll(".art").length % 3 === 0) unAnnuncio(s);
  }
  if (C.analisi.length % 3) unAnnuncio(s);
}
function leggi(a) {
  vista.textContent = ""; vista.scrollTop = 0;
  const s = el("div", "sez"), b = el("button", "indietro", "‹ Analisi"), t = el("div", "testo");
  b.onclick = () => apri("analisi");
  for (const par of String(a.testo || "").split(/\n\s*\n/)) { const x = par.trim(); if (x) t.append(x.startsWith("## ") ? el("h3", "", x.slice(3)) : el("p", "", x)); }
  s.append(b, el("span", "meta", a.occhiello || ""), el("h1", "", a.titolo), t); unAnnuncio(s); vista.append(s);
}

/* Vigilia */
async function vigilia() {
  const s = el("div", "sez"); vista.append(s);
  const { contenuti: C } = await pubblico(), p = C.prossima;
  const st = await chiama(`/api/stato?partita=${C.partita.id}&prossima=${p.id}`);
  const t = el("div", "card"), tb = el("div", "tab");
  tb.append(el("span", "", p.casa), el("b", "", "vs"), el("span", "", p.ospiti));
  t.append(tb, el("span", "nota", `${p.competizione}, ${p.quando}`), el("p", "", p.nota));
  s.append(el("h1", "", "Vigilia"), t);
  const chiuso = Date.now() >= Date.parse(p.inizio), q = { casa: st.miei.pronostico?.casa ?? 2, ospiti: st.miei.pronostico?.ospiti ?? 0 };
  const b = el("div", "card"), riga = el("div", "tab"), es = el("p", "esito");
  const passo = k => { const w = el("div", "pass"), m = el("button", "", "−"), v = el("span", "", q[k]), x = el("button", "", "+"); const f = d => { q[k] = Math.min(9, Math.max(0, q[k] + d)); v.textContent = q[k]; }; m.onclick = () => f(-1); x.onclick = () => f(1); w.append(m, v, x); return w; };
  riga.append(passo("casa"), el("span"), passo("ospiti"));
  const sv = el("button", "btn", chiuso ? "Pronostici chiusi" : "Salva il pronostico"); sv.disabled = chiuso;
  sv.onclick = async () => { try { await invia("/api/pronostico", { partita: p.id, ...q }); es.textContent = "Pronostico salvato"; } catch (e) { es.textContent = e.message; } };
  b.append(el("h2", "", "Indovina il risultato"), riga, sv, es); s.append(b);
  if (st.pronostico) b.append(el("span", "nota", `Il risultato più scelto è ${st.pronostico.casa}-${st.pronostico.ospiti}`));
  unAnnuncio(s);
  const k = el("div", "card"); k.append(el("h2", "", "Classifica Serie A")); for (const [n, v] of C.classifica) { const r = el("div", "riga"); r.append(el("span", "", n), el("b", "", v)); k.append(r); } s.append(k);
}

/* Biglietti */
const SETTORI = ["Curva Sud", "Curva Nord", "Distinti Sud", "Distinti Nord", "Tribuna Tevere", "Tribuna Monte Mario"];
async function biglietti() {
  const s = el("div", "sez"); vista.append(s);
  const { contenuti: C } = await pubblico();
  const st = await chiama(`/api/stato?partita=${C.partita.id}&prossima=${C.prossima.id}`);
  const f = el("div", "card"), sel = (o, v) => { const x = el("select"); o.forEach(y => { const q = el("option", "", y); x.append(q); }); if (v) x.value = v; return x; };
  const tipo = sel(["Cedo", "Cerco"]), partita = sel(C.partite_biglietti), settore = sel(SETTORI), n = el("input"), prezzo = el("input"), contatto = el("input"), es = el("p", "esito"), sv = el("button", "btn", "Pubblica l'annuncio");
  n.type = "number"; n.value = 1; n.min = 1; n.max = 4; n.placeholder = "Quanti"; prezzo.type = "number"; prezzo.placeholder = "Prezzo in euro"; contatto.placeholder = "@tuoinstagram"; contatto.autocapitalize = "none";
  sv.onclick = async () => { try { await invia("/api/annunci", { tipo: tipo.value, partita: partita.value, settore: settore.value, n: +n.value, prezzo: +prezzo.value, contatto: contatto.value.trim() }); P = null; apri("biglietti"); } catch (e) { es.textContent = e.message; } };
  f.append(el("h2", "", "Metti un annuncio"), tipo, partita, settore, n, prezzo, contatto, sv, es, el("span", "nota", "Nessun pagamento in app. Il cambio intestatario si fa solo sui canali ufficiali."));
  const b = el("div", "card"); b.append(el("h2", "", "Bacheca"));
  if (!st.annunci.length) b.append(el("span", "nota", "Ancora nessun annuncio."));
  for (const a of st.annunci) { const r = el("div", "riga"), t = el("div"); t.append(el("div", "", `${a.tipo}: ${a.partita}`), el("span", "nota", `${a.quanti} in ${a.settore}, ${a.prezzo} €, ${a.contatto}`)); r.append(t); b.append(r); }
  s.append(el("h1", "", "Biglietti"), f, b);
  unAnnuncio(s);
}

/* Navigazione */
const ICONE = {
  notizie: '<path d="M4 5h13v15H6a2 2 0 0 1-2-2zM17 9h3v9a2 2 0 0 1-2 2M8 9h5M8 13h5"/>',
  pagelle: '<path d="m12 3 2.7 5.8 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3.1 1.2-6.2L3 9.6l6.3-.8z"/>',
  analisi: '<path d="M5 20v-7M12 20V5M19 20v-10"/>',
  vigilia: '<path d="M4 7h16v13H4zM4 11h16M9 4v5M15 4v5"/>',
  biglietti: '<path d="M4 7h16v4a2 2 0 0 0 0 4v2H4v-2a2 2 0 0 0 0-4z"/>'
};
const SCHERMI = { notizie: ["Notizie", notizie], pagelle: ["Pagelle", pagelle], analisi: ["Analisi", analisi], vigilia: ["Vigilia", vigilia], biglietti: ["Biglietti", biglietti] };
for (const [k, [t]] of Object.entries(SCHERMI)) {
  const b = el("button"); b.dataset.k = k; b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONE[k]}</svg>`; b.append(t); b.onclick = () => apri(k); $("#barra").append(b);
}
async function apri(k) {
  document.querySelectorAll("#barra button").forEach(b => b.classList.toggle("ora", b.dataset.k === k));
  vista.textContent = ""; vista.onscroll = vista.ontouchstart = vista.ontouchmove = vista.ontouchend = vista.ontouchcancel = null; vista.scrollTop = 0;
  try { await SCHERMI[k][1](); } catch (e) { vista.textContent = ""; vista.append(el("div", "carica", e.message || "Connessione assente")); }
}

/* Radio Curva */
let R = null, acceso = false;
const au = new Audio();
const punto = () => { const b = R.brani, tot = b.reduce((s, x) => s + x.durata, 0); let s = ((Date.now() - R.t0) / 1000) % tot; for (let i = 0; i < b.length; i++) { if (s < b[i].durata) return { x: b[i], off: s }; s -= b[i].durata; } return { x: b[0], off: 0 }; };
function inOnda() { const { x, off } = punto(); au.src = `${API}/api/audio/${x.id}?v=${x.v}`; au.addEventListener("loadedmetadata", () => { au.currentTime = off; }, { once: true }); au.play().catch(() => { acceso = false; statoR(); }); }
const statoR = () => { $("#onair").classList.toggle("acceso", acceso); $("#onair-ic").textContent = acceso ? "❚❚" : "▶"; };
au.addEventListener("ended", () => { if (acceso) inOnda(); });
$("#onair").onclick = () => { if (!R) return; acceso = !acceso; statoR(); if (acceso) inOnda(); else au.pause(); };
chiama("/api/radio").then(d => { if (d.brani.length) { R = { ...d, t0: Date.now() - d.secondi * 1000 }; $("#onair").hidden = false; } }).catch(() => {});

/* Risultato in diretta sotto la testata, solo nelle ore della partita. */
const STEMMI = {"roma":"roma","lazio":"lazio","inter":"inter","como":"como","milan":"milan","frosinone":"frosinone","juventus":"juventus","napoli":"napoli","bologna":"bologna","torino":"torino","genoa":"genoa","cagliari":"cagliari","atalanta":"atalanta","lecce":"lecce","parma":"parma","fiorentina":"fiorentina","sassuolo":"sassuolo","monza":"monza","udinese":"udinese","venezia":"venezia","man. united":"man-united","manchester united":"man-united","man. city":"man-city","manchester city":"man-city","real madrid":"real-madrid","psg":"psg","paris saint-germain":"psg","sporting":"sporting","aek":"aek","lille":"lille","slovan":"slovan","fenerbahce":"fenerbahce","fenerbahçe":"fenerbahce","arsenal":"arsenal","liverpool":"liverpool","bayern":"bayern","barcellona":"barcellona","atletico":"atletico","atletico madrid":"atletico","dortmund":"dortmund","porto":"porto","psv":"psv","feyenoord":"feyenoord","galatasaray":"galatasaray","lipsia":"lipsia","stoccarda":"stoccarda","aston villa":"aston-villa","bruges":"bruges","betis":"betis","villarreal":"villarreal","lens":"lens","shakhtar":"shakhtar","slavia praga":"slavia-praga","bodo glimt":"bodo-glimt","viking":"viking","sabah":"sabah","lask":"lask"};
const stemmaApp = n => { const f = STEMMI[String(n).toLowerCase().trim()]; if (!f) return null; const i = el("img", "stemma"); i.src = `${API}/img/stemmi/${f}.svg`; i.alt = ""; return i; };
async function aggiornaLive() {
  const b = $("#live"), q = P?.contenuti?.prossima, t = Date.parse(q?.inizio || ""), adesso = Date.now();
  if (!t || adesso < t - 30 * 60e3 || adesso > t + 3 * 3600e3) { b.hidden = true; return; }
  if (document.hidden) return;
  let d; try { d = await chiama("/api/live"); } catch { return; }
  if (!d.attiva) { b.hidden = true; return; }
  if (!["in corso", "intervallo", "finita"].includes(d.fase)) { if (d.fase !== "sconosciuta") b.hidden = true; return; }
  b.textContent = ""; b.classList.toggle("finita", d.fase === "finita");
  const tempo = el("span", "tempo"); tempo.append(el("i"), document.createTextNode(d.fase === "in corso" ? "Live " + d.minuto : d.minuto));
  const sq = (n, prima) => { const s = el("span", "sq"), st = stemmaApp(n); if (prima && st) s.append(st); s.append(document.createTextNode(n)); if (!prima && st) s.append(st); return s; };
  const gara = el("span", "gara"); gara.append(sq(d.casa.nome, true), el("b", "ris", `${d.casa.gol} - ${d.ospiti.gol}`), sq(d.ospiti.nome, false));
  b.append(tempo, gara);
  const NOMI = { gol: "Gol", rigore: "Rigore", autogol: "Autogol", rosso: "Rosso" };
  const righe = (d.eventi || []).filter(x => x.tipo !== "giallo").map(x => `${NOMI[x.tipo]} ${x.giocatore} ${x.minuto}`.trim());
  if (righe.length) b.append(el("span", "eventi", righe.join(" · ")));
  const f = el("a", "fonte", "Powered by SportScore"); f.href = "https://sportscore.com/"; f.rel = "dofollow"; f.onclick = e => { e.preventDefault(); e.stopPropagation(); apriLink(f.href); }; b.append(f);
  b.hidden = false;
}
$("#live").onclick = () => apri("vigilia");
pubblico().then(aggiornaLive).catch(() => {});
setInterval(aggiornaLive, 30000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) aggiornaLive(); });

/* Schermata d'avvio: sparisce a fine animazione, o dopo 3 secondi se l'animazione non parte. */
const avvio = $("#avvio");
const togliAvvio = () => avvio?.classList.add("via");
avvio?.addEventListener("animationend", e => { if (e.target === avvio) togliAvvio(); });
setTimeout(togliAvvio, 3000);

/* Notifiche: pagelle aperte, nuova Vigilia, nuova analisi, nuovo racconto. Il server scrive al topic "tutti".
   Il plugin c'è solo nelle build con Firebase configurato: senza, l'app funziona come prima. */
function apriDaNotifica(d = {}) {
  if (d.sezione === "storia") { if (d.url) apriLink(d.url); return; }
  if (!SCHERMI[d.sezione]) return;
  apri(d.sezione).then(async () => {
    if (d.sezione !== "analisi" || !d.id) return;
    const a = (await pubblico().catch(() => null))?.contenuti?.analisi?.find(x => x.id === d.id);
    if (a) leggi(a);
  });
}
const FM = window.Capacitor?.isPluginAvailable?.("FirebaseMessaging") ? window.Capacitor.Plugins.FirebaseMessaging : null;
// L'ascolto parte subito: se l'app si apre toccando una notifica, va nella sezione giusta.
FM?.addListener("notificationActionPerformed", e => apriDaNotifica(e?.notification?.data));
async function avviaNotifiche() {
  const F = FM;
  if (!F) return;
  try {
    let s = await F.checkPermissions();
    if (s.receive !== "granted" && s.receive !== "denied") s = await F.requestPermissions();
    if (s.receive === "granted") await F.subscribeToTopic({ topic: "tutti" });
  } catch {}
}
// Il permesso si chiede dopo la schermata d'avvio, così non la copre.
setTimeout(avviaNotifiche, 2500);

apri("notizie");
