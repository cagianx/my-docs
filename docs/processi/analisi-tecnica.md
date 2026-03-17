---
sidebar_position: 1
---

# Analisi Tecnica

L'analisi tecnica traduce l'analisi funzionale in una soluzione implementabile, testabile e manutenibile.
Non decide solo *cosa* costruire, ma *come* costruirlo in modo chiaro per tutto il team.

## Punto di partenza: L'analisi funzionale

Il processo parte dalla comprensione dell'analisi funzionale, identificando con precisione **cosa cambia rispetto all'esistente**.

Per ogni caso d'uso documenta: input/output attesi, regole di business, eccezioni e casi limite.
Segnala i punti ambigui con domande aperte — le assunzioni non dichiarate sono una delle principali fonti di regressione.

## Obiettivo

L'analisi tecnica ha tre obiettivi:

1. Modellare le entità e definire i moduli necessari
2. Individuare le interfacce software coinvolte
3. Definire il percorso ideale con cui affrontare lo sviluppo

## Prerequisito: Caso d'uso realistico

Ogni sviluppo deve essere supportato da un caso d'uso realistico. Prima di procedere con qualsiasi analisi o implementazione è necessario verificare che esista uno scenario concreto che giustifichi il lavoro. Sviluppare funzionalità senza un caso d'uso reale è una fonte di complessità inutile e di codice che nessuno userà.

### Priorità dei casi d'uso

Non tutto ciò che emerge dall'analisi ha la stessa importanza. L'implementazione deve essere guidata dal **caso d'uso principale** — quello più frequente e rappresentativo del valore che il sistema deve offrire.

I casi eccezionali vanno riconosciuti e documentati, ma non devono pilotare le scelte architetturali o di modellazione. Costruire il sistema attorno a uno scenario che accade raramente produce complessità sproporzionata e penalizza il percorso normale.

La regola pratica: **ottimizza per il caso comune, gestisci il caso eccezionale senza che diventi il centro del design.**

## Step 1: Mappare il perimetro dello sviluppo

Identifica i casi d'uso, i modelli di dati e le interfacce software oggetto dello sviluppo.

**Modellazione dei dati** comprende:

- **Schema del database** — la più importante: tabelle, relazioni, constraint, chiavi esterne
- **DTO** — i modelli che le interfacce software usano per comunicare tra loro

Nella modellazione del database ragiona sempre sugli indici:

- Il **clustered index** non va dimenticato: deve supportare il caso d'uso più generico della tabella
- Qualsiasi indice va valutato sulla base di casi d'uso reali — non si aggiungono indici per anticipazione o per abitudine

In questa fase mantieni alta l'attenzione per:

- individuare i sotto-moduli di cui è composto il software coinvolto
- identificare eventuali regressioni che le modifiche potrebbero introdurre

### Cosa individuare

**Pezzi in più** — funzionalità, componenti o flussi completamente nuovi. Richiedono progettazione da zero.

**Modifiche** — cambiamenti a comportamenti o componenti esistenti che non alterano le interfacce pubbliche.

**Breaking changes** — modifiche che rompono la compatibilità con quanto già in uso: cambi di contratto API, rimozione di campi, variazioni nel comportamento atteso. Richiedono coordinamento con i team dipendenti e, dove necessario, una strategia di migrazione.

## Output attesi

Una buona analisi tecnica produce almeno:

1. **Architettura e scelte tecnologiche** — componenti, pattern, alternative scartate e motivazioni
2. **Modello dati** — entità, relazioni, vincoli, stati, indici e strategia di migrazione
3. **Contratti delle interfacce** — API, eventi, integrazioni esterne e regole di versionamento
4. **Flussi principali** — sequenze passo-passo dei percorsi core, incluse eccezioni ed error handling
5. **Requisiti non funzionali** — performance, sicurezza, availability, audit, compliance
6. **Piano di implementazione** — task, dipendenze, rischi e milestone
7. **Test strategy e DoD tecnica** — cosa testare, come testarlo e criteri di accettazione

## Procedura pratica

### 1) Pulire l'analisi funzionale

- Collega ogni caso d'uso a un obiettivo di business
- Completa la matrice: input/output, regole, eccezioni, dati
- Evidenzia ambiguità e apri domande tracciabili con owner e data di validazione

**Done:** i casi d'uso sono comprensibili senza chiarimenti informali.

### 2) Estrarre i requisiti non funzionali

Rendi espliciti i requisiti spesso impliciti: performance (tempi risposta, volumi, picchi), sicurezza (ruoli, permessi, cifratura), tracciabilità/audit, resilienza (retry, idempotenza, fallback), compatibilità, logging e monitoring.

**Done:** ogni NFR ha una metrica verificabile e un responsabile tecnico.

### 3) Definire l'architettura

- Moduli/servizi e confini, canali di comunicazione, distribuzione delle responsabilità
- Documenta motivazioni e trade-off delle scelte in base ai vincoli

**Done:** esiste una vista architetturale con motivazioni.

### 4) Modellare i dati

- Entità, relazioni e cardinalità (ERD), chiavi, indici e vincoli
- Stati e transizioni, storico/audit e soft delete quando richiesto
- Strategia di migrazione e backward compatibility

**Done:** il modello dati supporta i casi d'uso senza incoerenze note.

### 5) Disegnare i contratti

Per ogni endpoint o integrazione: schema request/response, errori, validazioni, autenticazione/autorizzazione, versionamento, idempotenza (obbligatoria per operazioni critiche).

**Done:** i contratti sono consumabili da team esterni senza interpretazioni.

### 6) Dettagliare i flussi critici

