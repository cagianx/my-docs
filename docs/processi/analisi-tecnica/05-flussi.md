---
sidebar_position: 5
---

# Step 5 — Flussi Critici

I flussi traducono i [casi d'uso](../../glossario#caso-duso) in sequenze concrete: chi chiama chi, in quale ordine, con quali dati, cosa succede quando qualcosa va storto. Rendono visibile la complessità nascosta prima che diventi un problema in produzione.

## Quanti flussi dettagliare

Non si dettagliano tutti i flussi — si selezionano i 3-5 più critici. Il criterio di selezione è l'**impatto**: quanti danni crea al cliente un errore in quel flusso, e quanto costa sistemarlo. I flussi dove un bug produce dati corrotti, operazioni duplicate o perdita di denaro hanno la priorità.

I flussi banali non richiedono diagrammi. Un flusso merita attenzione quando:
- coinvolge più moduli o servizi esterni
- include una transazione database su più tabelle
- ha effetti collaterali difficili da annullare
- gestisce casi d'errore non ovvi

## Cosa includere in ogni flusso

**Percorso felice** — la sequenza nominale dall'input all'output atteso, passo per passo.

**Transazioni** — dove inizia e finisce ogni transazione database. Cosa succede se `SaveChanges()` fallisce a metà del flusso.

**Chiamate esterne** — se il flusso dipende da servizi esterni, cosa succede se non rispondono. Si gestisce con retry, fallback o si propaga l'errore?

**Gestione degli errori** — ogni punto di fallimento possibile e la risposta del sistema. Si usa il [Result pattern](../../glossario#result-pattern) per propagare gli errori in modo esplicito. Vedi [`regole/gestione-errori`](../../regole/gestione-errori.md).

**Compensazioni** — se un'operazione parzialmente completata deve essere annullata, come avviene? Chi ne è responsabile?

:::tip[Transazionalità con sistemi esterni]

Quando un flusso coinvolge sistemi esterni, la transazione database non basta. L'importante è sapere cosa succede quando va male, senza lasciare nel database mezze elaborazioni. La soluzione più semplice è una **coda con retry automatici**. I sistemi esterni si rompono — a differenza del database, non ci si aspetta che siano always-on — e la strategia di gestione va progettata esplicitamente.

:::

## Formato

I flussi si esprimono come diagrammi di sequenza Mermaid — sono leggibili, versionabili e modificabili dall'IA:

```mermaid
sequenceDiagram
    participant Client
    participant Api
    participant ConfermaOrdine
    participant GestoreScorte
    participant DB

    Client->>Api: POST /ordini/{id}/conferma
    Api->>ConfermaOrdine: ExecuteAsync(command)
    ConfermaOrdine->>DB: SELECT Ordine
    ConfermaOrdine->>ConfermaOrdine: ordine.Conferma()
    ConfermaOrdine->>GestoreScorte: ScalaAsync(prodottoId, qty)
    GestoreScorte->>DB: UPDATE Prodotto
    ConfermaOrdine->>DB: SaveChanges()
    ConfermaOrdine-->>Api: Result.Ok()
    Api-->>Client: 200 OK
```

## Criterio di completamento

I flussi critici includono il percorso felice e i fallimenti principali. Un developer può implementarli senza dover inferire la gestione degli errori.

---

**Prossimo step:** [Step 6 — Requisiti Non Funzionali](06-nfr.md)
