import { PAGINE, slugPartita, elencoPagelle, GIOCATORI } from "../_middleware.js";
// API di Roma+. Binding richiesto nel progetto Pages: D1 con nome DB.
const COOKIE = "cr_tifoso";
const ANNO = 60 * 60 * 24 * 365;
const SETTORI = ["Curva Sud", "Curva Nord", "Distinti Sud", "Distinti Nord", "Tribuna Tevere", "Tribuna Monte Mario"];
// Fonti delle notizie (decise da Andrea il 10 novembre): solo queste otto, e dei giornali generalisti solo gli articoli sulla Roma.
// Ogni fonte ha uno o più indirizzi: si usa il primo che risponde con almeno una notizia valida.
// L'ultimo indirizzo di Il Romanista, Il Tempo, Sky Sport e Il Messaggero è Google News filtrato sul sito, di riserva.
const gnews = q => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=it&gl=IT&ceid=IT:it`;
const FEED = [
  ["RomaNews", ["https://www.romanews.eu/feed/"]],
  ["Forzaroma.info", ["https://www.forzaroma.info/feed/"]],
  ["Corriere dello Sport", ["https://www.corrieredellosport.it/rss/calcio"]],
  ["Voce Giallorossa", ["https://www.vocegiallorossa.it/rss"]],
  ["Il Romanista", ["https://www.ilromanista.eu/feed", "https://www.ilromanista.eu/rss", "https://www.ilromanista.eu/rss.xml", gnews("site:ilromanista.eu when:3d")]],
  ["Il Tempo", ["https://www.iltempo.it/rss/sport.xml", "https://www.iltempo.it/sport/rss", "https://www.iltempo.it/rss/sport/roma.xml", gnews('site:iltempo.it (giallorossi OR Gasperini OR "AS Roma" OR Trigoria) when:4d')]],
  ["Sky Sport", ["https://sport.sky.it/rss/calcio.xml", "https://sport.sky.it/rss/sport_calcio.xml", gnews("site:sport.sky.it Roma calcio when:3d")]],
  ["Il Messaggero", ["https://www.ilmessaggero.it/rss/sport.xml", "https://www.ilmessaggero.it/rss/sport_calcio.xml", gnews("site:ilmessaggero.it/sport Roma when:3d")]]
];
// Giornali che non parlano solo della Roma: resta solo quello che parla della squadra (non della città).
const GENERALISTI = ["Corriere dello Sport", "Il Tempo", "Sky Sport", "Il Messaggero"];
const SULLA_ROMA = /\b(as roma|roma-|-roma|gialloross[io]|gasperini|gasp|trigoria|friedkin|d'amico|massara|ranieri|dybala|malen|soul[eé]|svilar|mancini|cristante|pellegrini|ndicka|hermoso|kon[eé]|wesley|mora|pisilli|curva sud|olimpico)\b/i;
async function scaricaFonte(t, indirizzi) {
  for (const u of indirizzi) {
    try {
      const r = await fetch(u, { headers: { "user-agent": "RomaPlus/1.0 (+https://roma-plus.it)", accept: "application/rss+xml, application/xml, text/xml" } });
      if (!r.ok) continue;
      const l = leggiFeed(t, await r.text());
      if (l.length) return l.map(n => ({ ...n, via: u.startsWith("https://news.google.com/") ? "google" : "feed" }));
    } catch {}
  }
  return [];
}
const PER_TESTATA = 5;
const json = (dati, stato = 200, extra = {}) => new Response(JSON.stringify(dati), { status: stato, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });
const errore = (messaggio, stato = 400) => json({ errore: messaggio }, stato);
const idPartita = s => typeof s === "string" && /^[a-z0-9-]{3,40}$/.test(s);
// Finestra di voto delle pagelle (decisa da Andrea il 9 novembre): 48 ore dal fischio finale.
// Le pagelle automatiche salvano partita.chiusura. Senza quel campo vale la data in fondo all'id:
// si vota fino alla mezzanotte (ora di Roma, CET) di due giorni dopo la gara. Senza data, il voto resta aperto.
const ORE_VOTO = 48;
function chiusuraPagelle(p) {
  if (p?.chiusura) return Date.parse(p.chiusura);
  const d = String(p?.id || "").match(/(\d{4}-\d{2}-\d{2})$/);
  return d ? Date.parse(d[1] + "T00:00:00Z") + 3 * 864e5 - 3600e3 : Infinity;
}
async function pagelleAperte(env, partita) {
  const riga = await env.DB.prepare("SELECT json_extract(valore,'$.partita') p FROM impostazioni WHERE chiave='contenuti'").first("p");
  const p = riga ? JSON.parse(riga) : null;
  return { aperte: !!p && p.id === partita && Date.now() < chiusuraPagelle(p), chiusura: p?.id === partita && chiusuraPagelle(p) < Infinity ? new Date(chiusuraPagelle(p)).toISOString() : null };
}
const nome = s => typeof s === "string" && s.length >= 2 && s.length <= 30 && /^[\p{L} .'-]+$/u.test(s);

// L'app non usa cookie: invia il proprio id nell'intestazione x-tifoso.
function leggiCookie(req) {
  const t = req.headers.get("x-tifoso");
  if (/^[a-f0-9-]{36}$/.test(t || "")) return t;
  const m = (req.headers.get("cookie") || "").match(new RegExp(`(?:^|; )${COOKIE}=([a-f0-9-]{36})`));
  return m ? m[1] : null;
}
const scriviCookie = id => ({ "set-cookie": `${COOKIE}=${id}; Path=/; Max-Age=${ANNO}; HttpOnly; Secure; SameSite=Lax` });

/* Segnalazioni (Apple 1.2, contenuti degli utenti): chi vede un annuncio o un nome in classifica fuori posto lo segnala
   e può nascondere tutto ciò che pubblica quell'utente. Andrea le controlla nel pannello entro 24 ore.
   Stanno in due righe di impostazioni: segnalazioni (lista) e bloccati ({ chi segnala: [autori nascosti] }). */
const NASCOSTO_DOPO = 3;
async function rigaJson(env, chiave, vuoto) {
  const v = await env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave=?").bind(chiave).first("valore").catch(() => null);
  try { return v ? JSON.parse(v) : vuoto; } catch { return vuoto; }
}
const salvaRiga = (env, chiave, valore) => env.DB.prepare("INSERT INTO impostazioni (chiave, valore) VALUES (?,?) ON CONFLICT DO UPDATE SET valore=excluded.valore, aggiornato=CURRENT_TIMESTAMP").bind(chiave, JSON.stringify(valore));
async function filtroSegnalazioni(env, id) {
  const [lista, bloccati] = await Promise.all([rigaJson(env, "segnalazioni", []), rigaJson(env, "bloccati", {})]);
  const conta = {};
  for (const x of lista) if (x.stato === "aperta") conta[x.tipo + "|" + x.oggetto] = (conta[x.tipo + "|" + x.oggetto] || 0) + 1;
  const miei = new Set(bloccati[id] || []);
  return (tipo, oggetto, autore) => !(autore && miei.has(autore)) && (conta[tipo + "|" + oggetto] || 0) < NASCOSTO_DOPO;
}
async function segnala(env, id, c, fine) {
  const tipo = c.tipo, oggetto = String(c.oggetto || "").slice(0, 60), motivo = String(c.motivo || "").replace(/\s+/g, " ").trim().slice(0, 200);
  if (!["annuncio", "nome"].includes(tipo) || !oggetto) return errore("Segnalazione non valida");
  const r = tipo === "annuncio"
    ? await env.DB.prepare("SELECT tifoso_id autore, tipo || ' ' || partita || ', ' || settore || ', ' || quanti || ' posti, ' || prezzo || ' euro, ' || contatto testo FROM annunci WHERE id=?").bind(oggetto).first()
    : await env.DB.prepare("SELECT tifoso_id autore, nickname testo FROM tifosi WHERE nickname=?").bind(oggetto).first();
  if (!r) return errore("Contenuto non trovato", 404);
  if (r.autore === id) return errore("Non puoi segnalare un tuo contenuto");
  const lista = await rigaJson(env, "segnalazioni", []), oggi = giorno();
  if (lista.filter(x => x.da === id && x.creato.slice(0, 10) === oggi).length >= 20) return errore("Troppe segnalazioni per oggi", 429);
  if (!lista.some(x => x.tipo === tipo && x.oggetto === oggetto && x.da === id && x.stato === "aperta"))
    lista.unshift({ id: crypto.randomUUID(), tipo, oggetto, testo: r.testo, autore: r.autore, da: id, motivo, stato: "aperta", creato: new Date().toISOString() });
  const scritture = [salvaRiga(env, "segnalazioni", lista.slice(0, 500))];
  if (c.blocca) {
    const bloccati = await rigaJson(env, "bloccati", {});
    bloccati[id] = [...new Set([r.autore, ...(bloccati[id] || [])])].slice(0, 200);
    scritture.push(salvaRiga(env, "bloccati", bloccati));
  }
  await env.DB.batch(scritture);
  return fine({ ok: true });
}
async function stato(env, id, partita, prossima) {
  const [voti, pron, form, annunci] = await env.DB.batch([
    env.DB.prepare("SELECT giocatore, AVG(voto) m FROM voti WHERE partita=? GROUP BY giocatore ORDER BY m DESC").bind(partita),
    env.DB.prepare("SELECT casa, ospiti, COUNT(*) n FROM pronostici WHERE partita=? GROUP BY casa, ospiti ORDER BY n DESC LIMIT 1").bind(prossima),
    env.DB.prepare("SELECT giocatori FROM formazioni WHERE partita=?").bind(prossima),
    env.DB.prepare("SELECT id, tifoso_id, tipo, partita, settore, quanti, prezzo, contatto, creato FROM annunci ORDER BY creato DESC LIMIT 200")
  ]);
  const schede = await env.DB.prepare("SELECT COUNT(DISTINCT tifoso_id) n FROM voti WHERE partita=?").bind(partita).first("n");
  const conti = {}, visibile = await filtroSegnalazioni(env, id);
  for (const r of form.results) for (const g of JSON.parse(r.giocatori)) conti[g] = (conti[g] || 0) + 1;
  const miei = { pagella: null, pronostico: null, formazione: null };
  if (id) {
    const [v, p, f] = await env.DB.batch([
      env.DB.prepare("SELECT giocatore, voto FROM voti WHERE partita=? AND tifoso_id=?").bind(partita, id),
      env.DB.prepare("SELECT casa, ospiti FROM pronostici WHERE partita=? AND tifoso_id=?").bind(prossima, id),
      env.DB.prepare("SELECT giocatori FROM formazioni WHERE partita=? AND tifoso_id=?").bind(prossima, id)
    ]);
    if (v.results.length) miei.pagella = Object.fromEntries(v.results.map(r => [r.giocatore, r.voto]));
    if (p.results.length) miei.pronostico = p.results[0];
    if (f.results.length) miei.formazione = JSON.parse(f.results[0].giocatori);
  }
  return {
    schede,
    medie: voti.results.map(r => ({ n: r.giocatore, m: r.m })),
    pronostico: pron.results[0] || null,
    formazioni: { n: form.results.length, conti },
    miei,
    annunci: annunci.results.filter(a => a.tifoso_id === id || visibile("annuncio", a.id, a.tifoso_id)).map(({ tifoso_id, ...a }) => ({ ...a, mio: tifoso_id === id }))
  };
}

const ENTITA = { eacute: "é", egrave: "è", agrave: "à", igrave: "ì", ograve: "ò", ugrave: "ù", Eacute: "É", Egrave: "È", Agrave: "À", Igrave: "Ì", Ograve: "Ò", Ugrave: "Ù", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", laquo: "«", raquo: "»", ndash: "–", mdash: "—", hellip: "…", nbsp: " ", quot: '"', apos: "'", lt: "<", gt: ">" };
const pulisci = s => s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "")
  .replace(/&amp;/g, "&")
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&([a-z]+);/gi, (x, n) => ENTITA[n] ?? x).trim();
const tag = (x, t) => (x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) || [])[1] || "";
function foto(x) {
  const m = x.match(/<media:content[^>]+url="([^"]+)"/) || x.match(/<enclosure[^>]+url="([^"]+)"/) || x.match(/<media:thumbnail[^>]+url="([^"]+)"/) || x.match(/<img[^>]+src="([^"]+)"/);
  return m && m[1].startsWith("https://") ? m[1].replace(/&amp;/g, "&") : null;
}
function leggiFeed(testata, xml) {
  return (xml.match(/<item[\s>][\s\S]*?<\/item>/g) || []).map(x => {
    const url = pulisci(tag(x, "link"));
    return { t: testata, titolo: pulisci(tag(x, "title")), url, foto: foto(x), data: Date.parse(pulisci(tag(x, "pubDate"))) || 0 };
  }).filter(n => n.titolo && n.url.startsWith("https://"))
    .filter(n => testata !== "Corriere dello Sport" || n.url.includes("/roma/"))
    // Il Tempo, Sky Sport e Il Messaggero: solo articoli sulla Roma calcio, mai cronaca della città.
    .filter(n => !GENERALISTI.includes(testata) || testata === "Corriere dello Sport" || (SULLA_ROMA.test(n.titolo) && !/\blazio\b/i.test(n.titolo.replace(/roma-lazio|lazio-roma/ig, "")) || /\/(as-?roma|calcio\/squadre\/roma|sport\/roma)\//i.test(n.url)))
    // Google News aggiunge " - Nome testata" in fondo al titolo: si toglie.
    .map(n => n.url.startsWith("https://news.google.com/") ? { ...n, titolo: n.titolo.replace(/\s+-\s+[^-]+$/, "") } : n)
    .filter(n => !n.titolo.startsWith("ALTRE NOTIZIE"));
}
async function notizie(ctx) {
  const chiave = new Request(new URL("/api/notizie", ctx.request.url));
  const inCache = await caches.default.match(chiave);
  if (inCache) return inCache;
  const risposte = await Promise.allSettled(FEED.map(([t, u]) => scaricaFonte(t, u)));
  const tutte = risposte.flatMap(r => r.status === "fulfilled" ? r.value : []).sort((a, b) => b.data - a.data);
  const viste = new Set(), gruppi = new Map();
  for (const n of tutte) {
    if (viste.has(n.url)) continue;
    viste.add(n.url);
    const g = gruppi.get(n.t) || [];
    if (g.length < PER_TESTATA) { g.push(n); gruppi.set(n.t, g); }
  }
  const lista = [];
  for (let i = 0; i < PER_TESTATA; i++) for (const g of gruppi.values()) if (g[i]) lista.push(g[i]);
  const fonti = Object.fromEntries(FEED.map(([t], i) => [t, risposte[i].status === "fulfilled" ? (risposte[i].value.length ? `${risposte[i].value.length} (${risposte[i].value[0].via})` : 0) : "errore"]));
  const risposta = new Response(JSON.stringify({ notizie: lista, fonti }), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300" } });
  if (lista.length) ctx.waitUntil(caches.default.put(chiave, risposta.clone()));
  if (ctx.env.DB) ctx.waitUntil(salvaArchivio(ctx.env, tutte).catch(() => {}));
  return risposta;
}

// Archivio per l'app: le notizie restano nel database, così scorrendo si torna indietro nel tempo.
// L'app usa le stesse fonti del sito. L'archivio si riempie anche quando il sito scarica i feed, così resta sempre aggiornato.
// Fonti dell'app (decise da Andrea il 10 novembre): Corriere dello Sport, Sky Sport (solo Roma, filtro SULLA_ROMA), Il Romanista, Voce Giallorossa. Il sito le usa tutte.
const FONTI_APP = ["Corriere dello Sport", "Sky Sport", "Il Romanista", "Voce Giallorossa"];
// Notizie senza foto (Il Romanista da Google News, feed senza immagini): al posto della foto il logo R+, nell'app anche per le versioni già installate.
const FOTO_RISERVA = "https://roma-plus.it/img/brand/icona-app.png";
const SOLO_APP = `testata IN (${FONTI_APP.map(() => "?").join(",")})`;
const salvaArchivio = (env, tutte) => { const l = tutte.filter(n => n.data); return l.length ? env.DB.batch(l.map(n => env.DB.prepare("INSERT OR IGNORE INTO notizie (url, testata, titolo, foto, pubblicata) VALUES (?,?,?,?,?)").bind(n.url, n.t, n.titolo, n.foto, new Date(n.data).toISOString()))) : null; };
// Di norma ogni 5 minuti; quando nell'app si tira giù la lista basta un minuto dall'ultimo aggiornamento.
async function aggiornaArchivio(env, intervallo = 3e5) {
  const ora = Date.now(), ultimo = Number(await env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='notizie_agg'").first("valore")) || 0;
  if (ora - ultimo < intervallo) return;
  await env.DB.prepare("INSERT INTO impostazioni (chiave, valore) VALUES ('notizie_agg',?) ON CONFLICT DO UPDATE SET valore=excluded.valore").bind(String(ora)).run();
  const esiti = await Promise.allSettled(FEED.filter(([t]) => FONTI_APP.includes(t)).map(([t, u]) => scaricaFonte(t, u)));
  await salvaArchivio(env, esiti.flatMap(e => e.status === "fulfilled" ? e.value : []));
}
async function archivioNotizie(ctx, url) {
  const { env } = ctx, prima = url.searchParams.get("prima"), n = Math.min(50, Math.max(1, Number(url.searchParams.get("limite")) || 30));
  if (prima && !/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(prima)) return errore("Data non valida");
  const vuoto = !(await env.DB.prepare(`SELECT 1 x FROM notizie WHERE ${SOLO_APP} LIMIT 1`).bind(...FONTI_APP).first("x"));
  const forza = !prima && url.searchParams.get("aggiorna") === "1";
  if (vuoto || forza) await aggiornaArchivio(env, vuoto ? 3e5 : 6e4).catch(() => {}); else ctx.waitUntil(aggiornaArchivio(env));
  const q = prima ? env.DB.prepare(`SELECT testata, titolo, url, foto, pubblicata FROM notizie WHERE ${SOLO_APP} AND pubblicata < ? ORDER BY pubblicata DESC LIMIT ?`).bind(...FONTI_APP, prima, n) : env.DB.prepare(`SELECT testata, titolo, url, foto, pubblicata FROM notizie WHERE ${SOLO_APP} ORDER BY pubblicata DESC LIMIT ?`).bind(...FONTI_APP, n);
  return json({ notizie: (await q.all()).results.map(n => n.foto ? n : { ...n, foto: FOTO_RISERVA }) });
}

const giorno = () => new Date(Date.now() + 36e5).toISOString().slice(0, 10);
async function sha(testo) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(testo));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
// Le bozze e i contenuti con data futura restano fuori dal sito.
const visibili = l => (l || []).filter(a => a.stato !== "bozza" && (!a.data || a.data <= giorno()));
async function pubblico(env) {
  const [c, p, i, s, a, ra] = await env.DB.batch([
    env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='contenuti'"),
    env.DB.prepare("SELECT id, nome, link, foto, tipo, asin FROM prodotti WHERE attivo=1 ORDER BY ordine, nome"),
    env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='immagini'"),
    env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='seo'"),
    env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='pagelle'"),
    env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='radio'")
  ]);
  const contenuti = c.results[0] ? JSON.parse(c.results[0].valore) : null;
  if (contenuti) contenuti.analisi = visibili(contenuti.analisi);
  if (contenuti) contenuti.storia = (contenuti.storia || []).filter(a => a.stato !== "bozza").map(({ id, anno, titolo, riassunto, copertina, posizione }) => ({ id, anno, titolo, riassunto, copertina, posizione }));
  const seo = s.results[0] ? JSON.parse(s.results[0].valore) : {};
  return json({
    contenuti,
    radio: !!ra.results[0],
    pagelle: elencoPagelle(a.results[0]?.valore, contenuti?.partita).map(({ slug, casa, ospiti, golCasa, golOspiti, data, competizione }) => ({ slug, casa, ospiti, golCasa, golOspiti, data, competizione })),
    seo: { pagine: seo.pagine || {} },
    prodotti: p.results,
    immagini: i.results[0] ? JSON.parse(i.results[0].valore) : {}
  });
}
// Palinsesto uguale per tutti: l'ordine cambia ogni giorno, la posizione dipende solo dall'ora.
async function radio(env) {
  const [a, c] = await env.DB.batch([env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='radio'"), env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='contenuti'")]);
  const lista = a.results[0] ? JSON.parse(a.results[0].valore) : [], storia = c.results[0] ? JSON.parse(c.results[0].valore).storia || [] : [];
  const ora = Date.now(), seme = Math.floor(ora / 864e5);
  const pesa = id => [...id].reduce((h, x) => (h * 31 + x.charCodeAt(0)) >>> 0, seme);
  const brani = lista.map(x => { const s = storia.find(y => y.id === x.id); return s && { ...x, titolo: s.titolo, anno: s.anno, peso: pesa(x.id) % 9973 }; }).filter(Boolean).sort((a, b) => a.peso - b.peso).map(({ peso, ...x }) => x);
  return json({ brani, secondi: Math.floor(ora / 1000) % 86400 });
}
async function audio(env, req, id) {
  if (!env.AUDIO || !/^[\w-]+$/.test(id || "")) return errore("Audio non trovato", 404);
  const m = (req.headers.get("range") || "").match(/^bytes=(\d+)-(\d*)$/);
  const testa = await env.AUDIO.head(`radio/${id}.mp3`);
  if (!testa) return errore("Audio non trovato", 404);
  const base = { "content-type": "audio/mpeg", "accept-ranges": "bytes", "cache-control": "public, max-age=86400" };
  if (!m) return new Response((await env.AUDIO.get(`radio/${id}.mp3`)).body, { headers: { ...base, "content-length": String(testa.size) } });
  const da = +m[1], a = Math.min(m[2] ? +m[2] : testa.size - 1, testa.size - 1);
  if (da >= testa.size) return new Response(null, { status: 416, headers: { "content-range": `bytes */${testa.size}` } });
  const o = await env.AUDIO.get(`radio/${id}.mp3`, { range: { offset: da, length: a - da + 1 } });
  return new Response(o.body, { status: 206, headers: { ...base, "content-range": `bytes ${da}-${a}/${testa.size}`, "content-length": String(a - da + 1) } });
}
async function immagine(env, id) {
  if (!/^[a-f0-9-]{36}$/.test(id || "")) return errore("Immagine non trovata", 404);
  const r = await env.DB.prepare("SELECT mime, dati FROM immagini WHERE id=?").bind(id).first();
  if (!r) return errore("Immagine non trovata", 404);
  const bin = Uint8Array.from(atob(r.dati), x => x.charCodeAt(0));
  return new Response(bin, { headers: { "content-type": r.mime, "cache-control": "public, max-age=604800", "x-content-type-options": "nosniff" } });
}
async function visita(ctx) {
  const { request: req, env } = ctx;
  const c = await req.json().catch(() => ({}));
  const sezione = ["casa", "pagella", "vigilia", "analisi", "biglietti", "giocatori", "storia", "radio"].includes(c.sezione) ? c.sezione : "altro";
  const dispositivo = c.mobile ? "mobile" : "computer", g = giorno();
  const impronta = (await sha(`${g}|${req.headers.get("cf-connecting-ip")}|${req.headers.get("user-agent")}`)).slice(0, 24);
  ctx.waitUntil(env.DB.batch([
    env.DB.prepare("INSERT INTO visite (giorno, sezione, dispositivo, n) VALUES (?,?,?,1) ON CONFLICT DO UPDATE SET n=n+1").bind(g, sezione, dispositivo),
    env.DB.prepare("INSERT OR IGNORE INTO visitatori (giorno, impronta) VALUES (?,?)").bind(g, impronta),
    env.DB.prepare("DELETE FROM visitatori WHERE giorno < date('now','-40 day')")
  ]));
  return new Response(null, { status: 204 });
}
async function ascolto(ctx) {
  const { request: req, env } = ctx, c = await req.json().catch(() => ({}));
  if (!["avvio", "battito"].includes(c.evento) || !/^[\w-]{1,60}$/.test(c.brano || "")) return new Response(null, { status: 204 });
  const g = giorno(), impronta = (await sha(`radio|${g}|${req.headers.get("cf-connecting-ip")}|${req.headers.get("user-agent")}`)).slice(0, 24);
  ctx.waitUntil(env.DB.batch([
    env.DB.prepare("INSERT INTO ascolti (giorno, brano, avvii, secondi) VALUES (?,?,?,?) ON CONFLICT DO UPDATE SET avvii=avvii+excluded.avvii, secondi=secondi+excluded.secondi").bind(g, c.brano, c.evento === "avvio" ? 1 : 0, c.evento === "battito" ? 30 : 0),
    env.DB.prepare("INSERT OR IGNORE INTO ascoltatori (giorno, impronta) VALUES (?,?)").bind(g, impronta),
    env.DB.prepare("INSERT INTO in_ascolto (impronta, visto) VALUES (?,?) ON CONFLICT DO UPDATE SET visto=excluded.visto").bind(impronta, Date.now()),
    env.DB.prepare("DELETE FROM in_ascolto WHERE visto < ?").bind(Date.now() - 36e5)
  ]));
  return new Response(null, { status: 204 });
}
async function clic(ctx) {
  const c = await ctx.request.json().catch(() => ({}));
  if (typeof c.prodotto !== "string" || c.prodotto.length > 60) return new Response(null, { status: 204 });
  ctx.waitUntil(ctx.env.DB.prepare("INSERT INTO clic (giorno, prodotto, n) SELECT ?, id, 1 FROM prodotti WHERE id=? ON CONFLICT DO UPDATE SET n=n+1").bind(giorno(), c.prodotto).run());
  return new Response(null, { status: 204 });
}

/* Classifica dei pronostici: 5 punti al risultato esatto, 2 al segno giusto. */
const PUNTI = `CASE WHEN p.casa=r.casa AND p.ospiti=r.ospiti THEN 5
  WHEN (p.casa>p.ospiti)-(p.casa<p.ospiti)=(r.casa>r.ospiti)-(r.casa<r.ospiti) THEN 2 ELSE 0 END`;
const VIETATI = ["admin", "curvaroma", "romaplus", "roma-plus", "asroma", "ufficiale", "moderator", "stronz", "cazz", "merd", "vaffa", "coglion", "puttan", "troia", "negro", "frocio", "ebreo", "mussolini", "hitler", "duce", "nazi"];
async function classifica(env, id) {
  const [l, u, io] = await env.DB.batch([
    env.DB.prepare(`SELECT t.tifoso_id, t.nickname nome, SUM(${PUNTI}) punti, SUM(p.casa=r.casa AND p.ospiti=r.ospiti) esatti, COUNT(*) giocate
      FROM tifosi t JOIN pronostici p ON p.tifoso_id=t.tifoso_id JOIN risultati r ON r.partita=p.partita
      GROUP BY t.tifoso_id ORDER BY punti DESC, esatti DESC, giocate ASC, t.creato ASC LIMIT 1000`),
    env.DB.prepare("SELECT nome, casa, ospiti FROM risultati ORDER BY creato DESC LIMIT 1"),
    env.DB.prepare("SELECT nickname FROM tifosi WHERE tifoso_id=?").bind(id || "")
  ]);
  let pos = 0, prima = null;
  const visibile = await filtroSegnalazioni(env, id);
  const righe = l.results.filter(r => r.tifoso_id === id || visibile("nome", r.nome, r.tifoso_id)).map((r, i) => {
    const chiave = `${r.punti}|${r.esatti}`;
    if (chiave !== prima) { pos = i + 1; prima = chiave; }
    return { ...r, pos };
  });
  const mio = righe.find(r => r.tifoso_id === id);
  const pulita = ({ tifoso_id, ...r }) => r;
  return {
    righe: righe.slice(0, 20).map(pulita),
    ultima: u.results[0] || null,
    io: { nome: io.results[0]?.nickname || null, riga: mio ? pulita(mio) : null }
  };
}
async function scegliNome(ctx, id, c, fine) {
  const { request: req, env } = ctx;
  const n = String(c.nome || "").trim().replace(/\s+/g, " ");
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ._-]{2,19}$/u.test(n)) return fine({ errore: "Usa da 3 a 20 tra lettere e numeri" }, 400);
  const piano = n.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
  if (VIETATI.some(v => piano.includes(v))) return fine({ errore: "Questo nome non si può usare" }, 400);
  const ora = Date.now(), ip = (await sha("nome|" + req.headers.get("cf-connecting-ip"))).slice(0, 24);
  const t = await env.DB.prepare("SELECT n, scade FROM tentativi WHERE impronta=?").bind(ip).first();
  if (t && t.scade > ora && t.n >= 10) return fine({ errore: "Troppi tentativi. Riprova domani." }, 429);
  await env.DB.prepare("INSERT INTO tentativi (impronta, n, scade) VALUES (?,1,?) ON CONFLICT(impronta) DO UPDATE SET n=CASE WHEN scade>? THEN n+1 ELSE 1 END, scade=CASE WHEN scade>? THEN scade ELSE excluded.scade END").bind(ip, ora + 864e5, ora, ora).run();
  const preso = await env.DB.prepare("SELECT tifoso_id FROM tifosi WHERE nickname=?").bind(n).first("tifoso_id");
  if (preso && preso !== id) return fine({ errore: "Nome già preso" }, 409);
  await env.DB.prepare("INSERT INTO tifosi (tifoso_id, nickname) VALUES (?,?) ON CONFLICT(tifoso_id) DO UPDATE SET nickname=excluded.nickname").bind(id, n).run();
  return fine({ ok: true, nome: n });
}

/* Pannello admin. La password sta nella variabile segreta ADMIN_PASSWORD del progetto Pages. */
const ADMIN_COOKIE = "cr_admin";
async function firma(env, testo) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.ADMIN_PASSWORD), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const b = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(testo));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
const SETTIMANA = 7 * 864e5;
async function adminValido(req, env) {
  const m = (req.headers.get("cookie") || "").match(new RegExp(`(?:^|; )${ADMIN_COOKIE}=(\\d+)\\.([a-f0-9]{64})`));
  if (!m || +m[1] < Date.now() || (await firma(env, m[1])) !== m[2]) return false;
  const d = await leggi2fa(env);
  return !d?.dal || +m[1] - SETTIMANA >= d.dal; // Le sessioni aperte prima di attivare i due fattori non valgono più.
}
const cookieAdmin = async env => { const scade = String(Date.now() + SETTIMANA); return { "set-cookie": `${ADMIN_COOKIE}=${scade}.${await firma(env, scade)}; Path=/api/admin; Max-Age=604800; HttpOnly; Secure; SameSite=Strict` }; };

/* Verifica a due fattori: codice a 6 cifre dell'app di autenticazione, standard TOTP. */
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32(b) { let v = 0, n = 0, o = ""; for (const x of b) { v = (v << 8) | x; n += 8; while (n >= 5) { o += B32[(v >>> (n - 5)) & 31]; n -= 5; } v &= (1 << n) - 1; } return o; }
function daBase32(t) { let v = 0, n = 0; const o = []; for (const c of t) { v = (v << 5) | B32.indexOf(c); n += 5; if (n >= 8) { o.push((v >>> (n - 8)) & 255); n -= 8; } v &= (1 << n) - 1; } return new Uint8Array(o); }
async function totp(segreto, passo) {
  const k = await crypto.subtle.importKey("raw", daBase32(segreto), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const c = new DataView(new ArrayBuffer(8)); c.setUint32(4, passo);
  const h = new Uint8Array(await crypto.subtle.sign("HMAC", k, c.buffer)), i = h[19] & 15;
  return String((new DataView(h.buffer).getUint32(i) & 0x7fffffff) % 1e6).padStart(6, "0");
}
// Accetta anche il codice di 30 secondi prima o dopo, ma mai due volte lo stesso.
async function controllaCodice(d, codice) {
  const ora = Math.floor(Date.now() / 3e4);
  for (const p of [ora - 1, ora, ora + 1]) if (p > (d.ultimo || 0) && await totp(d.segreto, p) === codice) return p;
  return 0;
}
const leggi2fa = async env => { const v = await env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='admin_2fa'").first("valore"); return v ? JSON.parse(v) : null; };
const scrivi2fa = (env, d) => env.DB.prepare("INSERT INTO impostazioni (chiave, valore) VALUES ('admin_2fa',?) ON CONFLICT DO UPDATE SET valore=excluded.valore, aggiornato=CURRENT_TIMESTAMP").bind(JSON.stringify(d)).run();
// Applica le modifiche di una bozza senza toccare gli altri campi. Le liste vengono sostituite.
function unisci(base, modifiche) {
  for (const [k, v] of Object.entries(modifiche)) {
    if (k === "__proto__" || k === "constructor") continue;
    if (v && typeof v === "object" && !Array.isArray(v)) unisci(base[k] ||= {}, v);
    else base[k] = v;
  }
}
/* Notifiche dell'app con Firebase Cloud Messaging. Ogni app iscritta riceve i messaggi del topic "tutti",
   così il server manda un solo messaggio per novità. Servono le variabili segrete FCM_SERVICE_ACCOUNT
   (il JSON dell'account di servizio Firebase): senza, non parte niente e il resto funziona uguale. */
const TOPIC = "tutti";
let FCM_TOKEN = null;
const b64url = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const testo64 = s => b64url(new TextEncoder().encode(s));
async function tokenFcm(sa) {
  if (FCM_TOKEN && FCM_TOKEN.scade > Date.now() + 6e4) return FCM_TOKEN.valore;
  const pem = sa.private_key.replace(/-----[^-]+-----|\s/g, "");
  const chiave = await crypto.subtle.importKey("pkcs8", Uint8Array.from(atob(pem), c => c.charCodeAt(0)), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const ora = Math.floor(Date.now() / 1000);
  const corpo = `${testo64(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${testo64(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: ora, exp: ora + 3600 }))}`;
  const firma = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", chiave, new TextEncoder().encode(corpo));
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${corpo}.${b64url(firma)}` });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new Error("Accesso a Firebase non riuscito");
  FCM_TOKEN = { valore: d.access_token, scade: Date.now() + (d.expires_in || 3600) * 1000 };
  return FCM_TOKEN.valore;
}
async function inviaNotifica(env, n) {
  if (!env.FCM_SERVICE_ACCOUNT) return "Notifiche spente: manca FCM_SERVICE_ACCOUNT";
  const sa = JSON.parse(env.FCM_SERVICE_ACCOUNT);
  const message = {
    topic: TOPIC,
    notification: { title: n.titolo, body: n.testo },
    data: { sezione: n.sezione, id: n.id || "", url: n.url || "" },
    android: { priority: "high", notification: { icon: "ic_notifica", color: "#7E031A", sound: "default" } },
    apns: { payload: { aps: { sound: "default" } } }
  };
  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, { method: "POST", headers: { authorization: `Bearer ${await tokenFcm(sa)}`, "content-type": "application/json" }, body: JSON.stringify({ message }) });
  return r.ok ? "inviata" : `errore ${r.status}`;
}
// Confronta i contenuti prima e dopo una modifica: pagelle nuove, nuova Vigilia, nuove analisi e nuovi racconti.
function novita(prima, dopo) {
  const out = [], p = dopo?.partita, q = dopo?.prossima;
  if (p?.id && p.id !== prima?.partita?.id && p.titolari?.length) out.push({ titolo: "Pagelle aperte", testo: `${p.casa}-${p.ospiti} ${p.golCasa}-${p.golOspiti}: dai il tuo voto ai giocatori della Roma.`, sezione: "pagelle" });
  if (q?.id && q.id !== prima?.prossima?.id) out.push({ titolo: `Vigilia: ${q.casa}-${q.ospiti}`, testo: `${q.quando}. Scegli la formazione e indovina il risultato.`, sezione: "vigilia" });
  const visti = new Set(visibili(prima?.analisi).map(a => a.id));
  for (const a of visibili(dopo?.analisi)) if (!visti.has(a.id)) out.push({ titolo: "Nuova analisi", testo: a.titolo, sezione: "analisi", id: a.id });
  const fuori = a => a.stato !== "bozza";
  const giaStoria = new Set((prima?.storia || []).filter(fuori).map(a => a.id)), nuove = (dopo?.storia || []).filter(fuori).filter(a => !giaStoria.has(a.id));
  if (nuove.length === 1) out.push({ titolo: "Nuovo racconto nella Storia", testo: nuove[0].titolo, sezione: "storia", id: nuove[0].id, url: `${BASE_SITO}/storia/${nuove[0].id}` });
  else if (nuove.length > 1) out.push({ titolo: "Nuovi racconti nella Storia", testo: `${nuove.length} nuovi racconti sulla storia della Roma.`, sezione: "storia", url: `${BASE_SITO}/storia` });
  return out.slice(0, 4);
}
// Invia le novità e tiene le ultime 30 nella riga notifiche, così si vede cosa è partito.
async function avvisa(env, prima, dopo) {
  const lista = novita(prima, dopo);
  if (!lista.length) return;
  const esiti = [];
  for (const n of lista) esiti.push({ ...n, quando: new Date().toISOString(), esito: await inviaNotifica(env, n).catch(e => `errore: ${e.message}`) });
  const r = await env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='notifiche'").first("valore").catch(() => null);
  const log = [...esiti, ...(r ? JSON.parse(r) : [])].slice(0, 30);
  await env.DB.prepare("INSERT INTO impostazioni (chiave, valore) VALUES ('notifiche',?) ON CONFLICT DO UPDATE SET valore=excluded.valore, aggiornato=CURRENT_TIMESTAMP").bind(JSON.stringify(log)).run();
}
const BASE_SITO = "https://roma-plus.it";

