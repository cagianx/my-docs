---
sidebar_position: 3
---

# Step 3 — Modellazione dei Dati

La modellazione dei dati è lo step più importante dell'analisi tecnica. Un errore qui si propaga in ogni strato del sistema e diventa costoso da correggere. Un modello corretto rende tutto il resto più semplice.

Si modella in due livelli: lo schema del database e i DTO che circolano tra i moduli.

## Principio: dati duttili in fase di lettura

La progettazione del database deve **eliminare i problemi all'origine**. Un modello ben fatto risolve intere categorie di problemi prima che si presentino:

- **Leggibilità immediata** — i dati sono fruibili senza elaborazioni; chi legge non deve interpretare, convertire o dedurre
- **Rigore in scrittura** — lo schema rende difficile, preferibilmente impossibile, inserire dati nella forma sbagliata; il database ha per primo gli strumenti di difesa (constraint, tipi, chiavi esterne)
- **Auto-documentazione** — la struttura del modello comunica il dominio; nomi chiari, relazioni esplicite, tipi precisi
- **Zero ambiguità** — ogni campo si capisce subito: cosa contiene, come funziona, quali valori ammette. Gli sviluppatori non perdono tempo a fare reverse engineering del modello

Questo si traduce in un principio operativo: **spostare la fatica in fase di inserimento** — dove avviene una sola volta — piuttosto che in fase di lettura, dove il costo si moltiplica per ogni query e ogni consumatore. L'ambiguità nei dati e la necessità di logica interpretativa sono problemi da risolvere alla radice in modellazione, non sintomi da tollerare in applicazione.

**Corollario: le scelte di modellazione sono scelte a lungo termine.** Il database si modifica solo in aggiunta, deprecando ciò che è obsoleto — non si rinomina, non si rimuove alla leggera. Questo rende ogni decisione strutturale costosa da correggere. Per limitare l'entropia, **ogni elemento del database deve essere supportato da un caso d'uso reale**: ogni tabella, ogni colonna, ogni relazione, ogni indice. Se non c'è un caso d'uso concreto che lo giustifica, non esiste. Colonne "che potrebbero servire", relazioni speculative, campi generici "per il futuro" sono debito strutturale mascherato da previdenza. Va mantenuto tutto in ordine: le immondizie si buttano, non si accumulano nel modello.

:::tip[Regola di conversazione]

Alla domanda *"a cosa serve questo?"* riferita a un qualsiasi elemento del modello, la risposta deve essere *"a supporto del caso d'uso X, Y, Z"*. Se non si riesce a dare questa risposta, l'elemento non dovrebbe esistere.

:::

**Corollario: i dati sul database sono sempre corretti.** Si presuppone che ogni dato persistito sia valido e coerente. Questo elimina il codice difensivo in lettura — nessun check nullo "per sicurezza", nessuna validazione ridondante, nessuna logica di fallback su dati che non dovrebbero esistere. La scrittura è il gate: deve essere **ipercontrollata**, con ogni validazione e constraint necessari a garantire che ciò che arriva sul database sia già corretto. Scrittura difficile, lettura facile.

**Conseguenze pratiche:**
- Un dato ambiguo o malformato in inserimento costa poco correggerlo una volta; costa molto ripeterne l'interpretazione migliaia di volte
- Le constraint strutturali (not null, unique, check) sono preferibili alla validazione applicativa
- I tipi di dato devono riflettere il dominio con precisione: se un valore può essere solo A, B, C, meglio un enum che una stringa libera
- Se serve elaborazione preliminare (es. normalizzazione, parsing), preferibilmente la fa chi inserisce, non chi legge
- Il codice di lettura non contiene validazioni difensive sui dati: se il dato è sul database, è corretto per definizione

:::tip[Evitare combinazioni inconsistenti]

Due campi che rappresentano la stessa informazione creano stati impossibili da gestire. Esempio con il soft delete:

| | `Deleted` | `DeletedDate` | Coerente? |
|---|---|---|---|
| ❌ | `true` | `null` | No — cancellato ma senza data |
| ❌ | `false` | `2024-01-15` | No — non cancellato ma con data |
| ❌ | `true` | `2024-01-15` | Ridondante — servono due campi per dire la stessa cosa |

La soluzione è un solo campo: `DeletedAt: null | Date`. Se è `null` non è cancellato, se ha una data lo è. Un campo, zero ambiguità.

:::

## Schema del database

Lo schema è la fonte di verità del dominio. Si definisce in termini di:

- **Entità e relazioni** — tabelle, chiavi esterne, cardinalità
- **Constraint** — not null, unique, check constraint. L'integrità si garantisce a livello strutturale, non applicativo
- **Stati e transizioni** — se un'entità ha un ciclo di vita, si modellano gli stati ammessi e le transizioni valide
- **Storico e audit** — se serve tracciabilità, si progetta da subito: aggiungere audit in seguito è costoso
- **[Soft delete](../../glossario#soft-delete)** — se le entità non si cancellano fisicamente, si introduce `DeletedAt` fin dall'inizio

### Indici

Gli indici non si aggiungono per abitudine o anticipazione — si ragiona su [casi d'uso](../../glossario#caso-duso) reali.

Il **[clustered index](../../glossario#clustered-index)** non va dimenticato: deve supportare il caso d'uso più generico della tabella, tipicamente la ricerca per chiave primaria. In PostgreSQL corrisponde all'ordinamento fisico implicito per `id`.

Ogni indice aggiuntivo va giustificato da una query concreta: quale caso d'uso lo richiede, con quali volumi attesi.

### Retrocompatibilità

Il database viene aggiornato prima del software in produzione. Ogni modifica deve essere retrocompatibile con il software attualmente in esecuzione. Questo significa:

- si aggiunge, non si rinomina
- si aggiunge, non si rimuove (si depreca)
- le nuove colonne hanno un default o sono nullable

Quando la retrocompatibilità non è possibile, si tratta di un [breaking change](../../glossario#breaking-change) esplicito con strategia di [migrazione](../../glossario#migration). Vedi [`regole/entity-framework`](../../regole/entity-framework.md).

## [DTO](../../glossario#dto)

I [DTO](../../glossario#dto) sono i modelli che i moduli usano per comunicare tra loro — request, response, eventi. Si definiscono in questa fase perché derivano direttamente dal modello dati e dai contratti che si disegneranno nello step successivo.

Un DTO non è mai una copia 1:1 dell'entità del database: espone solo ciò che serve al chiamante, con i nomi che appartengono all'[Ubiquitous Language](../../glossario#ubiquitous-language).

## Criterio di completamento

Il modello dati supporta tutti i casi d'uso identificati senza incoerenze note. Gli indici sono giustificati da query reali. La strategia di [migrazione](../../glossario#migration) è definita.

---

**Prossimo step:** [Step 4 — Contratti](04-contratti.md)
