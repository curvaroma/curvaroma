// API di Curva Roma. Binding richiesto nel progetto Pages: D1 con nome DB.
const COOKIE = "cr_tifoso";
const ANNO = 60 * 60 * 24 * 365;
const SETTORI = ["Curva Sud", "Curva Nord", "Distinti Sud", "Distinti Nord", "Tribuna Tevere", "Tribuna Monte Mario"];
const FEED = [
  ["RomaNews", "https://www.romanews.eu/feed/"],
  ["Forzaroma.info", "https://www.forzaroma.info/feed/"],
  ["Corriere dello Sport", "https://www.corrieredellosport.it/rss/calcio"],
  ["Giallorossi.net", "https://www.giallorossi.net/feed/"]
];
const json = (dati, stato = 200, extra = {}) => new Response(JSON.stringify(dati), { status: stato, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });
const errore = (messaggio, stato = 400) => json({ errore: messaggio }, stato);
const idPartita = s => typeof s === "string" && /^[a-z0-9-]{3,40}$/.test(s);
const nome = s => typeof s === "string" && s.length >= 2 && s.length <= 30 && /^[\p{L} .'-]+$/u.test(s);

function leggiCookie(req) {
  const m = (req.headers.get("cookie") || "").match(new RegExp(`(?:^|; )${COOKIE}=([a-f0-9-]{36})`));
  return m ? m[1] : null;
}
const scriviCookie = id => ({ "set-cookie": `${COOKIE}=${id}; Path=/; Max-Age=${ANNO}; HttpOnly; Secure; SameSite=Lax` });

async function stato(env, id, partita, prossima) {
  const [voti, pron, form, annunci] = await env.DB.batch([
    env.DB.prepare("SELECT giocatore, AVG(voto) m FROM voti WHERE partita=? GROUP BY giocatore ORDER BY m DESC").bind(partita),
    env.DB.prepare("SELECT casa, ospiti, COUNT(*) n FROM pronostici WHERE partita=? GROUP BY casa, ospiti ORDER BY n DESC LIMIT 1").bind(prossima),
    env.DB.prepare("SELECT giocatori FROM formazioni WHERE partita=?").bind(prossima),
    env.DB.prepare("SELECT id, tifoso_id, tipo, partita, settore, quanti, prezzo, contatto, creato FROM annunci ORDER BY creato DESC LIMIT 200")
  ]);
  const schede = await env.DB.prepare("SELECT COUNT(DISTINCT tifoso_id) n FROM voti WHERE partita=?").bind(partita).first("n");
  const conti = {};
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
    annunci: annunci.results.map(({ tifoso_id, ...a }) => ({ ...a, mio: tifoso_id === id }))
  };
}

const pulisci = s => s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim();
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
    .filter(n => !n.titolo.startsWith("ALTRE NOTIZIE"));
}
async function notizie(ctx) {
  const chiave = new Request(new URL("/api/notizie", ctx.request.url));
  const inCache = await caches.default.match(chiave);
  if (inCache) return inCache;
  const risposte = await Promise.allSettled(FEED.map(async ([t, u]) => {
    const r = await fetch(u, { headers: { "user-agent": "CurvaRoma/1.0 (+https://curvaroma.it)" } });
    return r.ok ? leggiFeed(t, await r.text()) : [];
  }));
  const tutte = risposte.flatMap(r => r.status === "fulfilled" ? r.value : []).sort((a, b) => b.data - a.data);
  const viste = new Set();
  const lista = tutte.filter(n => !viste.has(n.url) && viste.add(n.url)).slice(0, 18);
  const risposta = new Response(JSON.stringify({ notizie: lista }), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=600" } });
  if (lista.length) ctx.waitUntil(caches.default.put(chiave, risposta.clone()));
  return risposta;
}

export async function onRequest(ctx) {
  const { request: req, env } = ctx;
  const url = new URL(req.url);
  const percorso = url.pathname.replace(/^\/api\//, "").split("/");
  try {
    if (req.method === "GET" && percorso[0] === "notizie") return notizie(ctx);
    if (!env.DB) return errore("Database non collegato", 503);
    let id = leggiCookie(req);
    if (req.method === "GET" && percorso[0] === "stato") {
      const p = url.searchParams.get("partita"), q = url.searchParams.get("prossima");
      if (!idPartita(p) || !idPartita(q)) return errore("Partita non valida");
      return json(await stato(env, id, p, q));
    }
    if (req.method !== "POST" && req.method !== "DELETE") return errore("Metodo non consentito", 405);
    const origine = req.headers.get("origin");
    if (origine && new URL(origine).host !== url.host) return errore("Origine non valida", 403);
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
      await env.DB.batch([
        env.DB.prepare("DELETE FROM voti WHERE tifoso_id=? AND partita=?").bind(id, c.partita),
        ...voci.map(([g, v]) => env.DB.prepare("INSERT INTO voti (tifoso_id, partita, giocatore, voto) VALUES (?,?,?,?)").bind(id, c.partita, g, v))
      ]);
      return fine({ ok: true });
    }
    if (percorso[0] === "pronostico") {
      if (!idPartita(c.partita) || ![c.casa, c.ospiti].every(n => Number.isInteger(n) && n >= 0 && n <= 9)) return errore("Risultato non valido");
      await env.DB.prepare("INSERT OR REPLACE INTO pronostici (tifoso_id, partita, casa, ospiti) VALUES (?,?,?,?)").bind(id, c.partita, c.casa, c.ospiti).run();
      return fine({ ok: true });
    }
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
