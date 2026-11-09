# Scrive su file un segreto di GitHub, accettandolo sia in base64 (anche con a capo e spazi)
# sia incollato così com'è (JSON o plist). Stampa solo il formato riconosciuto, mai il contenuto.
# Uso: python3 .github/scripts/segreto.py NOME_VARIABILE percorso/uscita
import base64, binascii, os, re, sys

nome, uscita = sys.argv[1], sys.argv[2]
valore = os.environ.get(nome, "").strip().lstrip("﻿")
if not valore:
    sys.exit(f"{nome}: vuoto")
if valore.startswith("{") or valore.startswith("<?xml") or valore.startswith("<plist"):
    dati, formato = valore.encode(), "testo così com'è"
else:
    pulito = re.sub(r"\s+", "", valore)
    if pulito.startswith("data:") and "," in pulito:
        pulito = pulito.split(",", 1)[1]
    pulito = pulito.replace("-", "+").replace("_", "/")
    pulito += "=" * (-len(pulito) % 4)
    try:
        dati, formato = base64.b64decode(pulito, validate=True), "base64"
    except (binascii.Error, ValueError):
        sys.exit(f"::error::{nome}: non è né base64 né il file incollato così com'è ({len(valore)} caratteri). Rifai il segreto.")
os.makedirs(os.path.dirname(uscita) or ".", exist_ok=True)
open(uscita, "wb").write(dati)
print(f"{nome}: letto come {formato}, {len(dati)} byte")
