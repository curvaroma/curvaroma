// Titoli, descrizioni e contenuti leggibili da Google per ogni pagina.
const BASE = "https://roma-plus.it";
// Rosa 2026/27. Numeri, ruoli e nazionalità verificati su due fonti (DAZN, ESPN, Starting11).
// "voti" è il nome con cui il giocatore compare nelle pagelle.
export const GIOCATORI = [
  ["vasquez", "Devis Vásquez", "Vasquez", 32, "Portiere", "Colombia"],
  ["svilar", "Mile Svilar", "Svilar", 99, "Portiere", "Serbia"],
  ["gollini", "Pierluigi Gollini", "Gollini", 95, "Portiere", "Italia"],
  ["de-marzi", "Giorgio De Marzi", "De Marzi", 70, "Portiere", "Stati Uniti"],
  ["mancini", "Gianluca Mancini", "Mancini", 23, "Difensore", "Italia"],
  ["ndicka", "Evan Ndicka", "Ndicka", 5, "Difensore", "Costa d'Avorio"],
  ["hermoso", "Mario Hermoso", "Hermoso", 22, "Difensore", "Spagna"],
  ["balerdi", "Leonardo Balerdi", "Balerdi", 26, "Difensore", "Argentina"],
  ["ghilardi", "Daniele Ghilardi", "Ghilardi", 87, "Difensore", "Italia"],
  ["koulierakis", "Konstantinos Koulierakis", "Koulierakis", 3, "Difensore", "Grecia"],
  ["wesley", "Wesley", "Wesley", 43, "Difensore", "Brasile"],
  ["molina", "Nahuel Molina", "Molina", 20, "Difensore", "Argentina"],
  ["rensch", "Devyne Rensch", "Rensch", 2, "Difensore", "Paesi Bassi"],
  ["lulli", "Emanuele Lulli", "Lulli", 77, "Difensore", ""],
  ["cristante", "Bryan Cristante", "Cristante", 4, "Centrocampista", "Italia"],
  ["de-roon", "Marten de Roon", "De Roon", 15, "Centrocampista", "Paesi Bassi"],
  ["kone", "Manu Koné", "Koné", 17, "Centrocampista", "Francia"],
  ["pisilli", "Niccolò Pisilli", "Pisilli", 61, "Centrocampista", "Italia"],
  ["pellegrini", "Lorenzo Pellegrini", "Pellegrini", 7, "Centrocampista", "Italia"],
  ["mora", "Rodrigo Mora", "Mora", 86, "Attaccante", "Portogallo"],
  ["soule", "Matías Soulé", "Soulé", 18, "Attaccante", "Argentina"],
  ["malen", "Donyell Malen", "Malen", 14, "Attaccante", "Paesi Bassi"],
  ["dybala", "Paulo Dybala", "Dybala", 21, "Attaccante", "Argentina"],
  ["castro", "Santiago Castro", "Castro", 9, "Attaccante", "Argentina"]
].map(([slug, nome, voti, numero, ruolo, nazione]) => ({ slug, nome, voti, numero, ruolo, nazione }));
export const PAGINE = {
  "/": ["Roma+: notizie AS Roma, pagelle e tifosi romanisti", "Roma+ è il sito dei tifosi della Roma: notizie sull'AS Roma, pagelle dei tifosi, vigilia delle partite, analisi e annunci. Sito non ufficiale. Forza Roma!"],
  "/pagelle": ["Pagelle dei tifosi della Roma | Roma+", "Vota i giocatori dell'AS Roma dopo ogni partita e confronta il tuo voto con quello degli altri romanisti."],
  "/vigilia": ["Vigilia della Roma: formazione e pronostico | Roma+", "La prossima partita della Roma: scegli la formazione dei tifosi e indovina il risultato."],
  "/analisi": ["Analisi AS Roma: tattica e dati | Roma+", "Analisi tattiche e dati sulle partite e sui giocatori dell'AS Roma, scritte per i tifosi romanisti."],
  "/biglietti": ["Annunci biglietti Roma tra tifosi | Roma+", "Bacheca di annunci tra tifosi della Roma. Biglietti e cambio intestatario solo sui canali ufficiali."],
  "/giocatori": ["Giocatori della Roma: la rosa e i voti dei tifosi | Roma+", "Tutti i giocatori della Roma 2026/27: numeri di maglia, ruoli e media voto dei tifosi romanisti, partita dopo partita."],
  "/radio": ["Radio Curva: la storia della Roma in onda | Roma+", "Radio Curva trasmette i racconti della storia della Roma: scudetti, notti europee, capitani e Curva Sud. Una radio di tifosi, sempre in onda."],
  "/storia": ["Storia della Roma: partite, Curva Sud e ricordi | Roma+", "La storia della Roma raccontata dai tifosi: Campo Testaccio, la Curva Sud, gli scudetti, le notti europee e i capitani che non dimentichiamo."],
  "/tifosi-roma": ["Tifosi della Roma: la casa dei romanisti | Roma+", "Roma+ è il sito indipendente della tifoseria della Roma: notizie, pagelle, analisi e partecipazione per tutti i romanisti. Forza Roma!"]
};
const VISTE = { "/": "casa", "/pagelle": "pagella", "/vigilia": "vigilia", "/analisi": "analisi", "/biglietti": "biglietti", "/giocatori": "giocatori", "/storia": "storia", "/radio": "radio", "/tifosi-roma": "tifosi" };
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const oggi = () => new Date(Date.now() + 36e5).toISOString().slice(0, 10);
// Ogni partita ha il suo indirizzo: squadre e data, per esempio roma-sassuolo-2026-11-07.
export const slugPartita = p => {
  const data = (String(p.id).match(/\d{4}-\d{2}-\d{2}$/) || [])[0] || oggi();
  return `${p.casa}-${p.ospiti}-${data}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
};
// L'archivio delle pagelle, con sempre dentro l'ultima partita giocata.
export const elencoPagelle = (valore, partita) => {
  const lista = valore ? JSON.parse(valore) : [];
  return partita?.id && !lista.some(x => x.id === partita.id) ? [{ ...partita, slug: slugPartita(partita) }, ...lista] : lista;
};
const perVoto = Object.fromEntries(GIOCATORI.map(g => [g.voti, g]));
const voto = n => n.toFixed(1).replace(".", ",").replace(",0", "");
const nomePartita = p => `${p.casa}-${p.ospiti} ${p.golCasa}-${p.golOspiti}`;
const rigaPagella = p => `<a class="voce-pagelle" href="/pagelle/${esc(p.slug)}"><b>${esc(nomePartita(p))}</b><span class="nota">${esc(p.data)}, ${esc(p.competizione)}</span></a>`;
function schedaPagella(p, voti, corrente) {
  const ruoli = Object.fromEntries((p.titolari || []).map(([n, r]) => [n, r]));
  const gol = (p.gol || []).map(([m, q]) => `${esc(m)}' ${esc(q === "casa" ? p.casa : p.ospiti)}`).join(", ");
  let frase = "I voti dei tifosi arrivano qui, giocatore per giocatore.";
  if (voti.length > 1) {
    const a = voti[0], b = voti[voti.length - 1];
    frase = `Per i romanisti il migliore è ${a.giocatore} con ${voto(a.m)}, il peggiore ${b.giocatore} con ${voto(b.m)}.`;
  }
  const nome = v => perVoto[v.giocatore] ? `<a href="/giocatori/${perVoto[v.giocatore].slug}">${esc(v.giocatore)}</a>` : esc(v.giocatore);
  return `<h1 class="striscione">Pagelle ${esc(nomePartita(p))}</h1><p class="nota">${esc(p.competizione)}, ${esc(p.data)}${gol ? `. Gol: ${gol}` : ""}</p><p>${esc(frase)}</p>`
    + (voti.length ? `<ol class="voti-partita">${voti.map(v => `<li><span>${nome(v)}${ruoli[v.giocatore] ? ` <small>${esc(ruoli[v.giocatore])}</small>` : ""}</span><b>${voto(v.m)}</b></li>`).join("")}</ol>` : "")
    + (corrente ? `<a class="bottone" href="/pagelle">Vota le pagelle</a>` : "");
}
const annoStoria = a => parseInt(a.anno, 10) || 0;
const voceStoria = a => `<a class="voce-storia" href="/storia/${esc(a.id)}"><span class="anno-storia">${esc(a.anno)}</span><span><b>${esc(a.titolo)}</b><span class="nota">${esc(a.riassunto)}</span></span></a>`;
const elencoStoria = l => `<div class="testa-storia"><h1>La nostra storia</h1><p>Ci sono cose che un romanista non legge: se le fa raccontare. Qui mettiamo quelle che ci hanno cambiato la vita, una alla volta, dall'inizio.</p></div><div class="linea-storia">${l.map(voceStoria).join("")}</div>`;
const stileFoto = a => /^\/(api\/img|img)\/[\w./-]+$/.test(a.copertina || "") ? ` style="--foto:url('${a.copertina}');--posto:${Math.min(100, Math.max(0, Number(a.posizione ?? 50)))}%"` : "";
function racconto(a, l) {
  const seguente = l[l.findIndex(x => x.id === a.id) + 1] || l[0];
  const corpo = String(a.testo || "").split(/\n\s*\n/).map(t => t.trim().startsWith("## ") ? `<h2>${esc(t.trim().slice(3))}</h2>` : `<p>${esc(t)}</p>`).join("");
  const fonti = (a.fonti || []).filter(([, u]) => /^https:\/\//.test(u)).map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener nofollow">${esc(n)}</a>`).join(" · ");
  return `<article class="racconto"><header class="testa-storia"${stileFoto(a)}><span class="anno-grande">${esc(a.anno)}</span><h1>${esc(a.titolo)}</h1><p class="nota">${esc(a.occhiello)}</p></header><div class="testo-storia">${corpo}</div>`
    + (seguente.id !== a.id ? `<a class="prossimo-racconto" href="/storia/${esc(seguente.id)}"><span class="nota">Il prossimo racconto</span><b>${esc(seguente.titolo)}</b></a>` : "")
    + `<p><a href="/storia">Tutta la nostra storia</a></p>${fonti ? `<p class="nota fonti-storia">Fonti: ${fonti}</p>` : ""}</article>`;
}
const REPARTI = [["Portiere", "Portieri"], ["Difensore", "Difensori"], ["Centrocampista", "Centrocampisti"], ["Attaccante", "Attaccanti"]];
function elencoGiocatori(medie) {
  const m = Object.fromEntries(medie.map(x => [x.giocatore, x.m]));
  const card = g => `<a class="card-giocatore" href="/giocatori/${g.slug}"><img src="/img/giocatori/mini/${g.slug}.webp" alt="${esc(g.nome)}" loading="lazy" width="150" height="180"><b>${esc(g.nome)}</b><span class="nota">Numero ${g.numero}${m[g.voti] != null ? `, media ${voto(m[g.voti])}` : ""}</span></a>`;
  return `<h1 class="striscione">I giocatori della Roma</h1><p>La rosa 2026/27 con la media voto dei tifosi romanisti.</p>`
    + REPARTI.map(([r, t]) => `<h2 class="striscione">${t}</h2><div class="griglia-giocatori">${GIOCATORI.filter(g => g.ruolo === r).map(card).join("")}</div>`).join("");
}
function schedaGiocatore(g, righe, pagelle) {
  const voci = righe.map(r => ({ ...r, p: pagelle.find(x => x.id === r.partita) })).filter(r => r.p);
  const media = voci.length ? voci.reduce((a, b) => a + b.m, 0) / voci.length : null;
  const presentazione = `${g.nome} è ${g.ruolo === "Attaccante" ? "un attaccante" : g.ruolo === "Difensore" ? "un difensore" : g.ruolo === "Portiere" ? "un portiere" : "un centrocampista"} della Roma, numero ${g.numero}${g.nazione ? `, nazionalità: ${g.nazione}` : ""}.`;
  return `<div class="testa-giocatore"><img src="/img/giocatori/mini/${g.slug}.webp" alt="${esc(g.nome)}" width="210" height="250"><div><h1 class="striscione">${esc(g.nome)}</h1><p>${esc(presentazione)}</p>${media != null ? `<p class="media-giocatore"><b>${voto(media)}</b> <span class="nota">media voto dei tifosi</span></p>` : ""}</div></div>`
    + `<h2 class="striscione">I voti dei tifosi</h2>`
    + (voci.length ? `<ol class="voti-partita">${voci.map(r => `<li><span><a href="/pagelle/${esc(r.p.slug)}">${esc(nomePartita(r.p))}</a> <small>${esc(r.p.data)}</small></span><b>${voto(r.m)}</b></li>`).join("")}</ol>` : `<p>I tifosi non lo hanno ancora votato in questa stagione.</p>`)
    + `<a class="bottone" href="/pagelle">Vota le pagelle</a><p><a href="/giocatori">Tutti i giocatori della Roma</a></p>`;
}
async function contenuti(ctx) {
  let c = null, seo = {}, pagelle = null, radio = false;
  try {
    const r = await ctx.env.DB.batch([
      ctx.env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='contenuti'"),
      ctx.env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='seo'"),
      ctx.env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='pagelle'"),
      ctx.env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='radio'")
    ]);
    if (r[0].results[0]) c = JSON.parse(r[0].results[0].valore);
    if (r[1].results[0]) seo = JSON.parse(r[1].results[0].valore);
    pagelle = r[2].results[0]?.valore;
    radio = !!r[3].results[0];
  } catch {}
  c ||= await (await ctx.env.ASSETS.fetch(new URL("/contenuti.json", ctx.request.url))).json();
  c.analisi = (c.analisi || []).filter(a => a.stato !== "bozza" && (!a.data || a.data <= oggi()));
  c.storia = (c.storia || []).filter(a => a.stato !== "bozza").sort((a, b) => annoStoria(a) - annoStoria(b));
  c.seo = seo; c.haRadio = radio;
  c.pagelle = elencoPagelle(pagelle, c.partita);
  return c;
}
const ldJson = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;

export async function onRequest(ctx) {
  const { request: req } = ctx;
  const url = new URL(req.url);
  const percorso = url.pathname.replace(/\/$/, "") || "/";
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin") || url.pathname.startsWith("/img/") || !["GET", "HEAD"].includes(req.method)) return ctx.next();
  if (percorso === "/sitemap.xml") {
    const c = await contenuti(ctx);
    const voci = [...Object.keys(PAGINE).filter(u => (u !== "/storia" || c.storia.length) && (u !== "/radio" || c.haRadio)), ...c.storia.map(a => "/storia/" + a.id), ...(c.analisi || []).map(a => "/analisi/" + a.id), ...c.pagelle.map(p => "/pagelle/" + p.slug), ...GIOCATORI.map(g => "/giocatori/" + g.slug)];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${voci.map(v => { const d = (c.analisi || []).find(a => "/analisi/" + a.id === v)?.data; return `<url><loc>${BASE}${v}</loc>${d ? `<lastmod>${esc(d)}</lastmod>` : ""}</url>`; }).join("\n")}\n</urlset>\n`;
    return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
  }
  const dettaglio = percorso.match(/^\/analisi\/([\w-]+)$/);
  const scheda = percorso.match(/^\/pagelle\/([\w-]+)$/);
  const unGiocatore = percorso.match(/^\/giocatori\/([\w-]+)$/);
  const unRacconto = percorso.match(/^\/storia\/([\w-]+)$/);
  if (!PAGINE[percorso] && !dettaglio && !scheda && !unGiocatore && !unRacconto) return ctx.next();
  const c = await contenuti(ctx);
  let [titolo, descrizione] = PAGINE[dettaglio ? "/analisi" : scheda ? "/pagelle" : unGiocatore ? "/giocatori" : unRacconto ? "/storia" : percorso] || [];
  const scelta = !dettaglio && !scheda && !unGiocatore && !unRacconto && c.seo.pagine?.[percorso];
  if (scelta?.titolo) titolo = scelta.titolo;
  if (scelta?.descrizione) descrizione = scelta.descrizione;
  const dati = [{ "@context": "https://schema.org", "@type": "WebSite", name: "Roma+", alternateName: ["roma-plus.it", "Roma Plus", "Curva Roma"], url: BASE + "/", inLanguage: "it" }];
  if (percorso === "/") dati.push({ "@context": "https://schema.org", "@type": "Organization", name: "Roma+", url: BASE + "/", logo: BASE + "/img/icona-512.png" });
  const articolo = dettaglio && (c.analisi || []).find(a => a.id === dettaglio[1]);
  if (dettaglio && !articolo) return new Response("Pagina non trovata", { status: 404 });
  if (articolo) {
    titolo = articolo.seoTitolo || `${articolo.titolo} | Roma+`; descrizione = articolo.seoDescrizione || articolo.riassunto || descrizione;
    dati.push({ "@context": "https://schema.org", "@type": "Article", headline: articolo.titolo, description: articolo.riassunto, image: new URL(articolo.copertina || "/img/anteprima.jpg", BASE).href, inLanguage: "it", mainEntityOfPage: BASE + percorso, author: { "@type": "Organization", name: "Roma+", url: BASE + "/" }, ...(articolo.data ? { datePublished: articolo.data, dateModified: articolo.data } : {}), publisher: { "@type": "Organization", name: "Roma+", logo: { "@type": "ImageObject", url: BASE + "/img/icona-512.png" } } });
  }
  if (percorso === "/vigilia" && c.prossima?.inizio) dati.push({ "@context": "https://schema.org", "@type": "SportsEvent", name: `${c.prossima.casa}-${c.prossima.ospiti}`, startDate: c.prossima.inizio, sport: "Calcio", homeTeam: { "@type": "SportsTeam", name: c.prossima.casa }, awayTeam: { "@type": "SportsTeam", name: c.prossima.ospiti } });
  const partita = scheda && c.pagelle.find(p => p.slug === scheda[1]);
  if (scheda && !partita) return new Response("Pagina non trovata", { status: 404 });
  let htmlScheda = "";
  if (partita) {
    const v = await ctx.env.DB.prepare("SELECT giocatore, AVG(voto) m FROM voti WHERE partita=? GROUP BY giocatore ORDER BY m DESC").bind(partita.id).all();
    titolo = `Pagelle ${nomePartita(partita)}: voti dei tifosi | Roma+`;
    descrizione = `Le pagelle di ${partita.casa}-${partita.ospiti} del ${partita.data}, ${partita.competizione}: i voti dei tifosi della Roma, giocatore per giocatore.`;
    htmlScheda = schedaPagella(partita, v.results, partita.id === c.partita?.id);
    const giorno = partita.slug.slice(-10);
    dati.push({ "@context": "https://schema.org", "@type": "Article", headline: `Pagelle ${nomePartita(partita)}`, description: descrizione, image: BASE + "/img/anteprima.jpg", inLanguage: "it", datePublished: giorno, mainEntityOfPage: BASE + percorso, author: { "@type": "Organization", name: "Roma+", url: BASE + "/" }, publisher: { "@type": "Organization", name: "Roma+", logo: { "@type": "ImageObject", url: BASE + "/img/icona-512.png" } } });
  }
  const storia = unRacconto && c.storia.find(a => a.id === unRacconto[1]);
  if (unRacconto && !storia) return new Response("Pagina non trovata", { status: 404 });
  let htmlStoria = percorso === "/storia" ? elencoStoria(c.storia) : "";
  if (storia) {
    htmlStoria = racconto(storia, c.storia);
    titolo = storia.seoTitolo || `${storia.titolo} | Roma+`; descrizione = storia.seoDescrizione || storia.riassunto;
    dati.push({ "@context": "https://schema.org", "@type": "Article", headline: storia.titolo, description: storia.riassunto, image: new URL(storia.copertina || "/img/anteprima.jpg", BASE).href, inLanguage: "it", mainEntityOfPage: BASE + percorso, author: { "@type": "Organization", name: "Roma+", url: BASE + "/" }, publisher: { "@type": "Organization", name: "Roma+", logo: { "@type": "ImageObject", url: BASE + "/img/icona-512.png" } } });
  }
  const giocatore = unGiocatore && GIOCATORI.find(g => g.slug === unGiocatore[1]);
  if (unGiocatore && !giocatore) return new Response("Pagina non trovata", { status: 404 });
  let htmlGiocatori = "";
  if (percorso === "/giocatori") htmlGiocatori = elencoGiocatori((await ctx.env.DB.prepare("SELECT giocatore, AVG(voto) m FROM voti GROUP BY giocatore").all()).results);
  if (giocatore) {
    const r = await ctx.env.DB.prepare("SELECT partita, AVG(voto) m FROM voti WHERE giocatore=? GROUP BY partita").bind(giocatore.voti).all();
    htmlGiocatori = schedaGiocatore(giocatore, r.results, c.pagelle);
    titolo = `${giocatore.nome}: voti dei tifosi della Roma | Roma+`;
    descrizione = `${giocatore.nome}, ${giocatore.ruolo.toLowerCase()} della Roma, numero ${giocatore.numero}: la media voto dei tifosi romanisti e tutte le sue pagelle, partita per partita.`;
    dati.push({ "@context": "https://schema.org", "@type": "Person", name: giocatore.nome, url: BASE + percorso, image: `${BASE}/img/giocatori/mini/${giocatore.slug}.webp`, jobTitle: "Calciatore", memberOf: { "@type": "SportsTeam", name: "AS Roma" } });
  }
  const canonico = BASE + (percorso === "/" ? "/" : percorso);
  const risposta = await ctx.env.ASSETS.fetch(new URL("/", url));
  const paragrafi = a => String(a.testo || "").split(/\n\s*\n/).map(t => t.trim().startsWith("## ") ? `<h2>${esc(t.trim().slice(3))}</h2>` : `<p>${esc(t)}</p>`).join("");
  const articoli = articolo
    ? `<article class="articolo"><h1>${esc(articolo.titolo)}</h1><p class="nota">${esc(articolo.occhiello)}</p>${paragrafi(articolo)}</article>`
    : (c.analisi || []).map(a => `<article class="articolo"><h2><a href="/analisi/${esc(a.id)}">${esc(a.titolo)}</a></h2><p class="nota">${esc(a.occhiello)}</p><p>${esc(a.riassunto)}</p></article>`).join("");
  const attiva = dettaglio ? "analisi" : scheda ? "pagella" : unGiocatore ? "giocatori" : unRacconto ? "storia" : VISTE[percorso];
  let rw = new HTMLRewriter()
    .on("title", { element: e => e.setInnerContent(titolo) })
    .on('meta[name="description"]', { element: e => e.setAttribute("content", descrizione) })
    .on('meta[property="og:title"]', { element: e => e.setAttribute("content", titolo) })
    .on('meta[property="og:description"]', { element: e => e.setAttribute("content", descrizione) })
    .on('meta[property="og:url"]', { element: e => e.setAttribute("content", canonico) })
    .on('link[rel="canonical"]', { element: e => e.setAttribute("href", canonico) })
    .on("head", { element: e => e.append(dati.map(ldJson).join(""), { html: true }) })
    .on("body", { element: e => e.setAttribute("data-vista", attiva) })
    .on(".eroe h1", { element: e => { if (attiva !== "casa") e.tagName = "h2"; } })
    .on(".vista", { element: e => { if (e.getAttribute("id") === "v-" + attiva) e.removeAttribute("hidden"); else e.setAttribute("hidden", ""); } })
    .on("#analisi-tutte", { element: e => e.setInnerContent(articoli, { html: true }) });
  if (htmlStoria) rw = rw.on("#storia-box", { element: e => e.setInnerContent(htmlStoria, { html: true }) });
  if (htmlGiocatori) rw = rw.on("#giocatori-box", { element: e => e.setInnerContent(htmlGiocatori, { html: true }) });
  if (attiva === "pagella") rw = rw.on("#pagelle-archivio", { element: e => e.setInnerContent(c.pagelle.map(rigaPagella).join(""), { html: true }) });
  if (partita) rw = rw
    .on("body", { element: e => e.setAttribute("data-partita", "") })
    .on("#pagella-partita", { element: e => e.setInnerContent(htmlScheda, { html: true }) });
  if (storia) rw = rw
    .on('meta[property="og:type"]', { element: e => e.setAttribute("content", "article") })
    .on('meta[property="og:image"]', { element: e => e.setAttribute("content", new URL(storia.copertina || "/img/anteprima.jpg", BASE).href) });
  if (articolo) rw = rw
    .on('meta[property="og:type"]', { element: e => e.setAttribute("content", "article") })
    .on('meta[property="og:image"]', { element: e => e.setAttribute("content", new URL(articolo.copertina || "/img/anteprima.jpg", BASE).href) });
  for (const v of Object.values(VISTE)) if (v !== attiva || dettaglio || scheda || v === "storia") rw = rw.on(`#v-${v} h1`, { element: e => { e.tagName = "h2"; } });
  const out = rw.transform(risposta);
  const h = new Headers(out.headers);
  h.set("content-type", "text/html; charset=utf-8");
  h.set("cache-control", "public, max-age=0, must-revalidate");
  if (url.hostname.endsWith(".pages.dev")) h.set("x-robots-tag", "noindex");
  return new Response(out.body, { status: 200, headers: h });
}
