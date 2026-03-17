---
slug: /
sidebar_position: 1
---

# Dev Bible

Una raccolta di principi, regole e processi sullo sviluppo software. Non descrive un progetto specifico né le convenzioni di un team particolare — descrive un punto di vista su come si scrive software manutenibile, testabile e comprensibile nel tempo.

È un punto di vista parziale e opinabile, come qualsiasi approccio allo sviluppo. Ma è coerente: ogni regola deriva da principi espliciti, ogni processo ha una motivazione dichiarata.

La documentazione vive nel repository perché non esiste documentazione utile che sia separata dal codice. Quando il codice cambia, la documentazione cambia con lui — nello stesso commit, con la stessa storia. L'IA legge entrambi e li tiene sincronizzati.

## Come è organizzata

**[Regole](regole/principi.md)** — principi e vincoli permanenti. Cambiano raramente e hanno impatto trasversale: dominio, architettura, testing, git, logging, autenticazione, configurazione. Sono il *perché* dietro le scelte tecniche.

**[Processi](processi/analisi-tecnica/index.md)** — come si lavora. Dall'analisi tecnica allo sviluppo, dalla pipeline CI/CD al rilascio. Descrivono il flusso di lavoro e possono evolversi nel tempo.

**[Glossario](glossario.md)** — i termini tecnici e di dominio usati nella documentazione e nel codice.

## Da dove iniziare

Per capire la filosofia di fondo: [Principi](regole/principi.md).

Per iniziare uno sviluppo: [Analisi Tecnica](processi/analisi-tecnica/index.md) → [Sviluppo](processi/sviluppo/index.md).