Seleziona 3-5 flussi core: chi invoca cosa, transazioni DB, chiamate esterne, gestione errori e compensazioni quando necessario.

**Done:** i flussi critici includono il percorso felice e i fallimenti principali.

### 7) Definire test strategy e DoD tecnica

- Unit test (regole di business), integration test (DB e dipendenze), contract test (API/eventi)
- Performance e sicurezza quando richiesto
- Criteri di accettazione verificabili per ogni requisito tecnico

**Done:** ogni requisito tecnico ha almeno una modalità di verifica.

### 8) Piano di implementazione e rischi

- Breakdown in task, dipendenze, spike per incertezze, stime e milestone
- Rischi con probabilità, impatto e mitigazione

**Done:** il piano è pianificabile in sprint/release senza blocchi nascosti.

## Criteri di qualità

L'analisi è pronta per lo sviluppo se un developer esterno al team può:

- capire cosa costruire senza chiedere chiarimenti continui
- sapere dove mettere il codice (moduli e responsabilità)
- conoscere modello dati e contratti da rispettare
- sapere come testare e cosa monitorare in produzione

## Handoff allo sviluppo

- Collega task e milestone al processo in `docs/processi/sviluppo.md`
- Verifica che non ci siano breaking changes non gestite
- Allinea i criteri di accettazione tecnici con la Definition of Done di team

Un buon handoff riduce tempi morti, rework e regressioni evitabili.

---

## FAQ

**Chi fa l'analisi tecnica?**

Dipende dalle competenze disponibili. Le modifiche al dominio richiedono sempre l'approvazione di qualcuno che sia sia esperto del dominio sia tecnicamente competente — può coincidere con lo sviluppatore, oppure essere un'altra figura o più persone che partecipano alla revisione. Stesso discorso per scelte architetturali o introduzione di librerie esterne: serve un parere tecnico qualificato. L'indipendenza è preferibile dove possibile, ma non è mai totale: il livello di coinvolgimento dipende da cosa si sta toccando e da chi ha le competenze per valutarlo.

**Il documento deve seguire un template preciso?**

L'importante è che sia esaustivo nei contenuti. La forma è un nice-to-have: l'IA può migliorare la struttura, aggiungere diagrammi Mermaid, rendere il documento più leggibile — il punto critico è che il pensiero ci sia. Un documento grezzo ma completo vale infinitamente più di uno ben formattato ma superficiale.

Per task piccoli può sembrare eccessivo produrre documentazione formale — a volte c'è più analisi che codice. Va bene così: l'obiettivo è pensare prima di agire, non riempire pagine. Che poi si lasci traccia scritta è una scelta del team, ma la tradizione scritta è sempre preferibile al silenzio.

**L'analisi tecnica si fa sempre?**

No. Si fa per sviluppi rilevanti:

- modifiche al modello dati — qualsiasi cambiamento allo schema del database
- modifiche alle feature — qualsiasi aggiunta o variazione al comportamento esistente
- modifiche infrastrutturali — ambienti, pipeline, dipendenze esterne

Non richiede analisi tecnica: bug fix, correzioni di testo, refactoring interno che non altera comportamento né interfacce.

**Se l'analisi rivela una complessità inattesa, chi decide come procedere?**

È una questione di organizzazione interna del team: ridurre lo scope, tornare dall'analista funzionale o procedere comunque sono decisioni che dipendono dal contesto, dalle priorità e da chi ha la responsabilità del prodotto. L'analisi tecnica ha il compito di rendere visibile la complessità — la decisione su cosa farne spetta al team.

**Le stime dei tempi fanno parte dell'analisi tecnica?**

Sì, ma vanno fatte per componente separato, non come stima unica. La suddivisione naturale è:

- **dominio e modellazione** — entity, migration, regole di business
- **business logic** — casi d'uso e test di integrazione inclusi
- **UI** — interfaccia utente
- **sviluppi trasversali** — infrastruttura, configurazione, pipeline

Tenerle separate permette a business logic e UI di procedere in parallelo nello stesso sprint, una volta che il dominio è stabile. Una stima aggregata nasconde queste dipendenze e rende impossibile pianificare il parallelismo.

**Come si gestiscono i breaking change verso i team dipendenti?**

Vanno portati all'attenzione di tutti il prima possibile — non alla fine, non al deploy. Non sono necessariamente una cattiva notizia: rimuovere una colonna deprecata da mesi è un breaking change atteso e pianificato. L'importante è che nessuno ne venga sorpreso. Il versioning farà il resto: un breaking change si traduce in un bump `MAJOR` che rende il cambiamento ufficiale e tracciabile. Vedi [`regole/versionamento`](../regole/versionamento.md).

**L'analisi viene presentata formalmente al team?**

Vivendo nel repository è già condivisa per definizione — chiunque può leggerla in qualsiasi momento. La condivisione attiva del know-how è una questione di organizzazione del team, non di processo formale.

C'è però una conseguenza meno ovvia: l'IA che assiste lo sviluppo legge la documentazione preesistente. A parità di strumento e configurazione, tutta la conoscenza accumulata nelle analisi tecniche è già disponibile a ogni membro del team semplicemente lavorando nello stesso contesto. La documentazione non è solo memoria storica — è contesto attivo.

**Se durante lo sviluppo emergono cose non previste, si aggiorna l'analisi?**

Vale il buon senso: si valuta l'impatto. Una piccola deviazione non richiede di riscrivere tutto; una scoperta che cambia il modello o le interfacce merita un aggiornamento. L'IA abbassa il costo di questo lavoro — dato il documento esistente e le modifiche emerse, aggiornarlo è questione di minuti.