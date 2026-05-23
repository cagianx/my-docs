---
sidebar_position: 6
description: Decorator — aggiunge comportamento a un oggetto avvolgendolo in un altro che condivide la stessa interfaccia, permettendo di comporre funzionalità trasversali senza modificare l'oggetto originale.
---

# Decorator

## Problema

Un componente esegue una certa operazione. Servono in più: logging delle chiamate, cache del risultato, retry su errore transitorio, autorizzazione, raccolta di metriche, audit. Mettere tutto dentro il componente originale lo trasforma in un calderone di responsabilità incrociate, viola Single Responsibility e rende impossibile riusare quei comportamenti altrove.

## Idea centrale

Le funzionalità trasversali si possono incapsulare in **wrapper** che implementano la stessa interfaccia del componente decorato. Ogni wrapper aggiunge il proprio comportamento prima o dopo aver delegato al successivo. Il consumatore non si accorge della differenza: vede sempre la stessa interfaccia.

## I tre attori

### 1. L'interfaccia comune

Sia il componente reale sia ciascun decorator la implementano. È ciò che permette di sostituire l'uno con l'altro in modo trasparente.

### 2. Il componente decorato

L'implementazione "vera": quella che fa effettivamente il lavoro di dominio. I decorator avvolgono questo oggetto senza modificarlo.

### 3. I decorator

Ricevono in costruttore un'istanza dell'interfaccia (che può essere il componente o un altro decorator). Per ogni chiamata aggiungono il proprio comportamento e poi delegano. Sono componibili in catena.

```text
 ┌──────────────┐        ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
 │ Consumatore  │───────▶│  LoggingDec  │───────▶│  CachingDec  │───────▶│  RealService │
 └──────────────┘        └──────────────┘        └──────────────┘        └──────────────┘
                          implementa              implementa              implementa
                          IService                IService                IService
```

Il consumatore inietta `IService` e riceve la catena. Ogni nuovo decorator si aggiunge senza toccare gli altri.

## Quando usarlo

- Servono comportamenti **trasversali** (logging, cache, retry, autorizzazione, metriche) applicati a più componenti che condividono un'interfaccia.
- Si vuole **comporre** le funzionalità: certi consumatori vogliono logging+cache, altri solo logging.
- Si vuole rispettare Open/Closed: aggiungere un comportamento significa aggiungere una classe.
- Si vuole testare il dominio senza i comportamenti accessori: basta iniettare il componente nudo.

## Quando evitarlo

- Il comportamento è specifico di un solo componente: una classe con un metodo in più è più diretta.
- Esiste un meccanismo dedicato del framework (middleware HTTP, filter MVC, interceptor): meglio usarlo dove è pertinente.
- La catena diventa profonda e l'ordine dei decorator nasconde la logica reale: a un certo punto è meglio un componente esplicito.

## Decorator vs altri pattern

| Pattern | Cosa fa |
|---------|---------|
| **Decorator** | Aggiunge comportamento mantenendo l'interfaccia. Componibile |
| **Adapter** | Cambia interfaccia. Non aggiunge comportamento |
| **Proxy** | Controlla l'accesso (lazy, remote, security). Strutturalmente simile, intento diverso |
| **Middleware** | Decorator applicato a una pipeline di request/response |

## Composizione

L'ordine in cui si compongono i decorator conta. *Logging* fuori da *retry* registra ogni tentativo; *retry* fuori da *logging* registra solo l'esito finale. La scelta dipende da cosa si vuole osservare e da quali side effect si vogliono ripetere.

Il container DI è il punto naturale dove decidere la composizione: si configura la catena una volta, e il consumatore riceve l'istanza completa.

## Implementazioni specifiche

- [C# — Decorator con DI nativa e con Scrutor](../tecnologie/csharp/pattern/decorator.md)
