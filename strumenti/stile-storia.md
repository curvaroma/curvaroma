# Stile dei racconti di storia di Roma+

Sezione Storia di roma-plus.it, sito NON ufficiale di tifosi della Roma. È la sezione che celebra la Roma: ogni racconto deve far sentire fiero chi lo legge, e commuoverlo.

## LA VOCE (decisa da Andrea il 10 novembre 2026): narrativa, giornalistica, da tifoso, romantica
Andrea ha bocciato i racconti scritti prima perché "sembrano asettici": qui si parla della Roma, una cosa importantissima per tutti. Il modello è lo stile de Il Romanista (ilromanista.eu, vedi anche strumenti/stile-analisi.md), portato sul racconto: un cronista innamorato della Roma che racconta una storia, non un'enciclopedia che elenca fatti.
- Narrativa: si racconta come una storia, con un inizio che ti prende per mano, una progressione e un finale. Non una scheda con date in fila.
- Giornalistica: date, nomi, luoghi, risultati e numeri esatti, messi al punto giusto della storia, come in un grande pezzo di giornale.
- Da tifoso: lo sguardo è quello di chi è romanista. Si usa il "noi" quando viene naturale ("la nostra Roma", "noi romanisti"), si parla della gente, della Sud, di Testaccio, di Trigoria, della città.
- Romantica: si cerca il significato, non solo il fatto. Cosa ha voluto dire per Roma, per chi c'era, per chi è venuto dopo. Il filo che lega quel momento alla Roma di oggi. Immagini, metafore, richiami tra passato e presente.
- Ritmo: paragrafi pieni, frasi lunghe che scorrono con gli incisi, poi frasi brevissime che danno il colpo. Anafore e ripetizioni volute dove servono. Mai elenchi.
- Attacco: una scena o una frase che è già il cuore della storia, il momento più alto o l'immagine più forte. Mai "X nasce il..." come prima riga.
- Sottotitoli (2 o 3): brevi, evocativi, assertivi, come titoli di capitolo. Mai etichette neutre ("Gli inizi", "La carriera").
- Chiusa: sale, lega la storia a chi legge oggi, lascia i brividi. Una sola immagine finale, ben piazzata.
- Lessico: quello del calcio raccontato bene (la fascia, la maglia, la curva, il popolo giallorosso, la notte, il boato, la Capitale), senza retorica vuota né frasi fatte in serie.

## TONO: CELEBRATIVO (deciso da Andrea il 7 novembre)
Si parla SOLO bene della Roma. Al centro ci sono le vittorie, i gol, i campioni, le notti magiche, il popolo giallorosso. Sconfitte pesanti, umiliazioni, scandali, polemiche, litigi, addii amari e momenti bui non si raccontano. Se il tema stesso è una partita persa, si celebrano il cammino, la squadra e la gente, e il risultato si dice una volta sola, senza insistere: mai cambiarlo o nasconderlo. Mai citare goleade subite.
Niente "te lo racconto", "siediti" e tono da padre a figlio. Niente clickbait. Evita "non è solo X, è Y" (al massimo una volta) e i trattini lunghi.

## REGOLE FERREE
- Ogni fatto (date, risultati, marcatori, nomi, numeri) deve essere confermato da almeno due fonti indipendenti. Se non si conferma, via. Quando si riscrive un racconto già pubblicato si usano SOLO i fatti già presenti nel testo (già verificati): si possono togliere, non aggiungere senza due fonti.
- Il romanticismo sta nello sguardo e nella scrittura, mai in dettagli inventati. Vietato inventare scene, gesti, pensieri, meteo, lacrime, emozioni di persone reali o frasi. Si può dire cosa ha significato per i romanisti, non cosa ha pensato o provato un giocatore, salvo che sia documentato. Niente virgolettati, salvo frasi brevissime confermate da due fonti.
- Scrittura originale: non copiare testi di altre testate, Il Romanista compreso. Mai versi di canzoni, inni o cori, nemmeno uno.
- Morti di persone: solo con pudore. Nessun riferimento a modo o cause per suicidi: per Di Bartolomei solo la data, 30 maggio 1994. Niente esaltazione della violenza, niente odio o scherno verso avversari, arbitri o persone.

## FORMATO
Array JSON di oggetti con: id, anno (numero o stringa), epoca, titolo (specifico ed evocativo, con il respiro di "Daniele De Rossi, da Capitan Futuro a Leggenda Eterna", il titolo scelto da Andrea), occhiello, riassunto (max 2 frasi, già con la voce del racconto), testo (tra 550 e 850 parole, riga vuota tra i paragrafi, ## davanti a 2-3 sottotitoli), seoTitolo (max 60 caratteri), seoDescrizione (tra 120 e 155 caratteri), fonti (lista di [nome, url], almeno 2).
Nelle riscritture si mandano solo id e i campi di testo cambiati: copertina, posizione della foto, fonti e stato restano quelli del database (il tasto Pubblica unisce i campi).
Controlla con uno script JSON valido, parole e caratteri. Un titolo scelto da Andrea non si cambia.
