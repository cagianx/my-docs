---
sidebar_position: 2
description: Strategy pattern — incapsula una famiglia di algoritmi intercambiabili dietro un'interfaccia comune, permettendo di variare il comportamento a runtime senza modificare il contesto.
---

# Strategy

## Problema

Un componente deve eseguire un'operazione che può avere più varianti (algoritmi, regole di business, canali di comunicazione). L'approccio ingenuo — una catena di `if`/`switch` — produce codice fragile: ogni nuova variante richiede una modifica al componente esistente, violando il principio Open/Closed.

## Soluzione

Si estrae l'operazione variabile in un'interfaccia (*strategy*) e si passa l'implementazione concreta al componente che la utilizza (*context*). Il contesto delega l'esecuzione alla strategy ricevuta senza conoscerne i dettagli.

```text
┌────────────┐         ┌─────────────────┐
│  Context   │────────▶│   IStrategy     │  (interfaccia)
└────────────┘         └─────────────────┘
                              ▲
                ┌─────────────┼─────────────┐
                │             │             │
        ┌───────────┐ ┌───────────┐ ┌───────────┐
        │ StrategyA │ │ StrategyB │ │ StrategyC │
        └───────────┘ └───────────┘ └───────────┘
```

## Struttura

1. **Interfaccia strategy** — definisce il contratto dell'operazione variabile.
2. **Implementazioni concrete** — ciascuna incapsula una variante dell'algoritmo.
3. **Context** — mantiene un riferimento all'interfaccia strategy e delega l'esecuzione.
4. **Punto di selezione** — il luogo in cui si decide quale implementazione usare (configurazione, input utente, DI container).

## Quando usarlo

- Si hanno più varianti di uno stesso comportamento e la scelta dipende da un fattore esterno (configurazione, input, contesto di esecuzione).
- Si vuole rispettare il principio Open/Closed: aggiungere una variante significa aggiungere una classe, non toccare il codice esistente.
- Si vuole rendere le singole varianti testabili in isolamento.

## Quando evitarlo

- Esiste una sola variante e non si prevede che ne servano altre — l'astrazione sarebbe prematura.
- La logica condizionale è banale (due o tre righe) e non merita il costo di un'interfaccia aggiuntiva.

## Varianti comuni

| Variante | Descrizione |
|----------|-------------|
| Selezione a compile-time | La strategy è fissa e iniettata dal container DI |
| Selezione a runtime | La strategy viene scelta dinamicamente in base a un discriminante (enum, stringa, header HTTP) |
| Composizione | Più strategy vengono eseguite in sequenza (chain of responsibility ibrida) |

## Implementazioni specifiche

- [C# — Strategy con `IEnumerable<T>` e Keyed Services](../tecnologie/csharp/pattern/strategy.md)