// Tiene nell'archivio ogni partita, così i voti restano leggibili anche dopo la gara successiva.
async function archivioPagelle(env, ...partite) {
  const r = await env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='pagelle'").first("valore");
  const lista = r ? JSON.parse(r) : [];
  for (const q of partite) {
    if (!q?.id) continue;
    const i = lista.findIndex(x => x.id === q.id);
    if (i >= 0) lista[i] = { ...q, slug: lista[i].slug };
    else lista.unshift({ ...q, slug: slugPartita(q) });
  }
  return env.DB.prepare("INSERT INTO impostazioni (chiave, valore) VALUES ('pagelle',?) ON CONFLICT DO UPDATE SET valore=excluded.valore, aggiornato=CURRENT_TIMESTAMP").bind(JSON.stringify(lista));
}
async function admin(ctx, p) {
  const { request: req, env } = ctx;
  if (!env.ADMIN_PASSWORD) return errore("Imposta la variabile ADMIN_PASSWORD su Cloudflare", 503);
  const origine = req.headers.get("origin");
  if (req.method !== "GET" && origine && new URL(origine).host !== new URL(req.url).host) return errore("Origine non valida", 403);
  if (p[0] === "login" && req.method === "POST") {
    const ip = (await sha("login|" + req.headers.get("cf-connecting-ip"))).slice(0, 24), ora = Date.now();
    const t = await env.DB.prepare("SELECT n, scade FROM tentativi WHERE impronta=?").bind(ip).first();
    if (t && t.scade > ora && t.n >= 5) return errore("Troppi tentativi. Riprova tra 15 minuti.", 429);
    const { password, codice } = await req.json().catch(() => ({}));
    const sbagliato = async testo => {
      await env.DB.prepare("INSERT INTO tentativi (impronta, n, scade) VALUES (?,1,?) ON CONFLICT DO UPDATE SET n=CASE WHEN scade>? THEN n+1 ELSE 1 END, scade=?").bind(ip, ora + 9e5, ora, ora + 9e5).run();
      return errore(testo, 401);
    };
    if (typeof password !== "string" || password !== env.ADMIN_PASSWORD) return sbagliato("Password errata");
    const d = await leggi2fa(env);
    if (d?.attiva) {
      const c = String(codice || "").trim().toLowerCase();
      if (!c) return json({ serveCodice: true });
      const passo = /^\d{6}$/.test(c) ? await controllaCodice(d, c) : 0;
      if (passo) d.ultimo = passo;
      else {
        const h = await sha("recupero|" + c), i = (d.recupero || []).indexOf(h);
        if (i < 0) return sbagliato("Codice errato");
        d.recupero.splice(i, 1);
      }
      await scrivi2fa(env, d);
    }
    await env.DB.prepare("DELETE FROM tentativi WHERE impronta=?").bind(ip).run();
    return json({ ok: true }, 200, await cookieAdmin(env));
  }
  if (!(await adminValido(req, env))) return errore("Accesso richiesto", 401);
  if (p[0] === "esci") return json({ ok: true }, 200, { "set-cookie": `${ADMIN_COOKIE}=; Path=/api/admin; Max-Age=0; HttpOnly; Secure; SameSite=Strict` });
  if (p[0] === "radio") {
    if (p[1] === "stato") { const v = await env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='radio'").first("valore"); return json({ brani: v ? JSON.parse(v) : [] }); }
    if (p[1] === "ascolti") {
      const [ora, oggi, unici, giorni, brani] = await env.DB.batch([
        env.DB.prepare("SELECT COUNT(*) n FROM in_ascolto WHERE visto > ?").bind(Date.now() - 9e4),
        env.DB.prepare("SELECT COALESCE(SUM(avvii),0) avvii, COALESCE(SUM(secondi),0) secondi FROM ascolti WHERE giorno=?").bind(giorno()),
        env.DB.prepare("SELECT giorno, COUNT(*) n FROM ascoltatori WHERE giorno >= date('now','-14 day') GROUP BY giorno ORDER BY giorno"),
        env.DB.prepare("SELECT giorno, SUM(secondi) secondi, SUM(avvii) avvii FROM ascolti WHERE giorno >= date('now','-14 day') GROUP BY giorno ORDER BY giorno"),
        env.DB.prepare("SELECT brano, SUM(secondi) secondi, SUM(avvii) avvii FROM ascolti WHERE giorno >= date('now','-14 day') GROUP BY brano ORDER BY secondi DESC LIMIT 15")
      ]);
      return json({ ora: ora.results[0].n, oggi: oggi.results[0], ascoltatori: unici.results, giorni: giorni.results, brani: brani.results });
    }
    if (!env.GOOGLE_TTS_KEY) return errore("Manca GOOGLE_TTS_KEY su Cloudflare", 503);
    const url = u => `https://texttospeech.googleapis.com/v1/${u}${u.includes("?") ? "&" : "?"}key=${encodeURIComponent(env.GOOGLE_TTS_KEY)}`;
    const leggi = async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error?.message || "Errore di Google"); return d; };
    try {
      // Passa la risposta di Google senza elaborarla: la decodifica la fa il browser.
      if (p[1] === "sintesi" && req.method === "POST") {
        const { voce, testo } = await req.json();
        if (!/^it-IT-[\w-]+$/.test(voce || "") || typeof testo !== "string" || !testo.trim() || new TextEncoder().encode(testo).length > 4900) return errore("Richiesta non valida");
        const r = await fetch(url("text:synthesize"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input: { text: testo }, voice: { languageCode: "it-IT", name: voce }, audioConfig: { audioEncoding: "MP3" } }) });
        return new Response(r.body, { status: r.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
      }
      if (p[1] === "salva" && req.method === "POST") {
        if (!env.AUDIO) return errore("Manca il collegamento AUDIO su Cloudflare", 503);
        const u = new URL(req.url), id = u.searchParams.get("id"), durata = Number(u.searchParams.get("durata"));
        if (!/^[\w-]+$/.test(id || "") || !(durata > 0)) return errore("Richiesta non valida");
        await env.AUDIO.put(`radio/${id}.mp3`, req.body, { httpMetadata: { contentType: "audio/mpeg" } });
        const v = await env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='radio'").first("valore");
        const l = (v ? JSON.parse(v) : []).filter(x => x.id !== id); l.push({ id, durata, v: Date.now() });
        await env.DB.prepare("INSERT INTO impostazioni (chiave, valore) VALUES ('radio',?) ON CONFLICT DO UPDATE SET valore=excluded.valore, aggiornato=CURRENT_TIMESTAMP").bind(JSON.stringify(l)).run();
        return json({ ok: true });
      }
    } catch (e) { return errore(e.message, 502); }
    return errore("Percorso non trovato", 404);
  }
  if (p[0] === "sicurezza") {
    const d = await leggi2fa(env);
    if (req.method === "GET") return json({ attiva: !!d?.attiva, recupero: d?.recupero?.length || 0 });
    const { codice } = await req.json().catch(() => ({}));
    if (p[1] === "avvia") {
      if (d?.attiva) return errore("Già attiva");
      const segreto = base32(crypto.getRandomValues(new Uint8Array(20)));
      await scrivi2fa(env, { segreto, attiva: false });
      return json({ segreto, url: `otpauth://totp/Curva%20Roma:admin?secret=${segreto}&issuer=Curva%20Roma&digits=6&period=30` });
    }
    if (!d) return errore("Prima avvia l'attivazione");
    const passo = await controllaCodice(d, String(codice || "").trim());
    if (!passo) return errore("Codice errato", 400);
    if (p[1] === "disattiva") {
      await env.DB.prepare("DELETE FROM impostazioni WHERE chiave='admin_2fa'").run();
      return json({ ok: true });
    }
    if (p[1] === "conferma") {
      const recupero = [...Array(8)].map(() => [...crypto.getRandomValues(new Uint8Array(4))].map(x => x.toString(16).padStart(2, "0")).join("").replace(/^(.{4})/, "$1-"));
      await scrivi2fa(env, { segreto: d.segreto, attiva: true, ultimo: passo, dal: Date.now(), recupero: await Promise.all(recupero.map(c => sha("recupero|" + c))) });
      return json({ recupero }, 200, await cookieAdmin(env));
    }
  }
  if (p[0] === "riepilogo") {
    const [v, u, s, c, a, pr, vt] = await env.DB.batch([
      env.DB.prepare("SELECT giorno, dispositivo, SUM(n) n FROM visite WHERE giorno >= date('now','-14 day') GROUP BY giorno, dispositivo ORDER BY giorno"),
      env.DB.prepare("SELECT giorno, COUNT(*) n FROM visitatori WHERE giorno >= date('now','-14 day') GROUP BY giorno ORDER BY giorno"),
      env.DB.prepare("SELECT sezione, SUM(n) n FROM visite WHERE giorno >= date('now','-14 day') GROUP BY sezione ORDER BY n DESC"),
      env.DB.prepare("SELECT p.nome, COALESCE(SUM(c.n),0) n FROM prodotti p LEFT JOIN clic c ON c.prodotto=p.id AND c.giorno >= date('now','-14 day') GROUP BY p.id ORDER BY n DESC"),
      env.DB.prepare("SELECT COUNT(*) n FROM annunci"),
      env.DB.prepare("SELECT COUNT(*) n FROM pronostici"),
      env.DB.prepare("SELECT COUNT(DISTINCT tifoso_id) n FROM voti")
    ]);
    return json({ visite: v.results, unici: u.results, sezioni: s.results, clic: c.results, annunci: a.results[0].n, pronostici: pr.results[0].n, votanti: vt.results[0].n });
  }
  if (p[0] === "contenuti") {
    if (req.method === "GET") {
      const r = await env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='contenuti'").first();
      return json({ contenuti: r ? JSON.parse(r.valore) : null });
    }
    const testo = await req.text();
    if (testo.length > 1500000) return errore("Contenuti troppo grandi", 413);
    const c = JSON.parse(testo);
    if (!c.partita?.id || !c.prossima?.id || !Array.isArray(c.classifica)) return errore("Contenuti non validi");
    const vecchi = await env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='contenuti'").first("valore");
    await env.DB.batch([
      env.DB.prepare("INSERT INTO impostazioni (chiave, valore) VALUES ('contenuti',?) ON CONFLICT DO UPDATE SET valore=excluded.valore, aggiornato=CURRENT_TIMESTAMP").bind(testo),
      await archivioPagelle(env, vecchi ? JSON.parse(vecchi).partita : null, c.partita)
    ]);
    if (vecchi) ctx.waitUntil(avvisa(env, JSON.parse(vecchi), c).catch(() => {}));
    return json({ ok: true });
  }
  if (p[0] === "bozze") {
    const riga = await env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='bozze'").first("valore");
    const bozze = riga ? JSON.parse(riga) : [];
    if (req.method === "GET") return json({ bozze });
    const b = bozze.find(x => x.id === p[1]);
    if (req.method !== "POST" || !b) return errore("Bozza non trovata", 404);
    if (b.stato === "pubblicata") return errore("Bozza già pubblicata", 409);
    if (p[2] === "attesa") {
      b.stato = "da-rivedere";
      await env.DB.prepare("UPDATE impostazioni SET valore=?, aggiornato=CURRENT_TIMESTAMP WHERE chiave='bozze'").bind(JSON.stringify(bozze)).run();
      return json({ ok: true });
    }
    if (p[2] === "modifica") {
      // Andrea corregge i testi della bozza prima di pubblicarla: solo i campi di testo, mai indirizzi, immagini o dati del sito.
      const d = await req.json().catch(() => ({})), testo = (x, max) => typeof x === "string" ? x.slice(0, max) : undefined;
      if (b.didascalia != null && testo(d.didascalia, 2200) != null) b.didascalia = testo(d.didascalia, 2200);
      if (b.sito?.articolo && d.articolo && typeof d.articolo === "object") {
        for (const k of ["titolo", "occhiello", "riassunto", "testo", "seoTitolo", "seoDescrizione"]) { const v = testo(d.articolo[k], k === "testo" ? 60000 : 600); if (v != null) b.sito.articolo[k] = v; }
      }
      if ((b.sito?.storia || b.sito?.storiaUrl) && Array.isArray(d.storia)) {
        let originali = b.sito.storia;
        if (!originali) {
          if (!b.sito.storiaUrl.startsWith("https://raw.githubusercontent.com/curvaroma/curvaroma/")) return errore("Indirizzo non valido");
          const r = await fetch(b.sito.storiaUrl);
          if (!r.ok) return errore("Racconti non trovati");
          originali = await r.json();
        }
        for (const a of originali) {
          const n = d.storia.find(x => x && x.id === a.id);
          if (!n) continue;
          for (const k of ["titolo", "occhiello", "riassunto", "testo", "seoTitolo", "seoDescrizione"]) { const v = testo(n[k], k === "testo" ? 60000 : 600); if (v != null) a[k] = v; }
        }
        b.sito.storia = originali;
      }
      b.modificata = new Date().toISOString();
      await env.DB.prepare("UPDATE impostazioni SET valore=?, aggiornato=CURRENT_TIMESTAMP WHERE chiave='bozze'").bind(JSON.stringify(bozze)).run();
      return json({ ok: true, bozza: b });
    }
    if (p[2] !== "pubblica") return errore("Percorso non trovato", 404);
    const scritture = [];
    // Le notifiche partono solo dopo che la pubblicazione è andata a buon fine.
    let notifica = null;
    if (b.sito?.modifiche || b.sito?.articolo || b.sito?.storia || b.sito?.storiaUrl) {
      const v = await env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='contenuti'").first("valore");
      const c = v ? JSON.parse(v) : null;
      if (!c) return errore("Contenuti non trovati");
      const prima = structuredClone(c.partita);
      notifica = [JSON.parse(v), c];
      unisci(c, b.sito.modifiche || {});
      if (b.sito.articolo) {
        c.analisi ||= [];
        if (c.analisi.some(a => a.id === b.sito.articolo.id)) return errore("Esiste già un contenuto con questo indirizzo", 409);
        c.analisi.unshift({ ...b.sito.articolo, stato: "pubblicato" });
      }
      if (b.sito.storia || b.sito.storiaUrl) {
        // Se Andrea ha corretto il racconto nel pannello vale la sua versione, salvata nella bozza.
        let nuovi = b.sito.storia;
        if (!nuovi) {
          if (!b.sito.storiaUrl.startsWith("https://raw.githubusercontent.com/curvaroma/curvaroma/")) return errore("Indirizzo non valido");
          const r = await fetch(b.sito.storiaUrl);
          if (!r.ok) return errore("Articoli non trovati");
          nuovi = await r.json();
        }
        c.storia ||= [];
        for (const a of nuovi) {
          if (!/^[\w-]+$/.test(a.id)) continue;
          const i = c.storia.findIndex(x => x.id === a.id);
          if (i >= 0) c.storia[i] = a; else c.storia.push(a);
        }
      }
      if (!c.partita?.id || !c.prossima?.id || !Array.isArray(c.classifica)) return errore("Contenuti non validi");
      scritture.push(env.DB.prepare("UPDATE impostazioni SET valore=?, aggiornato=CURRENT_TIMESTAMP WHERE chiave='contenuti'").bind(JSON.stringify(c)), await archivioPagelle(env, prima, c.partita));
    }
    const r = b.sito?.risultato;
    if (r) {
      if (!idPartita(r.partita) || ![r.casa, r.ospiti].every(n => Number.isInteger(n) && n >= 0 && n <= 30)) return errore("Risultato non valido");
      scritture.push(env.DB.prepare("INSERT INTO risultati (partita, nome, casa, ospiti) VALUES (?,?,?,?) ON CONFLICT(partita) DO UPDATE SET nome=excluded.nome, casa=excluded.casa, ospiti=excluded.ospiti").bind(r.partita, String(r.nome || r.partita).slice(0, 60), r.casa, r.ospiti));
    }
    b.stato = "pubblicata"; b.pubblicata = new Date().toISOString();
    scritture.push(env.DB.prepare("UPDATE impostazioni SET valore=?, aggiornato=CURRENT_TIMESTAMP WHERE chiave='bozze'").bind(JSON.stringify(bozze)));
    await env.DB.batch(scritture);
    if (notifica) ctx.waitUntil(avvisa(env, ...notifica).catch(() => {}));
    return json({ ok: true });
  }
  if (p[0] === "tifosi") {
    if (req.method === "GET") {
      const [a, b] = await env.DB.batch([
        env.DB.prepare(`SELECT p.partita, COUNT(*) pronostici, r.nome, r.casa, r.ospiti FROM pronostici p LEFT JOIN risultati r ON r.partita=p.partita GROUP BY p.partita ORDER BY MAX(p.creato) DESC LIMIT 60`),
        env.DB.prepare("SELECT nickname FROM tifosi ORDER BY creato DESC LIMIT 500")
      ]);
      return json({ partite: a.results, nomi: b.results.map(x => x.nickname) });
    }
    if (req.method === "DELETE") {
      await env.DB.prepare("DELETE FROM tifosi WHERE nickname=?").bind(decodeURIComponent(p[1] || "")).run();
      return json({ ok: true });
    }
  }
  if (p[0] === "risultato") {
    if (req.method === "DELETE") { await env.DB.prepare("DELETE FROM risultati WHERE partita=?").bind(p[1] || "").run(); return json({ ok: true }); }
    const c = await req.json();
    if (!idPartita(c.partita) || ![c.casa, c.ospiti].every(n => Number.isInteger(n) && n >= 0 && n <= 30)) return errore("Risultato non valido");
    await env.DB.prepare("INSERT INTO risultati (partita, nome, casa, ospiti) VALUES (?,?,?,?) ON CONFLICT(partita) DO UPDATE SET nome=excluded.nome, casa=excluded.casa, ospiti=excluded.ospiti").bind(c.partita, String(c.nome || c.partita).slice(0, 60), c.casa, c.ospiti).run();
    return json({ ok: true });
  }
  if (p[0] === "seo") {
    if (req.method === "GET") {
      const r = await env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='seo'").first();
      return json({ seo: r ? JSON.parse(r.valore) : {}, predefiniti: PAGINE });
    }
    const testo = await req.text();
    if (testo.length > 20000) return errore("Dati SEO troppo grandi", 413);
    JSON.parse(testo);
    await env.DB.prepare("INSERT INTO impostazioni (chiave, valore) VALUES ('seo',?) ON CONFLICT DO UPDATE SET valore=excluded.valore, aggiornato=CURRENT_TIMESTAMP").bind(testo).run();
    return json({ ok: true });
  }
  if (p[0] === "aspetto") {
    if (req.method === "GET") {
      const [i, l] = await env.DB.batch([
        env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='immagini'"),
        env.DB.prepare("SELECT id, nome FROM immagini ORDER BY creato DESC")
      ]);
      return json({ scelte: i.results[0] ? JSON.parse(i.results[0].valore) : {}, immagini: l.results });
    }
    const testo = await req.text();
    await env.DB.prepare("INSERT INTO impostazioni (chiave, valore) VALUES ('immagini',?) ON CONFLICT DO UPDATE SET valore=excluded.valore, aggiornato=CURRENT_TIMESTAMP").bind(testo).run();
    return json({ ok: true });
  }
  if (p[0] === "immagini") {
    if (req.method === "POST") {
      const testo = await req.text();
      if (testo.length > 1400000) return errore("Immagine troppo grande", 413);
      const { nome: n, dati } = JSON.parse(testo);
      const m = String(dati).match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!m) return errore("Formato non valido");
      const nuovoId = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO immagini (id, nome, mime, dati) VALUES (?,?,?,?)").bind(nuovoId, String(n).slice(0, 80), m[1], m[2]).run();
      return json({ ok: true, id: nuovoId, url: "/api/img/" + nuovoId });
    }
    if (req.method === "DELETE") {
      await env.DB.prepare("DELETE FROM immagini WHERE id=?").bind(p[1] || "").run();
      return json({ ok: true });
    }
  }
  if (p[0] === "prodotti") {
    if (req.method === "GET") return json({ prodotti: (await env.DB.prepare("SELECT * FROM prodotti ORDER BY ordine, nome").all()).results });
    if (req.method === "DELETE") { await env.DB.prepare("DELETE FROM prodotti WHERE id=?").bind(p[1] || "").run(); return json({ ok: true }); }
    const c = await req.json();
    if (!/^https:\/\//.test(c.link || "") || !c.nome) return errore("Nome e link sono obbligatori");
    const foto = c.foto && /^(https:\/\/|\/api\/img\/)/.test(c.foto) ? c.foto : null;
    const asin = (c.link.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/) || [])[1] || null;
    // Stesso link, stesso prodotto: si aggiorna quello esistente invece di crearne un doppione.
    const giaCi = await env.DB.prepare("SELECT id FROM prodotti WHERE link=?").bind(c.link).first("id");
    if (giaCi && c.id && giaCi !== c.id) return errore("Questo link c'è già in un altro annuncio");
    const idProdotto = c.id || giaCi || crypto.randomUUID();
    await env.DB.prepare("INSERT INTO prodotti (id, nome, link, foto, tipo, attivo, ordine, asin) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET nome=excluded.nome, link=excluded.link, foto=excluded.foto, tipo=excluded.tipo, attivo=excluded.attivo, ordine=excluded.ordine, asin=excluded.asin")
      .bind(idProdotto, String(c.nome).slice(0, 80), c.link, foto, c.tipo || "maglia", c.attivo ? 1 : 0, Number(c.ordine) || 0, asin).run();
    return json({ ok: true, id: idProdotto });
  }
  if (p[0] === "segnalazioni") {
    const lista = await rigaJson(env, "segnalazioni", []);
    if (req.method === "GET") return json({ segnalazioni: lista.map(({ da, autore, ...x }) => x) });
    const s = lista.find(x => x.id === p[1]), c = await req.json().catch(() => ({}));
    if (!s || !["elimina", "ignora"].includes(c.azione)) return errore("Segnalazione non valida");
    const scritture = [];
    if (c.azione === "elimina") scritture.push(s.tipo === "annuncio" ? env.DB.prepare("DELETE FROM annunci WHERE id=?").bind(s.oggetto) : env.DB.prepare("DELETE FROM tifosi WHERE nickname=?").bind(s.oggetto));
    for (const x of lista) if (x.tipo === s.tipo && x.oggetto === s.oggetto && x.stato === "aperta") { x.stato = c.azione === "elimina" ? "eliminata" : "ignorata"; x.chiusa = new Date().toISOString(); }
    scritture.push(salvaRiga(env, "segnalazioni", lista));
    await env.DB.batch(scritture);
    return json({ ok: true });
  }
  if (p[0] === "annunci") {
    if (req.method === "GET") return json({ annunci: (await env.DB.prepare("SELECT id, tipo, partita, settore, quanti, prezzo, contatto, creato FROM annunci ORDER BY creato DESC LIMIT 300").all()).results });
    if (req.method === "DELETE") { await env.DB.prepare("DELETE FROM annunci WHERE id=?").bind(p[1] || "").run(); return json({ ok: true }); }
  }
  return errore("Percorso non trovato", 404);
}

