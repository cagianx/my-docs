---
sidebar_position: 7
description: Quando usare eccezioni e quando il Result pattern per gestire errori prevedibili e imprevedibili.
---

# Gestione degli errori

## Eccezioni vs Result

Le eccezioni, come dice il nome, sono per situazioni eccezionali: eventi imprevedibili, fuori dal controllo del sistema, ai quali si possono prendere solo contromisure limitate e generiche. Un timeout di rete, un disco pieno, una dipendenza esterna irraggiungibile.

Per tutto ciò che è prevedibile e gestibile (validazioni, regole di business non soddisfatte, stati non validi, risorse non trovate) si usa il **[Result pattern](../glossario#result-pattern)**.

```mermaid
flowchart TD
    E[Errore o caso negativo] --> Q{È prevedibile\ne gestibile?}
    Q -->|Sì| R[Result.Fail]
    Q -->|No| X[Eccezione]
    R --> C[Il chiamante gestisce\nesplicitamente]
    X --> P[Propaga fino al\nconfine del sistema]
    P --> L[Middleware logga\ne restituisce 500]
```

## Result pattern

Un Result incapsula l'esito di un'operazione senza lanciare eccezioni. Chi chiama sa sempre che l'operazione può fallire e deve gestire esplicitamente entrambi i casi.

```csharp
// Esempio di struttura base
public class Result<T>
{
    public bool IsSuccess { get; }
    public T? Value { get; }
    public string? Error { get; }

    private Result(T value) { IsSuccess = true; Value = value; }
    private Result(string error) { IsSuccess = false; Error = error; }

    public static Result<T> Ok(T value) => new(value);
    public static Result<T> Fail(string error) => new(error);
}
```

L'errore non è uno stato nascosto: è parte esplicita del contratto.

## Regole

**Le eccezioni non si usano per il controllo del flusso.** Usare `try/catch` per gestire un caso previsto (come un utente non trovato o un importo non valido) è un abuso delle eccezioni. Quel caso va modellato come `Result.Fail(...)`.

**Le eccezioni si lasciano propagare.** Quando si verifica davvero un'eccezione, non si cattura per nasconderla o trasformarla in un Result generico. Si lascia propagare fino al confine del sistema (es. middleware ASP.NET Core), dove viene loggata e restituita come errore 500.

**Il Core non lancia eccezioni di business.** Tutta la business logic nel progetto Core comunica tramite Result. Le eccezioni che emergono dal Core sono per definizione impreviste.

**I Result si compongono.** Operazioni che dipendono l'una dall'altra si concatenano controllando il risultato a ogni step, senza annidare try/catch.

```csharp
// Flusso esplicito, senza eccezioni
var clienteResult = await _clienteRepository.GetByIdAsync(id);
if (!clienteResult.IsSuccess)
    return Result<Ordine>.Fail(clienteResult.Error!);

var ordineResult = _ordineDomainService.Crea(clienteResult.Value!, righe);
if (!ordineResult.IsSuccess)
    return Result<Ordine>.Fail(ordineResult.Error!);

return ordineResult;
```

## Fail Fast

Se qualcosa di essenziale manca o è sbagliato, il sistema si ferma e lo dice chiaramente. Non tenta di continuare con valori di default inventati, non degrada silenziosamente, non maschera il problema.

Questo è un principio della filosofia Unix: **se non puoi fare il tuo lavoro correttamente, fermati subito e segnala l'errore**. Un crash esplicito allo startup è infinitamente meglio di un comportamento silenziosamente scorretto in produzione.

L'esempio più comune è la **configurazione mancante**: se l'applicazione richiede una stringa di connessione, una chiave API o un parametro di business per funzionare, e quel valore non c'è, il processo è legittimato a crashare. Non deve esistere un fallback cablato nel codice che permetta di «andare avanti comunque».

```csharp
// Corretto: crash esplicito se la configurazione manca
var connectionString = configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException(
        "ConnectionStrings:Default non configurata. L'applicazione non può avviarsi.");
```

```csharp
// Sbagliato: fallback silenzioso che nasconde il problema
var connectionString = configuration.GetConnectionString("Default")
    ?? "Host=localhost;Database=fallback";
```

La tentazione di aggiungere valori di default «ragionevoli» per ogni configurazione porta a sistemi che sembrano funzionare ma operano in uno stato non previsto. Quando il problema emerge (e emerge sempre) è lontano dalla causa e molto più difficile da diagnosticare.

**Eccezione:** un valore di default è accettabile solo quando è una **scelta progettuale esplicita e documentata**, non una rete di sicurezza contro la dimenticanza. Per esempio, un timeout di default di 30 secondi per le chiamate HTTP è una scelta progettuale; una stringa di connessione di default a `localhost` è una trappola.

## Quando usare le eccezioni

- Errori infrastrutturali imprevedibili: mancata connessione al database, query in timeout, rete non raggiungibile
- Violazioni di precondizioni interne: bug nel codice, non stati di errore attesi
- Situazioni in cui non esiste una recovery significativa

Il principio è che ci si aspetta che l'infrastruttura funzioni. Non si scrive codice difensivo contro la rete o il database: se il DB non risponde, il sistema non può operare e l'eccezione deve emergere. Non c'è un `Result.Fail("database non raggiungibile")`, non c'è nulla di utile che il chiamante possa fare con quell'informazione.

Fanno eccezione i casi in cui il codice opera deliberatamente su infrastruttura potenzialmente instabile. Un esempio tipico: l'applicazione di migration al startup, dove è sensato gestire esplicitamente il fallimento e ritentare o loggare in modo strutturato prima di terminare il processo.

Se ti trovi a scrivere `catch (Exception ex)` per gestire un caso d'uso normale, il design va rivisto.