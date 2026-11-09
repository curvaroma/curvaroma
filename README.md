# Roma+

Sito di tifosi della Roma non ufficiale: roma-plus.it (prima curvaroma.it).

- `index.html` e `img/`: il sito.
- `functions/api/`: API per voti, pronostici, formazioni, annunci e notizie.

Hosting: Cloudflare Pages, senza comando di build, cartella di output `/`.
Database: D1 `curvaroma`, collegato al progetto Pages con il binding `DB`.
Pannello: `/admin`, password nella variabile segreta `ADMIN_PASSWORD` del progetto Pages.

## Notifiche dell'app
- Server: variabile segreta `FCM_SERVICE_ACCOUNT` del progetto Pages, con il JSON intero dell'account di servizio Firebase (progetto `roma-plus`). Senza, le notifiche non partono e il resto funziona. Dopo averla cambiata serve un nuovo deploy.
- App: secrets GitHub `GOOGLE_SERVICES_JSON_BASE64` (Android), `GOOGLE_SERVICE_INFO_PLIST_BASE64` e `CURVAROMA_IOS_PROVISIONING_PROFILE_BASE64` con Push Notifications (iOS). La chiave APNs `.p8` è caricata in Firebase.
- Ogni invio è registrato nella riga `notifiche` di `impostazioni`, con l'esito.

## Chiave di caricamento Android (Google Play)
- Creata il 9 novembre 2026 dal workflow "Crea chiave Android" e salvata cifrata (AES-256) in `app/android/app/chiave-upload.jks.enc`. Alias `romaplus`.
- La password è solo nel secret `CURVAROMA_ANDROID_KEYSTORE_PASSWORD` e nelle mani di Andrea: senza, il file non si può aprire. Non rilanciare il workflow: la chiave non va cambiata.
- La build Android la decifra da sola; il passo "Controlla la firma" ferma la build se il bundle non è firmato.
