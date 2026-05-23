---
sidebar_position: 3
description: Factory Method — incapsula la creazione di un oggetto dietro un metodo dedicato, separando chi richiede l'istanza da chi conosce il tipo concreto da costruire.
---

# Factory Method

## Problema

Un componente deve ottenere un'istanza di un tipo che implementa una certa interfaccia, ma non vuole — o non può — conoscere il tipo concreto. Il `new` diretto accoppia il chiamante all'implementazione: cambiare implementazione significa toccare ogni punto di costruzione. La logica di scelta dell'implementazione, se non isolata, finisce duplicata o sparsa in catene di `if`/`switch`.

## Idea centrale

La costruzione di un oggetto è una decisione separata dal suo utilizzo. Il Factory Method incapsula questa decisione in un punto unico, esponendo al chiamante solo l'interfaccia del prodotto.

## I tre attori

### 1. Il prodotto (l'interfaccia)

Il tipo astratto che il chiamante riceve e con cui interagisce. Non rivela quale implementazione concreta è stata costruita.

### 2. La factory (chi costruisce)

Una funzione, un metodo o un oggetto la cui responsabilità è restituire un'istanza del prodotto. Conosce i tipi concreti e le regole di selezione (parametri, configurazione, contesto). Centralizza tutto ciò che riguarda la costruzione: parametri obbligatori, default, validazioni preliminari, eventuali side effect di inizializzazione.

### 3. Il consumatore

Chiama la factory e usa il prodotto restituito attraverso la sua interfaccia. Non sa quale tipo concreto sta usando e non dipende dai dettagli di costruzione.

```text
 ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
 │ Consumatore  │────────▶│   Factory    │────────▶│   Prodotto   │
 └──────────────┘         └──────────────┘         │ (interfaccia)│
                                 │                 └──────────────┘
                                 ▼                         ▲
                         ┌──────────────┐                  │
                         │ ProductImpl  │──────────────────┘
                         └──────────────┘
```

## Differenza rispetto a Strategy

Strategy e Factory Method spesso convivono: la factory è il **selettore** che restituisce la strategy giusta. La distinzione è di responsabilità:

- **Strategy** descrive *come* varia un comportamento.
- **Factory Method** descrive *come* viene scelto e istanziato l'oggetto che incarna quel comportamento.

Una factory può restituire una strategy, ma può anche restituire qualsiasi altro tipo di prodotto (un client HTTP configurato, un parser, un connection wrapper).

## Quando usarlo

- La costruzione richiede logica non banale: lettura di configurazione, scelta tra più implementazioni, applicazione di default, validazioni.
- Si vuole isolare il `new` di un tipo concreto in un unico punto, per poterlo cambiare senza propagare modifiche.
- Si stanno scrivendo test e si vuole sostituire la costruzione reale con un fake controllato.
- Il container DI non è disponibile o non è sufficiente (es. la scelta dipende da dati noti solo a runtime, come il contenuto del payload in arrivo).

## Quando evitarlo

- Esiste una sola implementazione e il costruttore è banale: una factory aggiungerebbe indirezione senza valore.
- Il container DI gestisce già la selezione (es. con keyed services): una factory diventa una replica del meccanismo nativo.
- La factory finisce per esporre tutti i parametri del costruttore: meglio costruire direttamente.

## Varianti comuni

| Variante | Descrizione |
|----------|-------------|
| Factory function | Funzione (o metodo statico) che restituisce un'istanza. È la forma più leggera |
| Factory class | Classe dedicata, registrata nel container DI. Adatta quando la factory ha sue dipendenze |
| Abstract Factory | Una factory che restituisce famiglie di prodotti correlati (es. un set di componenti UI tematici) |
| Parametric factory | La factory accetta un parametro (enum, stringa, payload) e sceglie il prodotto di conseguenza — è il selettore di Strategy |

## Implementazioni specifiche

- [C# — Factory Method con DI e funzioni delegate](../tecnologie/csharp/pattern/factory-method.md)
