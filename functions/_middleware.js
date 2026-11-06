// Titoli, descrizioni e contenuti leggibili da Google per ogni pagina.
const BASE = "https://curvaroma.it";
export const PAGINE = {
  "/": ["Curva Roma: notizie AS Roma, pagelle e tifosi romanisti", "Curva Roma è il sito dei tifosi della Roma: notizie sull'AS Roma, pagelle dei tifosi, vigilia delle partite, analisi e annunci. Sito non ufficiale. Forza Roma!"],
  "/pagelle": ["Pagelle dei tifosi della Roma | Curva Roma", "Vota i giocatori dell'AS Roma dopo ogni partita e confronta il tuo voto con quello degli altri romanisti."],
  "/vigilia": ["Vigilia della Roma: formazione e pronostico | Curva Roma", "La prossima partita della Roma: scegli la formazione dei tifosi e indovina il risultato."],
  "/analisi": ["Analisi AS Roma: tattica e dati | Curva Roma", "Analisi tattiche e dati sulle partite e sui giocatori dell'AS Roma, scritte per i tifosi romanisti."],
  "/biglietti": ["Annunci biglietti Roma tra tifosi | Curva Roma", "Bacheca di annunci tra tifosi della Roma. Biglietti e cambio intestatario solo sui canali ufficiali."],
  "/tifosi-roma": ["Tifosi della Roma: la casa dei romanisti | Curva Roma", "Curva Roma è il sito indipendente della tifoseria della Roma: notizie, pagelle, analisi e partecipazione per tutti i romanisti. Forza Roma!"]
};
const VISTE = { "/": "casa", "/pagelle": "pagella", "/vigilia": "vigilia", "/analisi": "analisi", "/biglietti": "biglietti", "/tifosi-roma": "tifosi" };
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
const MIN_VOTANTI = 3; // Sotto questa soglia la pagina resta fuori da Google: sarebbe troppo povera.
const voto = n => n.toFixed(1).replace(".", ",").replace(",0", "");
const nomePartita = p => `${p.casa}-${p.ospiti} ${p.golCasa}-${p.golOspiti}`;
const rigaPagella = p => `<a class="voce-pagelle" href="/pagelle/${esc(p.slug)}"><b>${esc(nomePartita(p))}</b><span class="nota">${esc(p.data)}, ${esc(p.competizione)}</span></a>`;
function schedaPagella(p, voti, schede, corrente) {
  const ruoli = Object.fromEntries((p.titolari || []).map(([n, r]) => [n, r]));
  const gol = (p.gol || []).map(([m, s]) => `${esc(m)}' ${esc(s === "casa" ? p.casa : p.ospiti)}`).join(", ");
  let frase = schede === 1 ? "Ha votato 1 tifoso." : schede ? `Hanno votato ${schede} tifosi.` : "Ancora nessun voto.";
  if (schede >= MIN_VOTANTI && voti.length > 1) {
    const a = voti[0], b = voti[voti.length - 1];
    frase += ` Per i romanisti il migliore è ${a.giocatore} con ${voto(a.m)}, il peggiore ${b.giocatore} con ${voto(b.m)}.`;
  }
  return `<h1 class="striscione">Pagelle ${esc(nomePartita(p))}</h1><p class="nota">${esc(p.competizione)}, ${esc(p.data)}${gol ? `. Gol: ${gol}` : ""}</p><p>${esc(frase)}</p>`
    + (voti.length ? `<ol class="voti-partita">${voti.map(v => `<li><span>${esc(v.giocatore)}${ruoli[v.giocatore] ? ` <small>${esc(ruoli[v.giocatore])}</small>` : ""}</span><b>${voto(v.m)}</b></li>`).join("")}</ol>` : "")
    + (corrente ? `<a class="bottone" href="/pagelle">Vota le pagelle</a>` : "");
}
async function contenuti(ctx) {
  let c = null, seo = {}, pagelle = null;
  try {
    const r = await ctx.env.DB.batch([
      ctx.env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='contenuti'"),
      ctx.env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='seo'"),
      ctx.env.DB.prepare("SELECT valore FROM impostazioni WHERE chiave='pagelle'")
    ]);
    if (r[0].results[0]) c = JSON.parse(r[0].results[0].valore);
    if (r[1].results[0]) seo = JSON.parse(r[1].results[0].valore);
    pagelle = r[2].results[0]?.valore;
  } catch {}
  c ||= await (await ctx.env.ASSETS.fetch(new URL("/contenuti.json", ctx.request.url))).json();
  c.analisi = (c.analisi || []).filter(a => a.stato !== "bozza" && (!a.data || a.data <= oggi()));
  c.seo = seo;
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
    const votanti = Object.fromEntries((await ctx.env.DB.prepare("SELECT partita, COUNT(DISTINCT tifoso_id) n FROM voti GROUP BY partita").all()).results.map(r => [r.partita, r.n]));
    const voci = [...Object.keys(PAGINE), ...(c.analisi || []).map(a => "/analisi/" + a.id), ...c.pagelle.filter(p => votanti[p.id] >= MIN_VOTANTI).map(p => "/pagelle/" + p.slug)];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${voci.map(v => { const d = (c.analisi || []).find(a => "/analisi/" + a.id === v)?.data; return `<url><loc>${BASE}${v}</loc>${d ? `<lastmod>${esc(d)}</lastmod>` : ""}</url>`; }).join("\n")}\n</urlset>\n`;
    return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
  }
  const dettaglio = percorso.match(/^\/analisi\/([\w-]+)$/);
  const scheda = percorso.match(/^\/pagelle\/([\w-]+)$/);
  if (!PAGINE[percorso] && !dettaglio && !scheda) return ctx.next();
  const c = await contenuti(ctx);
  let [titolo, descrizione] = PAGINE[dettaglio ? "/analisi" : scheda ? "/pagelle" : percorso] || [];
  const scelta = !dettaglio && !scheda && c.seo.pagine?.[percorso];
  if (scelta?.titolo) titolo = scelta.titolo;
  if (scelta?.descrizione) descrizione = scelta.descrizione;
  const dati = [{ "@context": "https://schema.org", "@type": "WebSite", name: "Curva Roma", alternateName: "curvaroma.it", url: BASE + "/", inLanguage: "it" }];
  if (percorso === "/") dati.push({ "@context": "https://schema.org", "@type": "Organization", name: "Curva Roma", url: BASE + "/", logo: BASE + "/img/icona-512.png" });
  const articolo = dettaglio && (c.analisi || []).find(a => a.id === dettaglio[1]);
  if (dettaglio && !articolo) return new Response("Pagina non trovata", { status: 404 });
  if (articolo) {
    titolo = articolo.seoTitolo || `${articolo.titolo} | Curva Roma`; descrizione = articolo.seoDescrizione || articolo.riassunto || descrizione;
    dati.push({ "@context": "https://schema.org", "@type": "Article", headline: articolo.titolo, description: articolo.riassunto, image: new URL(articolo.copertina || "/img/anteprima.jpg", BASE).href, inLanguage: "it", mainEntityOfPage: BASE + percorso, author: { "@type": "Organization", name: "Curva Roma", url: BASE + "/" }, ...(articolo.data ? { datePublished: articolo.data, dateModified: articolo.data } : {}), publisher: { "@type": "Organization", name: "Curva Roma", logo: { "@type": "ImageObject", url: BASE + "/img/icona-512.png" } } });
  }
  if (percorso === "/vigilia" && c.prossima?.inizio) dati.push({ "@context": "https://schema.org", "@type": "SportsEvent", name: `${c.prossima.casa}-${c.prossima.ospiti}`, startDate: c.prossima.inizio, sport: "Calcio", homeTeam: { "@type": "SportsTeam", name: c.prossima.casa }, awayTeam: { "@type": "SportsTeam", name: c.prossima.ospiti } });
  const partita = scheda && c.pagelle.find(p => p.slug === scheda[1]);
  if (scheda && !partita) return new Response("Pagina non trovata", { status: 404 });
  let htmlScheda = "", testa = "";
  if (partita) {
    const [v, n] = await ctx.env.DB.batch([
      ctx.env.DB.prepare("SELECT giocatore, AVG(voto) m FROM voti WHERE partita=? GROUP BY giocatore ORDER BY m DESC").bind(partita.id),
      ctx.env.DB.prepare("SELECT COUNT(DISTINCT tifoso_id) n FROM voti WHERE partita=?").bind(partita.id)
    ]);
    const schede = n.results[0].n;
    titolo = `Pagelle ${nomePartita(partita)}: voti dei tifosi | Curva Roma`;
    descrizione = `Le pagelle di ${partita.casa}-${partita.ospiti} del ${partita.data}, ${partita.competizione}: i voti dei tifosi della Roma, giocatore per giocatore.`;
    htmlScheda = schedaPagella(partita, v.results, schede, partita.id === c.partita?.id);
    const giorno = partita.slug.slice(-10);
    dati.push({ "@context": "https://schema.org", "@type": "Article", headline: `Pagelle ${nomePartita(partita)}`, description: descrizione, image: BASE + "/img/anteprima.jpg", inLanguage: "it", datePublished: giorno, mainEntityOfPage: BASE + percorso, author: { "@type": "Organization", name: "Curva Roma", url: BASE + "/" }, publisher: { "@type": "Organization", name: "Curva Roma", logo: { "@type": "ImageObject", url: BASE + "/img/icona-512.png" } } });
    if (schede < MIN_VOTANTI) testa = '<meta name="robots" content="noindex,follow">';
  }
  const canonico = BASE + (percorso === "/" ? "/" : percorso);
  const risposta = await ctx.env.ASSETS.fetch(new URL("/", url));
  const paragrafi = a => String(a.testo || "").split(/\n\s*\n/).map(t => t.trim().startsWith("## ") ? `<h2>${esc(t.trim().slice(3))}</h2>` : `<p>${esc(t)}</p>`).join("");
  const articoli = articolo
    ? `<article class="articolo"><h1>${esc(articolo.titolo)}</h1><p class="nota">${esc(articolo.occhiello)}</p>${paragrafi(articolo)}</article>`
    : (c.analisi || []).map(a => `<article class="articolo"><h2><a href="/analisi/${esc(a.id)}">${esc(a.titolo)}</a></h2><p class="nota">${esc(a.occhiello)}</p><p>${esc(a.riassunto)}</p></article>`).join("");
  const attiva = dettaglio ? "analisi" : scheda ? "pagella" : VISTE[percorso];
  let rw = new HTMLRewriter()
    .on("title", { element: e => e.setInnerContent(titolo) })
    .on('meta[name="description"]', { element: e => e.setAttribute("content", descrizione) })
    .on('meta[property="og:title"]', { element: e => e.setAttribute("content", titolo) })
    .on('meta[property="og:description"]', { element: e => e.setAttribute("content", descrizione) })
    .on('meta[property="og:url"]', { element: e => e.setAttribute("content", canonico) })
    .on('link[rel="canonical"]', { element: e => e.setAttribute("href", canonico) })
    .on("head", { element: e => e.append(testa + dati.map(ldJson).join(""), { html: true }) })
    .on("body", { element: e => e.setAttribute("data-vista", attiva) })
    .on(".eroe h1", { element: e => { if (attiva !== "casa") e.tagName = "h2"; } })
    .on(".vista", { element: e => { if (e.getAttribute("id") === "v-" + attiva) e.removeAttribute("hidden"); else e.setAttribute("hidden", ""); } })
    .on("#analisi-tutte", { element: e => e.setInnerContent(articoli, { html: true }) });
  if (attiva === "pagella") rw = rw.on("#pagelle-archivio", { element: e => e.setInnerContent(c.pagelle.map(rigaPagella).join(""), { html: true }) });
  if (partita) rw = rw
    .on("body", { element: e => e.setAttribute("data-partita", "") })
    .on("#pagella-partita", { element: e => e.setInnerContent(htmlScheda, { html: true }) });
  if (articolo) rw = rw
    .on('meta[property="og:type"]', { element: e => e.setAttribute("content", "article") })
    .on('meta[property="og:image"]', { element: e => e.setAttribute("content", new URL(articolo.copertina || "/img/anteprima.jpg", BASE).href) });
  for (const v of Object.values(VISTE)) if (v !== attiva || dettaglio || scheda) rw = rw.on(`#v-${v} h1`, { element: e => { e.tagName = "h2"; } });
  const out = rw.transform(risposta);
  const h = new Headers(out.headers);
  h.set("content-type", "text/html; charset=utf-8");
  h.set("cache-control", "public, max-age=0, must-revalidate");
  if (url.hostname.endsWith(".pages.dev")) h.set("x-robots-tag", "noindex");
  return new Response(out.body, { status: 200, headers: h });
}
