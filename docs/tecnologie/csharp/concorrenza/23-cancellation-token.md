---
sidebar_position: 23
description: CancellationToken in C# — a cosa serve, come si propaga, linked token e anti-pattern da evitare.
---

# CancellationToken

## A cosa serve

`CancellationToken` è il meccanismo standard di .NET per segnalare che un'operazione non è più necessaria e può essere interrotta. Non forza l'interruzione: **chiede gentilmente** all'operazione di fermarsi. È l'operazione stessa a controllare il token e decidere quando smettere.

Casi d'uso tipici:

| Scenario | Chi annulla |
|----------|------------|
| Il client chiude la connessione HTTP | ASP.NET Core (automatico) |
| L'applicazione riceve SIGTERM / Ctrl+C | Il runtime via `IHostApplicationLifetime` |
| Un timeout scade | `CancellationTokenSource` con timer |
| L'utente preme "Annulla" in una UI | Codice applicativo |

Senza cancellation token, un'operazione continua a consumare CPU, memoria e connessioni di rete anche quando il risultato non serve più a nessuno.

## Come funziona

Il pattern si compone di tre pezzi:

1. **`CancellationTokenSource`** — il produttore: chi decide *quando* annullare.
2. **`CancellationToken`** — il segnale passato ai consumatori.
3. **Il codice che controlla il token** — il consumatore: chi decide *come* reagire.

```csharp
var cts = new CancellationTokenSource();
var token = cts.Token;

// Il consumatore riceve solo il token (non può annullare, solo osservare)
await LavoraPesanteAsync(token);

// Da qualche altra parte, quando si vuole annullare:
cts.Cancel();
```

Il `CancellationTokenSource` implementa `IDisposable`: va sempre disposto quando non serve più, per rilasciare le risorse interne (timer, callback registrati).

```csharp
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
await ChiamaServizioEsternoAsync(cts.Token);
```

## Come si usa in ASP.NET Core

Nelle action dei controller e negli endpoint minimal API, basta dichiarare un parametro `CancellationToken`: il framework lo inietta automaticamente, collegato alla connessione del client.

```csharp
[HttpGet]
public async Task<IActionResult> GetReport(CancellationToken ct)
{
    var dati = await _db.Report
        .Where(r => r.Anno == 2025)
        .ToListAsync(ct);

    return Ok(dati);
}
```

Il token va propagato a **ogni** chiamata asincrona nella catena:

```csharp
// Controller → UseCase → Repository → DbContext
public async Task<Result<ReportDto>> GeneraReportAsync(int anno, CancellationToken ct)
{
    var dati = await _repository.GetByAnnoAsync(anno, ct);
    var pdf = await _pdfService.GeneraAsync(dati, ct);
    return Result.Ok(pdf);
}
```

Se il client chiude la connessione a metà elaborazione, il token si annulla e l'`OperationCanceledException` risale lo stack. ASP.NET Core la gestisce internamente restituendo un 499 (o chiudendo la connessione senza risposta).

## Controllare il token nel codice applicativo

Per operazioni lunghe che non chiamano API esterne (loop CPU-bound, elaborazioni batch), il token va controllato esplicitamente:

```csharp
public async Task ElaboraBatchAsync(IList<Ordine> ordini, CancellationToken ct)
{
    foreach (var ordine in ordini)
    {
        ct.ThrowIfCancellationRequested(); // lancia OperationCanceledException

        await ElaboraSingoloAsync(ordine, ct);
    }
}
```

`ThrowIfCancellationRequested()` è la forma più comune. Per situazioni in cui si preferisce un'uscita controllata senza eccezione:

```csharp
while (!ct.IsCancellationRequested)
{
    await Task.Delay(TimeSpan.FromSeconds(5), ct);
    await ControllaAggiornamenti(ct);
}
```

## Timeout con CancellationTokenSource

Per imporre un tempo massimo a un'operazione:

```csharp
public async Task<string> GetDatiAsync(CancellationToken ct)
{
    using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
    cts.CancelAfter(TimeSpan.FromSeconds(10));

    try
    {
        var risposta = await _httpClient.GetAsync("/api/dati", cts.Token);
        return await risposta.Content.ReadAsStringAsync(cts.Token);
    }
    catch (OperationCanceledException) when (!ct.IsCancellationRequested)
    {
        // ct non è annullato → il timeout locale è scaduto
        throw new TimeoutException("Il servizio esterno non ha risposto entro 10 secondi.");
    }
    // Se ct è annullato, l'eccezione risale normalmente (cancellazione del chiamante)
}
```

Il `when (!ct.IsCancellationRequested)` distingue un timeout locale da una cancellazione esterna (es. il client che chiude la connessione): se il token originale `ct` non è annullato, la causa è il timeout.

## Linked CancellationToken

### Il problema

