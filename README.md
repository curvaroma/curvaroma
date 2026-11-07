# Roma+

Sito di tifosi della Roma non ufficiale: roma-plus.it (prima curvaroma.it).

- `index.html` e `img/`: il sito.
- `functions/api/`: API per voti, pronostici, formazioni, annunci e notizie.

Hosting: Cloudflare Pages, senza comando di build, cartella di output `/`.
Database: D1 `curvaroma`, collegato al progetto Pages con il binding `DB`.
Pannello: `/admin`, password nella variabile segreta `ADMIN_PASSWORD` del progetto Pages.
