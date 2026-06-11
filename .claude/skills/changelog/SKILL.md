---
name: changelog
description: Aggiorna il changelog in home page con le ultime dieci modifiche alla documentazione, scrivendo una voce in testa a src/data/changelog.json e troncando a dieci. Usare quando si aggiunge, aggiorna o rimuove un contenuto della documentazione, o quando l'utente chiede di aggiornare il changelog o le ultime modifiche in home.
---

# Changelog in home page (skill interna)

La home page (`src/pages/index.tsx`) mostra, **sotto le schede degli argomenti**, le **ultime dieci modifiche** alla documentazione. La fonte è `src/data/changelog.json`, un array di voci dalla più recente alla più vecchia; la home ne renderizza le prime dieci.

Questa è una skill **interna**: non ha una pagina pubblica in `docs/ia/skills/` e non va registrata in glossario o indice analitico.

## Schema di una voce

```json
{
  "date": "2026-06-11",
  "tag": "Nuovo",
  "title": "Sezione sui database relazionali e le buone pratiche di indicizzazione",
  "path": "/docs/tecnologie/database-relazionali/"
}
```

| Campo   | Significato                                                                          |
|---------|-------------------------------------------------------------------------------------|
| `date`  | Data della modifica in formato `YYYY-MM-DD` (la data odierna).                       |
| `tag`   | Natura della modifica: `Nuovo`, `Aggiornato` o `Rimosso`. Nessun altro valore.      |
| `title` | Descrizione concisa nel **registro impersonale**, senza punto finale.               |
| `path`  | URL interno della pagina coinvolta. Deve essere una rotta esistente del sito.        |

## Quando si esegue

Ogni volta che una modifica **aggiunge, aggiorna o rimuove un contenuto** della documentazione che valga la pena mostrare in home. Fa parte della modifica stessa: non si aspetta che venga chiesto, come per glossario e indice analitico. Non si registrano i cambiamenti puramente interni (refactor, stile, configurazione, tooling) che non toccano i contenuti del sito.

## Procedura

1. **Determina la voce.** Una modifica coerente produce **una** voce. `tag` riflette la natura reale (contenuto nuovo → `Nuovo`, revisione di contenuto esistente → `Aggiornato`, rimozione → `Rimosso`). Il `path` deve puntare a una rotta esistente: in caso di dubbio sullo slug (cartelle con `generated-index`, prefissi numerici), verificalo — per esempio cercando la rotta in `.docusaurus/globalData.json` dopo un build, o servendo il sito.
2. **Inserisci in testa.** La nuova voce va all'**inizio** dell'array.
3. **Tronca a dieci.** Dopo l'inserimento il file mantiene al massimo dieci voci; le eccedenti in coda si rimuovono.
4. **Una voce per modifica.** Più pagine con un solo intento → una voce, con il `path` della pagina più rappresentativa. Intenti distinti → voci distinte.

## Vincoli

- Il file resta JSON valido, indentazione a due spazi.
- Registro **impersonale**, come nel resto della guida.
- L'effetto è tracciabile dalla storia git: la modifica al changelog viaggia nello stesso commit della modifica che la motiva.