Spesso servono **più motivi** per annullare un'operazione contemporaneamente. Esempio: si vuole rispettare sia il token della richiesta HTTP (client disconnesso) sia un timeout locale.

Senza linked token si dovrebbe scegliere quale token passare — perdendo l'altro segnale.

### La soluzione

`CancellationTokenSource.CreateLinkedTokenSource` crea un token che si annulla quando **uno qualsiasi** dei token sorgente si annulla.

```csharp
public async Task<RispostaEsterna> ChiamaConTimeoutAsync(
    RichiestaEsterna richiesta,
    CancellationToken ct) // token della richiesta HTTP
{
    // Linked: si annulla se il client si disconnette OPPURE se scadono 5 secondi
    using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
    linkedCts.CancelAfter(TimeSpan.FromSeconds(5));

    return await _httpClient.PostAsJsonAsync("/api/esterna", richiesta, linkedCts.Token);
}
```

In questo modo:
- se il client chiude la connessione → `ct` si annulla → `linkedCts.Token` si annulla
- se passano 5 secondi → `linkedCts` si annulla per timeout → `linkedCts.Token` si annulla

L'operazione rispetta **entrambi** i vincoli senza codice aggiuntivo.

### Casi d'uso tipici dei linked token

| Scenario | Token 1 | Token 2 |
|----------|---------|---------|
| Timeout locale + cancellazione richiesta | `HttpContext.RequestAborted` | Timeout di 5 s |
| Shutdown applicazione + timeout operazione | `stoppingToken` del `BackgroundService` | Timeout per singola unità di lavoro |
| Cancellazione utente + deadline di sistema | Token UI | Token di sistema con scadenza fissa |

### Attenzione al Dispose

Il `CancellationTokenSource` creato da `CreateLinkedTokenSource` **deve** essere disposto. Se non lo si fa, rimane registrato come callback sui token sorgente, causando memory leak in scenari ad alto throughput.

```csharp
// ✅ Sempre con using
using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct);

// ❌ Memory leak in scenari con molte richieste
var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
```

## Anti-pattern

### Ignorare il token

```csharp
// ❌ Il token c'è ma non viene passato — l'operazione prosegue anche se annullata
public async Task<List<Ordine>> GetOrdiniAsync(CancellationToken ct)
{
    return await _db.Ordini.ToListAsync(); // manca ct!
}
```

Se un metodo riceve un `CancellationToken`, deve propagarlo. Altrimenti il parametro è una promessa non mantenuta.

### Catturare e ingoiare OperationCanceledException

```csharp
// ❌ Nasconde la cancellazione — il chiamante non sa che l'operazione è stata interrotta
try
{
    await _service.ElaboraAsync(ct);
}
catch (OperationCanceledException)
{
    // silenzio
}
```

`OperationCanceledException` deve risalire lo stack, a meno che non si stia gestendo uno shutdown controllato (come in un `BackgroundService`).

### Usare CancellationToken.None al posto del token ricevuto

```csharp
// ❌ Il token del chiamante viene ignorato
public async Task SalvaAsync(Entita entita, CancellationToken ct)
{
    await _db.SaveChangesAsync(CancellationToken.None); // perché?
}
```

`CancellationToken.None` ha senso solo quando l'operazione **deve** completarsi indipendentemente dalla cancellazione (es. un salvataggio critico durante lo shutdown). In tutti gli altri casi si passa il token ricevuto.

### Cancellare un CancellationTokenSource che non si possiede

```csharp
// ❌ Non si annulla il token di qualcun altro
public async Task MetodoAsync(CancellationToken ct)
{
    // ct non è nostro, non abbiamo il CancellationTokenSource
    // non esiste modo lecito di annullarlo da qui
}
```

Solo chi crea il `CancellationTokenSource` ha il diritto di annullarlo. Il consumatore riceve il token in sola lettura.

### Controllare IsCancellationRequested senza agire

```csharp
// ❌ Controlla il token ma continua comunque
if (ct.IsCancellationRequested)
{
    _logger.LogWarning("Cancellazione richiesta");
    // ... e poi prosegue come niente fosse
}
```

Se si controlla il token, si deve uscire: con `ThrowIfCancellationRequested()`, con un `return`, o con un `break`.

## Riepilogo

| Concetto | Descrizione |
|----------|-------------|
| `CancellationTokenSource` | Chi decide di annullare (produttore) |
| `CancellationToken` | Il segnale da propagare (sola lettura) |
| `ThrowIfCancellationRequested()` | Interrompe con eccezione se annullato |
| `IsCancellationRequested` | Controllo senza eccezione |
| `CreateLinkedTokenSource` | Combina più motivi di cancellazione in un unico token |
| `CancelAfter` | Imposta un timeout sul source |

La regola guida è semplice: **ogni metodo asincrono riceve un `CancellationToken` come ultimo parametro e lo propaga a tutte le chiamate interne**. Non farlo significa sprecare risorse per lavoro che nessuno attende.
