---
name: commit
description: Crea i commit delle modifiche pendenti raggruppandole nel minor numero di commit Conventional Commits possibile, senza mescolare intenti con peso semver diverso (feat/fix/docs). Usare quando l'utente chiede di committare, fare commit, o spezzare le modifiche in commit puliti.
---

# Commit assistito dall'IA

La procedura completa è in [`docs/ia/skills/commit-ia.md`](../../../docs/ia/skills/commit-ia.md) — **unica fonte di verità**.

Leggi quel file ed esegui ciò che descrive: criterio (accorpare vs non mescolare, con precedenza alla purezza dell'intento), passi (ispezione working tree → classifica per intento → separa gli hunk misti → raggruppa → ordina → messaggi Conventional Commits → commit), parametri e vincoli.

Non duplicare qui le istruzioni: se servono dettagli, leggi la pagina.
