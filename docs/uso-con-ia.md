---
sidebar_position: 5
description: Tecniche per integrare questa guida in un progetto come knowledge base per gli agenti IA — sottomodulo git, riferimenti da CLAUDE.md, skill operative, glossario condiviso.
---

# Uso con IA

Questa guida è scritta per essere letta sia da persone sia da agenti IA. Il formato (Markdown, Mermaid, struttura piatta) è grep-abile, versionabile e si presta a essere incluso direttamente nel contesto di un agente.

Non è una documentazione progettuale: descrive un punto di vista sullo sviluppo software. Per usarla in un progetto reale come knowledge base dell'IA, servono alcune tecniche di integrazione.

## Sottomodulo git

Si aggiunge MyDocs al progetto come submodule, **pinnato a un tag preciso**:

```bash
git submodule add https://github.com/cagianx/my-docs.git my-docs
cd my-docs && git checkout v0.1.19 && cd ..
git add . && git commit -m "chore: add my-docs v0.1.19 as submodule"
```

Il submodule offre tre garanzie:

- **Versionato** — il commit del progetto registra esattamente quale revisione di MyDocs è in vigore in quel momento
- **Riproducibile** — chiunque cloni il progetto con `--recurse-submodules` ottiene la stessa documentazione che aveva l'IA quando ha generato il codice
- **Aggiornabile su richiesta** — il bump è un atto esplicito, non una deriva silenziosa

Si evitano alternative come copia manuale, fork senza tracciamento o link a sito esterno: tutte rendono opaca la versione effettiva in uso.

## Riferimenti puntuali da CLAUDE.md

Un link generico a MyDocs è poco utile. L'agente IA va indirizzato alle sezioni rilevanti per il progetto specifico — quelle restanti rimangono disponibili ma non in primo piano.

Esempio per un progetto C# / Entity Framework:

```markdown
# Knowledge base

Questo progetto segue le convenzioni in `my-docs/`. Riferimenti principali:

- Modellazione dominio → `my-docs/docs/regole/dominio.md`
- Entity Framework → `my-docs/docs/regole/entity-framework.md`
- Architettura solution → `my-docs/docs/regole/architettura.md`
- Test → `my-docs/docs/regole/testing.md`
- Git e commit → `my-docs/docs/tecnologie/git/index.md`
- Glossario → `my-docs/docs/glossario.md`

Per cercare altri concetti, partire da `my-docs/docs/indice-analitico.md`.
```

Lo stesso vale per `AGENTS.md` o per i file equivalenti di altri agenti. Un progetto frontend Angular avrà riferimenti diversi rispetto a un'API .NET — il file di configurazione dell'IA è lo strato che adatta MyDocs al contesto.

## Skill operative nel proprio repo

MyDocs include alcune [skill](ia/skills/index.md) — procedure operative come [commit](ia/skills/commit-ia.md) e [release](ia/skills/rilascio-ia.md). La pagina che le descrive è la fonte di verità; la versione **eseguibile** da Claude Code vive in `.claude/skills/<nome>/SKILL.md` e si invoca con `/<nome>`.

Claude Code cerca le skill nel `.claude/skills/` **alla radice del progetto**, non dentro un submodule. Quelle di MyDocs, annidate in `my-docs/.claude/skills/`, non vengono quindi rilevate da sole. Per renderle invocabili nel proprio repo si crea un `SKILL.md` **puntatore sottile** che rimanda alla pagina nel submodule — già pinnata a un tag preciso, quindi fonte di verità versionata.

`.claude/skills/commit/SKILL.md` nel proprio progetto:

```markdown
---
name: commit
description: Crea i commit delle modifiche pendenti raggruppandole nel minor numero di commit Conventional Commits possibile, senza mescolare intenti con peso semver diverso. Usare quando l'utente chiede di committare.
---

# Commit assistito dall'IA

Procedura completa in `my-docs/docs/ia/skills/commit-ia.md` — unica fonte di verità.
Leggi quel file ed esegui ciò che descrive. Non duplicare qui le istruzioni.
```

Tre conseguenze:

- **Versionata col submodule** — la skill segue il tag pinnato di MyDocs: cambiarne il comportamento è un bump esplicito, non una deriva silenziosa.
- **Senza duplicazione** — nel proprio repo restano solo il frontmatter (necessario perché Claude Code attivi `/<nome>` senza aprire la pagina) e il rimando; la procedura vive in MyDocs.
- **Selettiva** — un progetto abilita solo le skill che gli servono, creando il puntatore unicamente per quelle.

Conviene citare le skill disponibili anche nel CLAUDE.md, tra i riferimenti, così l'agente sa che esistono e quando usarle.

## Glossario come ubiquitous language

Il glossario (`my-docs/docs/glossario.md`) definisce i termini tecnici e di dominio. Adottarli nel progetto — nei nomi delle classi, nei commit, nelle PR, nel codice — produce coerenza tra documentazione e implementazione.

L'IA, leggendo gli stessi termini in entrambi i contesti, riconosce i concetti senza ambiguità: `IUseCase`, `Result<T>`, `DbContext`, `feature flag` significano la stessa cosa in MyDocs e nel progetto. Si evitano sinonimi, traduzioni casuali, abbreviazioni private.

Quando il dominio del progetto introduce termini propri, vanno aggiunti al glossario del progetto (non di MyDocs) e referenziati con la stessa disciplina.

## Indice analitico come entry point per le ricerche

Per cercare un concetto in MyDocs, l'IA dovrebbe partire da `my-docs/docs/indice-analitico.md` — non con un grep cieco. L'indice mappa ogni concetto alla pagina dove è trattato per esteso, riducendo i falsi positivi e accelerando la navigazione.

Va istruito esplicitamente nel CLAUDE.md, altrimenti l'agente farà ricerche full-text inefficienti.

## Markdown e Mermaid come formato IA-native

Tutto il contenuto è testo:

- **Markdown** per la prosa e la struttura — diff-abile, grep-abile, leggibile riga per riga
- **Mermaid** per i diagrammi — è codice, non un'immagine

Si evitano: screenshot, PDF, wiki esterne, presentazioni, audio. Tutti formati che l'IA non può leggere o aggiornare nello stesso commit del codice.

Vedi anche [`regole/documentazione`](regole/documentazione.md).

## Aggiornamento del submodule come commit dedicato

Il bump della versione di MyDocs è un atto tracciato, non una modifica accodata:

```bash
cd my-docs && git checkout v0.1.20 && cd ..
git add my-docs
git commit -m "chore(my-docs): bump to v0.1.20"
```

Si evita di mescolare il bump con altre modifiche: se una regola cambia, ce ne si accorge prima che inquini un commit di feature. La review del diff (`git diff` sul submodule) è una buona occasione per allineare il progetto alle eventuali nuove indicazioni.

## Riferimenti nei commit e nelle PR

Quando l'IA applica una regola di MyDocs, citarla nel commit o nella PR rende esplicito il *perché*:

```
feat(ordini): use Result<T> for command outcomes

Vedi my-docs/docs/regole/gestione-errori.md.
```

Per chi legge la storia del progetto, il riferimento è un puntatore al ragionamento — non si rincorrono motivazioni ricostruite a posteriori. Per l'IA, è un esempio in più di come collegare codice e documentazione.
