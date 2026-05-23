---
sidebar_position: 1
description: Raccolta dei pattern di sviluppo software ricorrenti, con spiegazione del problema che risolvono e dei contesti in cui applicarli.
---

# Pattern di sviluppo

Questa sezione raccoglie i pattern di progettazione (*design pattern*) più rilevanti nello sviluppo quotidiano. Ogni pattern è descritto in modo indipendente dalla tecnologia: si spiega il problema che risolve, la struttura e i criteri per decidere quando applicarlo.

Le implementazioni specifiche per linguaggio o framework si trovano nelle rispettive sezioni sotto [Tecnologie](../tecnologie/index.md).

## Catalogo

| Pattern | Categoria | Problema che risolve |
|---------|-----------|---------------------|
| [Strategy](strategy.md) | Comportamentale | Variare un algoritmo a runtime senza condizionali sparsi nel codice |
| [Factory Method](factory-method.md) | Creazionale | Creare oggetti senza accoppiare il chiamante al tipo concreto |
| [Builder](builder.md) | Creazionale | Costruire passo per passo oggetti complessi, restituendo istanze valide solo al termine |
| [Adapter](adapter.md) | Strutturale | Conciliare un'interfaccia esistente con quella attesa dal consumatore |
| [Decorator](decorator.md) | Strutturale | Aggiungere comportamento componibile senza modificare l'oggetto decorato |
| [Chain of Responsibility](chain-of-responsibility.md) | Comportamentale | Far attraversare una richiesta a una sequenza di handler indipendenti |
| [Command](command.md) | Comportamentale | Reificare un'azione in un oggetto, separando chi la richiede da chi la esegue |
| [Observer / Pub-Sub](observer.md) | Comportamentale | Notificare un numero variabile di consumatori senza che il produttore li conosca |
