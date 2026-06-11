---
sidebar_position: 1
description: Cos'è una skill — procedura operativa ripetibile che un agente IA esegue sul progetto, descritta una sola volta e versionata insieme al codice.
---

# Skill

Una **skill** è una procedura operativa che un agente IA esegue sul progetto: una sequenza di passi con vincoli espliciti, descritta una sola volta e applicabile ogni volta che serve.

L'idea è la stessa di uno script, ma il «corpo» della procedura non è codice rigido: è una descrizione che l'agente interpreta nel contesto. Questo permette passi che uno script non saprebbe fare — leggere un diff e capirne l'intento, scrivere una voce di changelog in prosa curata, decidere se una modifica è un *breaking change*.

## Doppia natura

Ogni pagina di questa cartella ha due ruoli, ed è scritta per esserne consapevole:

- **Documentazione** — descrive la procedura a chi legge: cosa fa, perché, con quali vincoli.
- **Specifica operativa** — è la fonte di verità da cui un agente IA (incluso Claude Code) esegue la skill.

Le due cose non vanno tenute separate: la stessa pagina è il contratto. Quando esiste anche un'implementazione eseguibile della skill — per Claude Code, sotto `.claude/skills/` — questa pagina resta la fonte di verità e va tenuta allineata.

## Vincoli trasversali

Indipendentemente da cosa fa, una skill rispetta le regole già stabilite nel resto della guida:

- scrive nel **registro impersonale** ([documentazione](../../regole/documentazione.md));
- non introduce ambiguità tra forme equivalenti — una sola via consigliata;
- lascia il progetto in uno stato tracciabile: ogni effetto sul repository è leggibile dalla storia git.

## Skill disponibili

- [Commit assistito dall'IA](commit-ia.md) — raggruppa le modifiche pendenti nel minor numero di commit Conventional Commits possibile, senza mescolare intenti diversi.
- [Rilascio assistito dall'IA](rilascio-ia.md) — `commit-and-tag-version`, ma con il changelog prodotto dall'analisi dei commit rispetto alla versione precedente.
