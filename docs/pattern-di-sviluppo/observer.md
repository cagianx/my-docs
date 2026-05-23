---
sidebar_position: 9
description: Observer / Pub-Sub — notifica un numero variabile di consumatori al verificarsi di un evento, senza che il produttore conosca chi ascolta.
---

# Observer / Pub-Sub

## Problema

Quando qualcosa accade in un componente — un ordine viene creato, un pagamento conferma, una soglia viene superata — altri componenti devono reagire: inviare un'email, aggiornare un indice di ricerca, scrivere un log di audit, invalidare una cache. Chiamare direttamente ciascun consumatore dal punto di origine accoppia il produttore a tutti i destinatari: aggiungere un consumatore significa modificare il produttore, e ogni reazione finisce mescolata con la logica principale.

## Idea centrale

Il produttore **annuncia** che è successo qualcosa. Non sa chi ascolta. I consumatori si **iscrivono** all'annuncio e reagiscono in modo indipendente. L'aggiunta di un nuovo consumatore non tocca il produttore.

## I tre attori

### 1. L'evento (cosa è successo)

Un dato immutabile che descrive il fatto. Contiene tutte le informazioni necessarie ai consumatori per agire senza dover risalire al produttore. È nominato al passato — *PaymentConfirmed*, *OrderShipped* — perché descrive un fatto già avvenuto.

### 2. Il produttore (il publisher)

Il componente nel cui dominio l'evento ha origine. Pubblica l'evento attraverso un canale (in-process o esterno) e prosegue. Non aspetta i consumatori, non sa quanti sono, non sa se hanno avuto successo (a meno che non si voglia esplicitamente la conferma — ma allora non è più Pub-Sub puro).

### 3. I consumatori (i subscriber)

Ciascuno si registra per ricevere uno o più tipi di evento e implementa la propria reazione. Sono indipendenti l'uno dall'altro: un errore in uno non blocca gli altri.

```text
                                   ┌──────────────┐
                                   │ ConsumatoreA │
                                   └──────────────┘
                                          ▲
 ┌──────────┐    evento     ┌──────────┐  │
 │Produttore│──────────────▶│ Canale   │──┼──▶ ConsumatoreB
 └──────────┘               └──────────┘  │
                                          ▼
                                   ┌──────────────┐
                                   │ ConsumatoreC │
                                   └──────────────┘
```

## In-process vs cross-process

Il pattern si applica a due scenari distinti, con implicazioni molto diverse:

| Aspetto | In-process (Observer) | Cross-process (Pub-Sub) |
|---|---|---|
| Canale | Memoria, eventi del linguaggio, mediator interno | Broker (RabbitMQ, Kafka, Azure Service Bus) |
| Consegna | Sincrona o `Task` in coda | Asincrona, *at-least-once*, può duplicare |
| Affidabilità | Limitata al processo | Persistente, sopravvive ai riavvii |
| Ordinamento | Naturale | Garantito solo per partizione/coda |
| Errori | Si propagano nel processo | Vanno gestiti con retry, dead letter, idempotenza |

Si parla di *observer* tipicamente per il caso in-process e di *pub-sub* per quello distribuito, ma il pattern concettuale è lo stesso.

## Quando usarlo

- L'evento ha più reazioni indipendenti, e si prevede che il numero possa crescere.
- Le reazioni sono **trasversali** rispetto al dominio del produttore (notifiche, indicizzazione, audit, integrazioni).
- Si vuole disaccoppiare componenti che oggi sono nello stesso processo ma domani potrebbero non esserlo.
- Si vuole un'estensibilità "plug-in": chi sviluppa una nuova feature aggiunge un consumatore, nessuno tocca il produttore.

## Quando evitarlo

- C'è un solo consumatore e tale resterà: una chiamata diretta è più semplice e più leggibile.
- La logica chiamante ha bisogno dell'esito dei consumatori per proseguire: Pub-Sub puro non lo fornisce. Serve una sincronizzazione esplicita, e tanto vale chiamare direttamente.
- Le "reazioni" sono in realtà passi successivi del flusso principale: in quel caso non sono eventi, sono command in sequenza.

## Effetti collaterali da considerare

L'asincronia introduce nuove categorie di problemi che vanno affrontati esplicitamente:

- **Idempotenza**: il consumatore può ricevere lo stesso evento più volte. Le sue reazioni devono essere ripetibili senza danno.
- **Ordinamento**: due eventi correlati possono arrivare in ordine inverso. Il consumatore non deve dipendere dall'ordine, oppure deve gestirlo esplicitamente.
- **Errori**: un consumatore fallito non blocca gli altri, ma il fallimento deve essere visibile (dead letter, alert, metriche), non silenzioso.
- **Versioning dell'evento**: l'evento è un contratto. Aggiungere campi è retrocompatibile; rimuoverli o cambiarne il significato no.

## Implementazioni specifiche

- [C# — Eventi nativi, MediatR notifications, MassTransit](../tecnologie/csharp/pattern/observer.md)
