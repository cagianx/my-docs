---
sidebar_position: 1
---

# Analisi Tecnica

## Punto di partenza: l'analisi funzionale

Il processo di analisi tecnica parte dalla comprensione dell'analisi funzionale, identificando con precisione cosa cambia rispetto all'esistente.

## Obiettivo

L'analisi tecnica ha tre obiettivi:

1. **Modellare le entità** e definire i moduli necessari
2. **Individuare le interfacce software** coinvolte
3. **Definire il percorso ideale** con cui affrontare lo sviluppo

## Prerequisito: caso d'uso realistico

Ogni sviluppo deve essere supportato da un caso d'uso realistico. Prima di procedere con qualsiasi analisi o implementazione è necessario verificare che esista uno scenario concreto che giustifichi il lavoro. Sviluppare funzionalità senza un caso d'uso reale è una fonte di complessità inutile e di codice che nessuno userà.

## Step 1: mappare il perimetro dello sviluppo

Il primo step è identificare i **casi d'uso**, i **modelli di dati** e le **interfacce software** che saranno oggetto dello sviluppo.

Per modellazione dei dati si intende:

- **Schema del database** — la più importante: tabelle, relazioni, constraint, chiavi esterne
- **DTO (Data Transfer Object)** — i modelli che le interfacce software usano per comunicare tra loro

Nella modellazione del database è fondamentale ragionare sugli **indici prestazionali**:

- Il **clustered index** non va dimenticato: deve supportare il caso d'uso più generico della tabella
- La creazione di qualsiasi indice va valutata sempre sulla base di **casi d'uso reali** — non si aggiungono indici per anticipazione o per abitudine

In questa fase è importante mantenere alta l'attenzione per:

- individuare i **sotto-moduli** di cui è composto il software coinvolto
- identificare eventuali **regressioni** che le modifiche potrebbero introdurre

## Cosa individuare

### Pezzi in più (nuove funzionalità)
Funzionalità, componenti o flussi completamente nuovi che non esistono nel sistema attuale. Richiedono progettazione da zero.

### Modifiche
Cambiamenti a comportamenti o componenti esistenti che non alterano le interfacce pubbliche. Il sistema continua a funzionare per chi lo usa, ma internamente qualcosa cambia.

### Breaking changes
Modifiche che rompono la compatibilità con quanto già in uso: cambi di contratto API, rimozione di campi, variazioni nel comportamento atteso. Richiedono coordinamento con i team o sistemi dipendenti e, dove necessario, una strategia di migrazione.
