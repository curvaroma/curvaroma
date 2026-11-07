# Passaggio a Roma+ (roma-plus.it)

Il ramo `rebranding/roma-plus` contiene nome, logo, icone e dominio nuovi. Non va su main finché Andrea non dà l'OK e il dominio non è pronto.

## Prima di unire il ramo
1. Cloudflare Pages: aggiungi roma-plus.it (e www) come dominio personalizzato del progetto.
2. Redirect 301 da curvaroma.it e www.curvaroma.it a https://roma-plus.it, stesso percorso (regola di reindirizzamento a livello di zona, così restano validi i link vecchi e il posizionamento su Google).
3. Search Console: aggiungi roma-plus.it e usa "Cambio di indirizzo" da curvaroma.it.

## Al momento dell'unione
- Database, riga seo: `UPDATE impostazioni SET valore = replace(valore, 'Curva Roma', 'Roma+') WHERE chiave='seo'` e aggiungi "roma plus" alle parole chiave.
- Instagram: nome profilo, bio e link roma-plus.it.
- Routine mattutina: "Link in bio: roma-plus.it", hashtag #romaplus al posto di #curvaroma, pannello su roma-plus.it/admin.
- App: ricostruire Android e iOS (nome e icone nuovi). L'identificativo it.curvaroma.app resta uguale apposta.

## File del marchio
- img/brand/roma-plus-logo.svg: logo originale, per fondi scuri
- img/brand/roma-plus-logo-su-chiaro.svg: variante per fondi chiari (ROMA bordeaux, + oro)
- img/brand/r-plus-monogramma.svg: monogramma R+
- img/brand/r-plus-app.svg: icona app, fondo #7E031A
