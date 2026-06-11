# Product

## Register

product

## Users

Due lettori alla pari, serviti dallo stesso testo senza che nessuno dei due sia sacrificato:

- **Sviluppatori (umani)** che consultano la guida per convincersi di una pratica e adottarla. Sono in mezzo a un problema reale (modellare un dominio, scegliere un indice, impostare il workflow git) e cercano la posizione argomentata, non un tutorial passo-passo. Vogliono leggibilità, esempi concreti (C# / Entity Framework / ASP.NET Core, database relazionali), e la possibilità di saltare al punto.
- **Agenti IA** che integrano la guida come knowledge base in un progetto reale (sottomodulo git, stesso contesto degli strumenti IA). Hanno bisogno di struttura prevedibile, glossario condiviso, indice analitico e riferimenti puntuali per ancorare le citazioni.

Il contesto d'uso è la consultazione mirata: si arriva da una ricerca, da un link puntuale o dalla sidebar, non da una lettura lineare dall'inizio. Il job-to-be-done è «trovare la posizione su X e capire perché, in fretta».

## Product Purpose

Una raccolta di regole, principi e processi per scrivere software mantenibile. Non è la documentazione di un team né legata a un progetto specifico: descrive **una posizione argomentata** sullo sviluppo software — opinionata, coerente, radicata in pratiche consolidate — più o meno condivisibile, indipendente da chi la legge.

La documentazione vive nel repository accanto al codice: stessa storia git, stesso contesto per gli strumenti IA, così non invecchia separata dal codice che descrive. Il successo è duplice: uno sviluppatore trova la risposta e la motivazione in pochi secondi; un agente IA la ingerisce come contesto affidabile e cita il punto giusto.

## Brand Personality

Voce **impersonale e asciutta**: non «facciamo / usiamo / il nostro team», ma «si fa / si usa / è preferibile». Italiano corretto e curato; inglesismi solo come microlingua tecnica consolidata (commit, deploy, staging, trunk, feature flag). Niente registro da blog, niente tono motivazionale, niente concessioni al lettore generico.

Tre parole: **opinionata, rigorosa, terminale**. L'estetica — terminale/brutalista, monospace, nero e arancione, bordi netti, niente raggi, griglia di sfondo, status-bar simulata — non è decorazione: è la stessa stringenza del contenuto resa visibile. Emotivamente deve trasmettere *competenza senza fronzoli*: la fiducia che dà uno strumento costruito da chi sa cosa sta facendo, non la rassicurazione di un prodotto che cerca di piacere.

## Anti-references

- **Docs corporate generico.** Niente look «enterprise SaaS docs» neutro e intercambiabile: sidebar grigia anonima, blu aziendale, tono impersonale-marketing. Il sito non deve poter essere scambiato per la documentazione di un vendor qualsiasi.
- **Tutorial / blog dal tono leggero.** Niente registro informale, emoji, «noi del team», hero motivazionali, call-to-action da landing commerciale. Resta impersonale e secco.
- **Brutalismo costume / illeggibile.** L'estetica terminale non deve degradare in posa: contrasto e leggibilità del corpo testo vincono sempre sull'effetto. Il monospace e i bordi netti servono la chiarezza, non la posano.
- **Slop generato da IA.** Niente eyebrow tracked maiuscolo su ogni sezione come grammatica automatica, gradient text, griglie di card identiche ripetute, template hero-metric, side-stripe borders decorativi.

## Design Principles

1. **La leggibilità batte l'effetto.** L'identità brutalista è forte, ma ogni scelta passa il test del contrasto (corpo ≥ 4.5:1) e della leggibilità. Un'estetica che ostacola la lettura ha fallito, per quanto «di carattere» sia.
2. **Consistenza dentro un vocabolario committed.** Il linguaggio visivo — monospace, nero/arancione, niente raggi, marker ASCII, griglia — è già scelto e va difeso, non reinventato a ogni pagina. La coerenza schermata-su-schermata è la virtù; la sorpresa è riservata a momenti, non sparsa.
3. **Una sola forma consigliata.** Per ogni cosa si indica una via preferita, senza disperdersi tra alternative equivalenti. Vale per il contenuto e vale per l'interfaccia: meno ambiguità, più decisione.
4. **Servire due lettori senza sacrificarne uno.** Struttura, glossario e indice analitico tengono il testo ingeribile da un agente IA; tono e leggibilità lo tengono utile a un umano. Ogni modifica rispetta entrambi i vincoli.
5. **La documentazione non invecchia.** Vive nel repo, accanto al codice, versionata (SemVer, tag tracciabili). Indice e glossario si aggiornano insieme al contenuto, non dopo.

## Accessibility & Inclusion

- **Target WCAG 2.1 AA.** Corpo testo ≥ 4.5:1 sul proprio sfondo, testo grande ≥ 3:1. Particolare attenzione sul tema scuro (sfondo `#0a0a0a`): il grigio secondario `#8a8a82` va verificato e, dove serve per testo di lettura, spinto verso l'ink. L'arancione `#ff6a1a` come accento, non come unico veicolo di significato.
- **Dark-mode-first**: il tema «tech» gira nel dark. Mantenere comunque un percorso chiaro accessibile dove Docusaurus lo prevede.
- **Reduced motion non opzionale.** Le poche animazioni (cursore lampeggiante nell'hero, nudge dell'arrow nelle card) devono avere un'alternativa sotto `@media (prefers-reduced-motion: reduce)`: ferme o crossfade istantaneo, mai bloccanti.
- **Non affidare informazione al solo colore.** Stati attivi/selezione usano anche marker (◆ / ▸▾), bordi o peso, non solo l'arancione — utile anche per daltonismo.
- **Navigazione da tastiera e focus visibili** su link, bottoni, voci di sidebar e ricerca: il focus non deve sparire dietro l'estetica «senza fronzoli».
