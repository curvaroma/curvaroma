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
