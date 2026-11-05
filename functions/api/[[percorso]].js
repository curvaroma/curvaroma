// API di Curva Roma. Binding richiesto nel progetto Pages: D1 con nome DB.
const COOKIE = "cr_tifoso";
const ANNO = 60 * 60 * 24 * 365;
const SETTORI = ["Curva Sud", "Curva Nord", "Distinti Sud", "Distinti Nord", "Tribuna Tevere", "Tribuna Monte Mario"];
const FEED = [
  ["RomaNews", "https://www.romanews.eu/feed/"],
  ["Forzaroma.info", "https://www.forzaroma.info/feed/"],
  ["Corriere dello Sport", "https://www.corrieredellosport.it/rss/calcio"],
  ["Giallorossi.net", "https://www.giallorossi.net/feed/"],
  ["Voce Giallorossa", "https://www.vocegiallorossa.it/rss"],
  ["AsRomaLive", "https://www.asromalive.it/feed/"],
  ["TuttoMercatoWeb", "https://www.tuttomercatoweb.com/rss/?squadra=roma"]
];
const PER_TESTATA = 5;
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
    .filter(n => testata !== "TuttoMercatoWeb" || /\broma\b|giallorossi|gasperini/i.test(n.titolo))
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
  const viste = new Set(), perTestata = {};
  const lista = tutte.filter(n => {
    if (viste.has(n.url) || (perTestata[n.t] || 0) >= PER_TESTATA) return false;
    viste.add(n.url); perTestata[n.t] = (perTestata[n.t] || 0) + 1;
    return true;
  }).slice(0, 24);
  const risposta = new Response(JSON.stringify({ notizie: lista }), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=600" } });
  if (lista.length) ctx.waitUntil(caches.default.put(chiave, risposta.clone()));
  return risposta;
}

const giorno = () => new Date(Date.now() + 36e5).toISOString().slice(0, 10);
async function sha(testo) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(testo));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
async function pubblico(env) {
  const [c, p, i] = await env.DB.batch([
    env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='contenuti'"),
    env.DB.prepare("SELECT id, nome, link, foto, tipo FROM prodotti WHERE attivo=1 ORDER BY ordine, nome"),
    env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='immagini'")
  ]);
  return json({
    contenuti: c.results[0] ? JSON.parse(c.results[0].valore) : null,
    prodotti: p.results,
    immagini: i.results[0] ? JSON.parse(i.results[0].valore) : {}
  });
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
  const sezione = ["casa", "pagella", "vigilia", "analisi", "biglietti"].includes(c.sezione) ? c.sezione : "altro";
  const dispositivo = c.mobile ? "mobile" : "computer", g = giorno();
  const impronta = (await sha(`${g}|${req.headers.get("cf-connecting-ip")}|${req.headers.get("user-agent")}`)).slice(0, 24);
  ctx.waitUntil(env.DB.batch([
    env.DB.prepare("INSERT INTO visite (giorno, sezione, dispositivo, n) VALUES (?,?,?,1) ON CONFLICT DO UPDATE SET n=n+1").bind(g, sezione, dispositivo),
    env.DB.prepare("INSERT OR IGNORE INTO visitatori (giorno, impronta) VALUES (?,?)").bind(g, impronta),
    env.DB.prepare("DELETE FROM visitatori WHERE giorno < date('now','-40 day')")
  ]));
  return new Response(null, { status: 204 });
}
async function clic(ctx) {
  const c = await ctx.request.json().catch(() => ({}));
  if (typeof c.prodotto !== "string" || c.prodotto.length > 60) return new Response(null, { status: 204 });
  ctx.waitUntil(ctx.env.DB.prepare("INSERT INTO clic (giorno, prodotto, n) SELECT ?, id, 1 FROM prodotti WHERE id=? ON CONFLICT DO UPDATE SET n=n+1").bind(giorno(), c.prodotto).run());
  return new Response(null, { status: 204 });
}

