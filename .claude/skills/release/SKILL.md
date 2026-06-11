---
name: release
description: Stacca una nuova versione (bump package.json, CHANGELOG, commit chore(release) e tag vX.Y.Z) alla pari di commit-and-tag-version, ma con il changelog generato analizzando i commit e i diff dal tag precedente e il bump semver inferito dalla natura reale delle modifiche. Usare quando l'utente chiede di rilasciare, fare una release, staccare/taggare una versione.
---

# Rilascio assistito dall'IA

La procedura completa è in [`docs/ia/skills/rilascio-ia.md`](../../../docs/ia/skills/rilascio-ia.md) — **unica fonte di verità**.

Leggi quel file ed esegui ciò che descrive: determina il tag precedente, analizza i commit e i diff dell'intervallo, decide il livello semver (o usa quello forzato), scrive la sezione di CHANGELOG, aggiorna `package.json`, crea il commit `chore(release): x.y.z` e il tag `vX.Y.Z`. Il `git push` resta un atto esplicito dell'utente.

Non duplicare qui le istruzioni: se servono dettagli, leggi la pagina.