const ORIGINI_APP = ["capacitor://localhost", "https://localhost", "http://localhost"];
export async function onRequest(ctx) {
  const origine = ctx.request.headers.get("origin"), app = ORIGINI_APP.includes(origine);
  const cors = app ? { "access-control-allow-origin": origine, "access-control-allow-headers": "content-type, x-tifoso", "access-control-allow-methods": "GET, POST, DELETE, OPTIONS", vary: "origin" } : {};
  if (ctx.request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const r = await servi(ctx, app);
  if (!app) return r;
  const out = new Response(r.body, r);
  for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
  return out;
}
// Risultato in diretta della Roma, da SportScore (gratis, senza chiave). Le condizioni chiedono un link visibile
// "Powered by SportScore" dove si mostrano i dati: è nella barra. Una chiamata ogni 30 secondi per tutti, grazie alla cache.
// Termini: https://sportscore.com/developers/terms/
const SS_SQUADRE = { roma: "as-roma", milan: "ac-milan", inter: "inter-milan", "man. united": "manchester-united", "man. city": "manchester-city", psg: "paris-saint-germain", atletico: "atletico-madrid", bayern: "bayern-munich", lipsia: "rb-leipzig", barcellona: "barcelona", siviglia: "sevilla" };
const ssSlug = n => SS_SQUADRE[String(n).toLowerCase().trim()] || String(n).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
// "Mario Hermoso" diventa "Hermoso", "Marten de Roon" diventa "de Roon".
const corto = n => { const p = String(n || "").trim().split(/\s+/); return p.length > 1 ? p.slice(1).join(" ") : p[0] || ""; };
// Pagelle automatiche (deciso da Andrea il 7 novembre): al fischio finale la partita giocata diventa quella da votare,
// con titolari ed entrati presi da SportScore. La Vigilia della gara dopo resta alla bozza del mattino.
const piano = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z ]/g, " ").split(/\s+/).filter(Boolean);
const RUOLI_SS = { G: "Portiere", D: "Difensore", M: "Centrocampista", F: "Attaccante" };
function nostroGiocatore(nome, posizione) {
  const t = piano(nome);
  const g = GIOCATORI.find(x => piano(x.nome).every(p => t.includes(p)));
  return g ? [g.voti, g.ruolo] : [corto(nome), RUOLI_SS[posizione] || "Centrocampista"];
}
async function apriPagelle(ctx, contenuti, q, m, nomeDi) {
  const { env } = ctx, giorno = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date(q.inizio));
  const id = `${String(q.id).replace(/-\d{4}-\d{2}-\d{2}$/, "")}-g-${giorno}`;
  if (contenuti.partita?.id === id) return "già aperte";
  const lato = nomeDi(m.home) === "Roma" ? "home" : nomeDi(m.away) === "Roma" ? "away" : null, l = m.lineups || {};
  const xi = lato ? l[lato + "_xi"] || [] : [];
  if (xi.length < 11) return "formazioni mancanti";
  const ORDINE = ["Portiere", "Difensore", "Centrocampista", "Attaccante"];
  const titolari = xi.map(x => nostroGiocatore(x.name, x.position)).sort((a, b) => ORDINE.indexOf(a[1]) - ORDINE.indexOf(b[1]));
  for (const x of m.incidents || []) if (x.is_sub && x.side === lato && x.player_in) {
    const g = nostroGiocatore(x.player_in, (l[lato + "_subs"] || []).find(y => y.name === x.player_in)?.position);
    if (!titolari.some(([n]) => n === g[0])) titolari.push(g);
  }
  const casa = nomeDi(m.home), ospiti = nomeDi(m.away), golCasa = Number(m.home_score) || 0, golOspiti = Number(m.away_score) || 0;
  const partita = {
    id, competizione: q.competizione, casa, ospiti, golCasa, golOspiti, titolari, chiusura: new Date(Date.now() + ORE_VOTO * 3600e3).toISOString(),
    data: new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", day: "numeric", month: "long" }).format(new Date(q.inizio)),
    gol: (m.incidents || []).filter(x => x.is_goal).map(x => [Number(x.time) || 0, x.side === "home" ? "casa" : "ospiti"])
  };
  const esiti = await env.DB.batch([
    env.DB.prepare("UPDATE impostazioni SET valore=json_set(valore,'$.partita',json(?)), aggiornato=CURRENT_TIMESTAMP WHERE chiave='contenuti' AND json_extract(valore,'$.partita.id') IS NOT ?").bind(JSON.stringify(partita), id),
    await archivioPagelle(env, contenuti.partita, partita),
    env.DB.prepare("INSERT INTO risultati (partita, nome, casa, ospiti) VALUES (?,?,?,?) ON CONFLICT(partita) DO UPDATE SET nome=excluded.nome, casa=excluded.casa, ospiti=excluded.ospiti").bind(q.id, `${casa}-${ospiti}`, golCasa, golOspiti)
  ]);
  // Solo la richiesta che ha davvero aperto le pagelle manda la notifica.
  if (esiti[0]?.meta?.changes) ctx.waitUntil(avvisa(env, { partita: contenuti.partita }, { partita }).catch(() => {}));
  return "aperte";
}
async function live(ctx) {
  const { env } = ctx;
  const chiave = new Request(new URL("/api/live", ctx.request.url));
  const inCache = await caches.default.match(chiave);
  if (inCache) return inCache;
  const rispondi = (dati, secondi) => {
    const r = new Response(JSON.stringify(dati), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": `public, max-age=${secondi}` } });
    ctx.waitUntil(caches.default.put(chiave, r.clone()));
    return r;
  };
  const v = await env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='contenuti'").first("valore");
  const contenuti = v ? JSON.parse(v) : null, q = contenuti?.prossima, inizio = Date.parse(q?.inizio || "");
  const ora = Date.now();
  if (!q || !inizio || ora < inizio - 30 * 60e3 || ora > inizio + 3 * 3600e3) return rispondi({ attiva: false }, 60);
  const chiama = async slug => {
    const r = await fetch(`https://sportscore.com/api/widget/match/?sport=football&slug=${encodeURIComponent(slug)}`, { headers: { accept: "application/json", "user-agent": "RomaPlus/1.0 (+https://roma-plus.it)" } });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error("SportScore " + r.status);
    const m = (await r.json()).match;
    // Stessa coppia di squadre può giocare più volte: vale solo la partita che inizia vicino all'orario previsto.
    return m && Math.abs(Date.parse(m.time) - inizio) < 6 * 3600e3 ? m : null;
  };
  try {
    const a = ssSlug(q.casa), b = ssSlug(q.ospiti);
    const candidati = [q.sportscore, `${a}-vs-${b}`, `${b}-vs-${a}`].filter(Boolean);
    let m = null;
    for (const s of candidati) if ((m = await chiama(s))) break;
    if (!m) return rispondi({ attiva: false, errore: "partita non trovata", provati: candidati }, 120);
    const testo = String(m.status_text || "");
    const fase = m.status === "live" ? (/half.?time|break|interval/i.test(testo) ? "intervallo" : "in corso") : m.status === "finished" ? "finita" : m.status === "upcoming" ? "prima" : "sconosciuta";
    const avversario = [q.casa, q.ospiti].find(n => n && n !== "Roma") || "";
    const nomeDi = n => /\broma\b/i.test(n || "") && !/women|femminile/i.test(n) ? "Roma" : avversario || n || "";
    const eventi = (m.incidents || []).map(x => {
      const tp = String(x.type || "");
      const tipo = x.is_goal ? (/own/i.test(tp) ? "autogol" : /pen/i.test(tp) ? "rigore" : "gol") : x.is_card ? (/red|second/i.test(tp) ? "rosso" : "giallo") : null;
      return tipo && { tipo, minuto: x.time != null ? `${x.time}'` : "", squadra: x.side === "home" ? "casa" : "ospiti", giocatore: corto(x.player) };
    }).filter(Boolean);
    let pagelle = null;
    if (fase === "finita") pagelle = await apriPagelle(ctx, contenuti, q, m, nomeDi).catch(e => "errore: " + String(e?.message || e).slice(0, 80));
    return rispondi({
      attiva: true, fase, fonte: "SportScore", pagelle,
      minuto: fase === "in corso" ? (m.live_minute != null ? `${m.live_minute}'` : testo) : fase === "intervallo" ? "Intervallo" : fase === "finita" ? "Finale" : "",
      competizione: q.competizione, inizio: q.inizio,
      casa: { nome: nomeDi(m.home), gol: Number(m.home_score) || 0 },
      ospiti: { nome: nomeDi(m.away), gol: Number(m.away_score) || 0 },
      eventi
    }, fase === "finita" ? 300 : 30);
  } catch (e) {
    return rispondi({ attiva: true, fase: "sconosciuta", errore: "dati non disponibili", motivo: String(e?.message || e).slice(0, 120) }, 30);
  }
}
async function servi(ctx, app) {
  const { request: req, env } = ctx;
  const url = new URL(req.url);
  const percorso = url.pathname.replace(/^\/api\//, "").split("/");
  try {
    if (req.method === "GET" && percorso[0] === "notizie") return notizie(ctx);
    if (!env.DB) return errore("Database non collegato", 503);
    if (req.method === "GET" && percorso[0] === "live") return live(ctx);
    if (percorso[0] === "admin") return admin(ctx, percorso.slice(1));
    if (req.method === "GET" && percorso[0] === "pubblico") return pubblico(env);
    if (req.method === "GET" && percorso[0] === "img") return immagine(env, percorso[1]);
    if (req.method === "GET" && percorso[0] === "archivio") return await archivioNotizie(ctx, url);
    if (req.method === "GET" && percorso[0] === "radio") return radio(env);
    if (req.method === "GET" && percorso[0] === "audio") return audio(env, req, percorso[1]);
    if (req.method === "POST" && percorso[0] === "visita") return visita(ctx);
    if (req.method === "POST" && percorso[0] === "clic") return clic(ctx);
    if (req.method === "POST" && percorso[0] === "ascolto") return ascolto(ctx);
    let id = leggiCookie(req);
    if (req.method === "GET" && percorso[0] === "stato") {
      const p = url.searchParams.get("partita"), q = url.searchParams.get("prossima");
      if (!idPartita(p) || !idPartita(q)) return errore("Partita non valida");
      return json({ ...(await stato(env, id, p, q)), voto: await pagelleAperte(env, p) });
    }
    if (req.method === "GET" && percorso[0] === "classifica") return json(await classifica(env, id));
    if (req.method !== "POST" && req.method !== "DELETE") return errore("Metodo non consentito", 405);
    const origine = req.headers.get("origin");
    if (!app && origine && new URL(origine).host !== url.host) return errore("Origine non valida", 403);
    const nuovo = !id;
    if (nuovo) id = crypto.randomUUID();
    const fine = (dati, s = 200) => json(dati, s, nuovo ? scriviCookie(id) : {});
    if (req.method === "DELETE" && percorso[0] === "annunci") {
      await env.DB.prepare("DELETE FROM annunci WHERE id=? AND tifoso_id=?").bind(percorso[1] || "", id).run();
      return fine({ ok: true });
    }
    const testo = await req.text();
    if (testo.length > 4000) return errore("Richiesta troppo grande", 413);
    const c = JSON.parse(testo);
    if (percorso[0] === "voti") {
      const voci = Object.entries(c.voti || {});
      if (!idPartita(c.partita) || !voci.length || voci.length > 16) return errore("Voti non validi");
      if (!voci.every(([g, v]) => nome(g) && Number.isInteger(v * 2) && v >= 1 && v <= 10)) return errore("Voti non validi");
      if (!(await pagelleAperte(env, c.partita)).aperte) return fine({ errore: "Il voto per questa partita è chiuso" }, 409);
      await env.DB.batch([
        env.DB.prepare("DELETE FROM voti WHERE tifoso_id=? AND partita=?").bind(id, c.partita),
        ...voci.map(([g, v]) => env.DB.prepare("INSERT INTO voti (tifoso_id, partita, giocatore, voto) VALUES (?,?,?,?)").bind(id, c.partita, g, v))
      ]);
      return fine({ ok: true });
    }
    if (percorso[0] === "pronostico") {
      if (!idPartita(c.partita) || ![c.casa, c.ospiti].every(n => Number.isInteger(n) && n >= 0 && n <= 9)) return errore("Risultato non valido");
      const riga = await env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='contenuti'").first("valore");
      if (riga) {
        const { prossima } = JSON.parse(riga);
        if (c.partita !== prossima?.id || Date.now() >= Date.parse(prossima?.inizio)) return fine({ errore: "Pronostici chiusi" }, 409);
      }
      await env.DB.prepare("INSERT OR REPLACE INTO pronostici (tifoso_id, partita, casa, ospiti) VALUES (?,?,?,?)").bind(id, c.partita, c.casa, c.ospiti).run();
      return fine({ ok: true });
    }
    if (percorso[0] === "nome") return scegliNome(ctx, id, c, fine);
    if (percorso[0] === "segnala") return segnala(env, id, c, fine);
    if (percorso[0] === "formazione") {
      if (!idPartita(c.partita) || !Array.isArray(c.giocatori) || c.giocatori.length !== 11 || !c.giocatori.every(nome)) return errore("Formazione non valida");
      await env.DB.prepare("INSERT OR REPLACE INTO formazioni (tifoso_id, partita, giocatori) VALUES (?,?,?)").bind(id, c.partita, JSON.stringify(c.giocatori)).run();
      return fine({ ok: true });
    }
    if (percorso[0] === "annunci") {
      const { tipo, partita, settore, n, prezzo, contatto } = c;
      if (!["Cedo", "Cerco"].includes(tipo) || typeof partita !== "string" || !/^Roma-[\p{L} ]{3,20}, \d{1,2} [a-z]{5,10}$/u.test(partita) || !SETTORI.includes(settore)) return errore("Annuncio non valido");
      if (!Number.isInteger(n) || n < 1 || n > 4 || !(prezzo >= 0 && prezzo <= 500) || !/^@[A-Za-z0-9._]{1,30}$/.test(contatto || "")) return errore("Annuncio non valido");
      const quanti = await env.DB.prepare("SELECT COUNT(*) n FROM annunci WHERE tifoso_id=?").bind(id).first("n");
      if (quanti >= 5) return errore("Massimo 5 annunci");
      const nuovoId = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO annunci (id, tifoso_id, tipo, partita, settore, quanti, prezzo, contatto) VALUES (?,?,?,?,?,?,?,?)").bind(nuovoId, id, tipo, partita, settore, n, prezzo, contatto).run();
      return fine({ ok: true, id: nuovoId });
    }
    return errore("Percorso non trovato", 404);
  } catch {
    return errore("Errore del server, riprova tra poco", 500);
  }
}