/* Pannello admin. La password sta nella variabile segreta ADMIN_PASSWORD del progetto Pages. */
const ADMIN_COOKIE = "cr_admin";
async function firma(env, testo) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.ADMIN_PASSWORD), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const b = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(testo));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
async function adminValido(req, env) {
  const m = (req.headers.get("cookie") || "").match(new RegExp(`(?:^|; )${ADMIN_COOKIE}=(\\d+)\\.([a-f0-9]{64})`));
  if (!m || +m[1] < Date.now()) return false;
  return (await firma(env, m[1])) === m[2];
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
    const { password } = await req.json().catch(() => ({}));
    if (typeof password !== "string" || password !== env.ADMIN_PASSWORD) {
      await env.DB.prepare("INSERT INTO tentativi (impronta, n, scade) VALUES (?,1,?) ON CONFLICT DO UPDATE SET n=CASE WHEN scade>? THEN n+1 ELSE 1 END, scade=?").bind(ip, ora + 9e5, ora, ora + 9e5).run();
      return errore("Password errata", 401);
    }
    await env.DB.prepare("DELETE FROM tentativi WHERE impronta=?").bind(ip).run();
    const scade = String(ora + 7 * 864e5);
    return json({ ok: true }, 200, { "set-cookie": `${ADMIN_COOKIE}=${scade}.${await firma(env, scade)}; Path=/api/admin; Max-Age=604800; HttpOnly; Secure; SameSite=Strict` });
  }
  if (!(await adminValido(req, env))) return errore("Accesso richiesto", 401);
  if (p[0] === "esci") return json({ ok: true }, 200, { "set-cookie": `${ADMIN_COOKIE}=; Path=/api/admin; Max-Age=0; HttpOnly; Secure; SameSite=Strict` });
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
    if (testo.length > 200000) return errore("Contenuti troppo grandi", 413);
    const c = JSON.parse(testo);
    if (!c.partita?.id || !c.prossima?.id || !Array.isArray(c.classifica)) return errore("Contenuti non validi");
    await env.DB.prepare("INSERT INTO impostazioni (chiave, valore) VALUES ('contenuti',?) ON CONFLICT DO UPDATE SET valore=excluded.valore, aggiornato=CURRENT_TIMESTAMP").bind(testo).run();
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
    await env.DB.prepare("INSERT INTO prodotti (id, nome, link, foto, tipo, attivo, ordine) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET nome=excluded.nome, link=excluded.link, foto=excluded.foto, tipo=excluded.tipo, attivo=excluded.attivo, ordine=excluded.ordine")
      .bind(c.id || crypto.randomUUID(), String(c.nome).slice(0, 80), c.link, foto, c.tipo || "maglia", c.attivo ? 1 : 0, Number(c.ordine) || 0).run();
    return json({ ok: true });
  }
  if (p[0] === "annunci") {
    if (req.method === "GET") return json({ annunci: (await env.DB.prepare("SELECT id, tipo, partita, settore, quanti, prezzo, contatto, creato FROM annunci ORDER BY creato DESC LIMIT 300").all()).results });
    if (req.method === "DELETE") { await env.DB.prepare("DELETE FROM annunci WHERE id=?").bind(p[1] || "").run(); return json({ ok: true }); }
  }
  return errore("Percorso non trovato", 404);
}

export async function onRequest(ctx) {
  const { request: req, env } = ctx;
  const url = new URL(req.url);
  const percorso = url.pathname.replace(/^\/api\//, "").split("/");
  try {
    if (req.method === "GET" && percorso[0] === "notizie") return notizie(ctx);
    if (!env.DB) return errore("Database non collegato", 503);
    if (percorso[0] === "admin") return admin(ctx, percorso.slice(1));
    if (req.method === "GET" && percorso[0] === "pubblico") return pubblico(env);
    if (req.method === "GET" && percorso[0] === "img") return immagine(env, percorso[1]);
    if (req.method === "POST" && percorso[0] === "visita") return visita(ctx);
    if (req.method === "POST" && percorso[0] === "clic") return clic(ctx);
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
