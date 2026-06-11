---
sidebar_position: 5
description: Adapter — concilia un'interfaccia esistente con quella attesa dal consumatore, isolando il codice di dominio dai dettagli di librerie e sistemi esterni.
---

# Adapter

## Problema

Il codice di dominio ha un'interfaccia attesa — espressa nei termini del problema da risolvere. Esiste già una libreria, un client, un servizio che fa quello che serve, ma la sua interfaccia è diversa: nomi differenti, tipi differenti, eccezioni differenti, modello di errore differente. Usare la libreria direttamente significa farne entrare il vocabolario in ogni punto del dominio che la richiama.

## Idea centrale

Si introduce un livello intermedio — l'*adapter* — che parla la lingua del dominio verso l'interno e la lingua della libreria verso l'esterno. Il dominio dipende da un'astrazione che ha definito lui stesso, non da quella di chi gli sta dall'altro lato.

## I tre attori

### 1. L'interfaccia attesa (il target)

Definita dal dominio, esprime cosa serve in termini propri. È stabile: non cambia se cambia la libreria sotto.

### 2. L'adattato (l'adaptee)

Il componente esistente — libreria, client SDK, vecchio modulo — con un'interfaccia diversa da quella attesa. Non si modifica.

### 3. L'adapter

Implementa l'interfaccia attesa, riceve in costruttore l'adattato e traduce ogni chiamata: nomi, tipi, modello d'errore, semantica.

```mermaid
graph LR
    Dominio["Dominio (Core)"] -- ITarget --> Adapter["Adapter<br/>(implementa ITarget)"]
    Adapter -- IAdaptee --> Libreria["Libreria esterna"]
```

## Quando usarlo

- Si integra una libreria esterna, un client SDK o un servizio terzo che si vuole tenere fuori dal core.
- L'interfaccia esistente è inadeguata al dominio: nomi tecnici, modello d'errore basato su eccezioni di libreria, tipi che leakano dettagli implementativi.
- Si prevede di poter sostituire l'adattato in futuro (cambio provider, swap di libreria).
- Si vuole un unico punto in cui mockare l'integrazione nei test del dominio.

## Quando evitarlo

- L'interfaccia della libreria coincide già con quanto serve, ed è probabile che resti tale. Aggiungere un adapter sarebbe puro boilerplate.
- L'adapter si limita a inoltrare ogni chiamata 1:1: in quel caso non sta adattando nulla, è solo un wrapper passivo. Vale la pena solo se serve come *seam* per i test.

## Adapter e confini

L'adapter è il modo concreto in cui si tiene una libreria *confinata*: il dominio dipende dall'interfaccia, l'adapter è l'unico tipo che conosce la libreria. Cambiare libreria significa scrivere un nuovo adapter, non toccare il dominio.

Vale anche al contrario: se si pubblica una libreria, si pubblica l'interfaccia attesa, e ogni cliente è libero di implementarla a modo suo.

## Varianti comuni

| Variante | Descrizione |
|----------|-------------|
| Object adapter | L'adapter compone l'adattato (ne riceve un'istanza). È la forma più comune e flessibile |
| Class adapter | L'adapter eredita dall'adattato. Vincolato all'ereditarietà singola e meno flessibile, raramente preferibile |
| Two-way adapter | Implementa entrambe le interfacce, utile in scenari di transizione tra due API |
| Anti-corruption layer | Adapter applicato a livello di sotto-sistema: traduce un intero modello esterno nel proprio. Concetto chiave del DDD |

## Implementazioni specifiche

- [C# — Adapter per librerie esterne e progetti di integrazione](../tecnologie/csharp/pattern/adapter.md)
