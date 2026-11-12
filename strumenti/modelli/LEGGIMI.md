# Modelli delle grafiche Instagram

Chiesto da Andrea il 10 novembre: i post non devono avere sempre la stessa grafica. Si sceglie il modello in base al contenuto e non si usa lo stesso stile due giorni di fila.

Uso: NODE_PATH=$(npm root -g) node strumenti/post.js strumenti/modelli/<modello>.json social/AAAA-MM-GG.jpg

| stile | quando | campi |
|---|---|---|
| (nessuno) | foto e titolo, o tre giocatori con "giocatori" | titolo, testo, foto, alto, giocatori |
| numero | dato di stagione, record | numero, etichetta, dati [[valore, etichetta]], giocatore |
| confronto | numeri della sfida, statistiche di una partita | titolo, squadre, righe [[statistica, Roma, avversario]] |
| domanda | sondaggio, risultato da indovinare, migliore in campo | titolo, opzioni (2-4) |
| lista | pagella dei tifosi, classifica, top 5 | titolo, testo, righe [[nome, valore]] (max 8) |
| risultato | fine partita | competizione, casa, ospiti, golCasa, golOspiti, testo (marcatori), foto, alto |
| storia | racconto della sezione Storia | anno, titolo, testo, foto, alto |
| prodotto | post Amazon (#ad), stile giovane | titolo, testo, foto (foto del prodotto), adesivo, nastro |

Campi comuni: tag (etichetta in alto a destra), cta (frase in basso a destra che invita a commentare o andare sul sito).
Gli esempi in questa cartella usano dati già pubblicati di Roma-Sassuolo 3-0. Niente stemma della Roma sulle grafiche, niente numero di votanti.
