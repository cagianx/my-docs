---
sidebar_position: 23
description: "CancellationToken in C#: a cosa serve, come si propaga, linked token e anti-pattern da evitare."
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

1. **`CancellationTokenSource`**: il produttore, chi decide *quando* annullare.
2. **`CancellationToken`**: il segnale passato ai consumatori.
3. **Il codice che controlla il token**: il consumatore, chi decide *come* reagire.

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

## Esempio pratico: applicazione console con Ctrl+C

Un'applicazione console che esegue un'elaborazione lunga deve interrompersi in modo pulito quando l'utente preme Ctrl+C o il sistema invia SIGTERM (es. Docker che ferma il container).

```csharp
// Program.cs: applicazione console
var cts = new CancellationTokenSource();

// Ctrl+C e SIGTERM annullano il token
Console.CancelKeyPress += (_, e) =>
{
    e.Cancel = true; // impedisce la chiusura immediata del processo
    cts.Cancel();
    Console.WriteLine("Interruzione richiesta. Terminazione in corso...");
};

try
{
    await ElaboraFileAsync("archivio.csv", cts.Token);
    Console.WriteLine("Elaborazione completata.");
}
catch (OperationCanceledException)
{
    Console.WriteLine("Elaborazione interrotta dall'utente.");
    Environment.ExitCode = 1;
}

static async Task ElaboraFileAsync(string percorso, CancellationToken ct)
{
    var righe = await File.ReadAllLinesAsync(percorso, ct);
    var totale = righe.Length;

    for (var i = 0; i < totale; i++)
    {
        ct.ThrowIfCancellationRequested();

        await ElaboraRigaAsync(righe[i], ct);

        if (i % 100 == 0)
            Console.WriteLine($"Progresso: {i}/{totale}");
    }
}
```

Cosa succede:
1. L'utente preme Ctrl+C → il runtime invoca `CancelKeyPress` → `cts.Cancel()` annulla il token.
2. Il ciclo `for` incontra `ThrowIfCancellationRequested()` alla prossima iterazione → lancia `OperationCanceledException`.
3. L'eccezione risale fino al `catch` nel `Main` → uscita controllata con messaggio e codice di errore.

`e.Cancel = true` è importante: senza, il processo termina immediatamente al primo Ctrl+C senza dare tempo al codice di reagire.

## Esempio pratico: Web API con client che si disconnette

In una Web API, quando il client chiude la connessione (timeout del browser, utente che naviga altrove, abort esplicito), ASP.NET Core annulla automaticamente il `CancellationToken` della richiesta.

```csharp
[ApiController]
[Route("api/[controller]")]
public class ReportController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPdfService _pdfService;
    private readonly ILogger<ReportController> _logger;

    public ReportController(
        AppDbContext db,
        IPdfService pdfService,
        ILogger<ReportController> logger)
    {
        _db = db;
        _pdfService = pdfService;
        _logger = logger;
    }

    /// <summary>
    /// Genera un report PDF pesante. Se il client si disconnette,
    /// l'elaborazione si interrompe senza sprecare risorse.
    /// </summary>
    [HttpGet("{anno}")]
    public async Task<IActionResult> GeneraReport(int anno, CancellationToken ct)
    {
        // 1. Query al database: se il client è già andato, la query non parte
        var transazioni = await _db.Transazioni
            .Where(t => t.Anno == anno)
            .ToListAsync(ct);

        // 2. Elaborazione pesante: il token viene controllato ad ogni step
        var reportData = await CalcolaStatisticheAsync(transazioni, ct);

        // 3. Generazione PDF: anche il servizio esterno rispetta il token
        var pdf = await _pdfService.GeneraAsync(reportData, ct);

        return File(pdf, "application/pdf", $"report-{anno}.pdf");
    }

    private async Task<ReportData> CalcolaStatisticheAsync(
        List<Transazione> transazioni,
        CancellationToken ct)
    {
        var risultato = new ReportData();

        foreach (var batch in transazioni.Chunk(500))
        {
            ct.ThrowIfCancellationRequested();

            // Simulazione di elaborazione pesante per ogni batch
            risultato.AggiungiStatistiche(await ElaboraBatchAsync(batch, ct));
        }

        return risultato;
    }
}
```

Cosa succede quando il client si disconnette a metà:

```
Timeline:
  0 ms    → Il client chiama GET /api/report/2025
  50 ms   → La query al DB inizia
  200 ms  → La query completa, inizia CalcolaStatisticheAsync
  350 ms  → Il client chiude la connessione (timeout, navigazione, abort)
  350 ms  → ASP.NET Core annulla il CancellationToken
  351 ms  → Il prossimo ThrowIfCancellationRequested() lancia OperationCanceledException
  351 ms  → L'eccezione risale: nessun PDF viene generato, nessuna risposta inviata
```

Senza il token, il server continuerebbe a calcolare statistiche e generare un PDF che nessuno riceverà mai, consumando CPU, memoria e connessioni al database inutilmente.

### Cosa fare e cosa non fare nel controller

```csharp
// ✅ Il token si propaga a tutte le operazioni
[HttpGet]
public async Task<IActionResult> Get(CancellationToken ct)
{
    var dati = await _service.GetDatiAsync(ct);
    return Ok(dati);
}

// ❌ Il token c'è ma non viene propagato: inutile dichiararlo
[HttpGet]
public async Task<IActionResult> Get(CancellationToken ct)
{
    var dati = await _service.GetDatiAsync(); // ct ignorato!
    return Ok(dati);
}

// ❌ Nessun token dichiarato: impossibile interrompere l'operazione
[HttpGet]
public async Task<IActionResult> Get()
{
    var dati = await _service.GetDatiAsync();
    return Ok(dati);
}
```

## Propagazione in ASP.NET Core

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

Per operazioni lunghe che non chiamano API esterne (loop CPU-bound, elaborazioni batch), il token va controllato esplicitamente. Esistono diverse strategie a seconda del tipo di uscita desiderato.

### Strategia 1: uscita con eccezione (ThrowIfCancellationRequested)

È la forma più comune. L'eccezione risale lo stack e il chiamante gestisce l'interruzione.

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

Si usa quando: l'operazione non ha bisogno di restituire risultati parziali e chi chiama è pronto a gestire `OperationCanceledException`.

### Strategia 2: uscita controllata con risultato parziale

In alcuni casi, il lavoro già fatto è utile anche se il ciclo non finisce. Si controlla `IsCancellationRequested` e si esce con un `break`, restituendo ciò che si ha.

```csharp
public async Task<ImportResult> ImportaClientiAsync(
    IReadOnlyList<ClienteDto> clienti,
    CancellationToken ct)
{
    var importati = 0;
    var errori = new List<string>();

    foreach (var cliente in clienti)
    {
        if (ct.IsCancellationRequested)
        {
            // Uscita pulita: si restituisce il lavoro fatto finora
            break;
        }

        try
        {
            await _repository.InserisciAsync(cliente, ct);
            importati++;
        }
        catch (DuplicateException ex)
        {
            errori.Add($"Cliente {cliente.CodiceFiscale}: già presente.");
        }
    }

    return new ImportResult
    {
        Importati = importati,
        Errori = errori,
        Completato = !ct.IsCancellationRequested,
        TotaleRichiesti = clienti.Count
    };
}
```

Il chiamante riceve il risultato e sa quanti record sono stati processati. Nessuna eccezione: la cancellazione è un esito legittimo.

### Strategia 3: completare l'elemento corrente prima di uscire

Se ogni iterazione è una transazione logica (es. invio email, elaborazione pagamento), si vuole **completare l'elemento in corso** e poi uscire, mai interrompere a metà.

```csharp
public async Task InviaNotificheAsync(
    IReadOnlyList<Notifica> notifiche,
    CancellationToken ct)
{
    foreach (var notifica in notifiche)
    {
        // Controllo PRIMA di iniziare un nuovo elemento
        if (ct.IsCancellationRequested)
        {
            _logger.LogInformation(
                "Interruzione richiesta. Inviate {Inviate}/{Totale} notifiche.",
                notifica.Indice, notifiche.Count);
            break;
        }

        // Da qui in poi, l'elemento viene completato anche se il token scatta
        // durante l'esecuzione, non si passa ct alle operazioni interne
        await _emailService.InviaAsync(notifica.Destinatario, notifica.Corpo);
        await _db.SegnaInviataAsync(notifica.Id);
        await _db.SaveChangesAsync(CancellationToken.None); // commit garantito
    }
}
```

Qui `CancellationToken.None` nelle operazioni interne è **intenzionale**: una volta iniziato l'invio, si vuole che la persistenza avvenga. Il controllo del token è solo al confine tra un elemento e il successivo.

### Strategia 4: loop con intervallo e uscita pulita (worker/daemon)

Per loop infiniti tipici di background service o worker:

```csharp
protected override async Task ExecuteAsync(CancellationToken stoppingToken)
{
    _logger.LogInformation("Worker avviato.");

    while (!stoppingToken.IsCancellationRequested)
    {
        try
        {
            var messaggi = await _coda.LeggiAsync(maxBatch: 10, stoppingToken);

            foreach (var messaggio in messaggi)
            {
                if (stoppingToken.IsCancellationRequested)
                    break; // non si iniziano nuovi messaggi

                await ElaboraAsync(messaggio, stoppingToken);
                await _coda.ConfermaAsync(messaggio.Id, stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Shutdown richiesto: uscita pulita, non è un errore
            break;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Errore durante l'elaborazione.");
            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
    }

    _logger.LogInformation("Worker fermato.");
}
```

Il pattern `catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)` cattura solo la cancellazione da shutdown e non quella da timeout interni o altri motivi.

### Strategia 5: elaborazione CPU-bound con controllo periodico

Per calcoli pesanti senza punti naturali di `await`, si controlla il token a intervalli regolari:

```csharp
public RisultatoAnalisi AnalizzaDati(IReadOnlyList<Campione> campioni, CancellationToken ct)
{
    var risultati = new List<double>(campioni.Count);

    for (var i = 0; i < campioni.Count; i++)
    {
        // Controllo ogni 1000 iterazioni per non penalizzare le prestazioni
        if (i % 1000 == 0)
            ct.ThrowIfCancellationRequested();

        risultati.Add(CalcolaDistanza(campioni[i]));
    }

    return new RisultatoAnalisi(risultati);
}
```

Il controllo non va fatto ad ogni iterazione in loop stretti: `ThrowIfCancellationRequested()` è economico ma non gratuito. Ogni N iterazioni è un buon compromesso tra reattività e prestazioni.

### Riepilogo delle strategie

| Strategia | Quando usarla |
|-----------|---------------|
| `ThrowIfCancellationRequested()` | L'operazione non ha risultati parziali utili |
| `if (IsCancellationRequested) break` + risultato | Il lavoro fatto finora è utile |
| Completare l'elemento + uscire | Ogni iterazione è una transazione atomica |
| `while (!ct.IsCancellationRequested)` | Loop infinito di un worker |
| Controllo ogni N iterazioni | Loop CPU-bound molto stretto |

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

Senza linked token si dovrebbe scegliere quale token passare, perdendo l'altro segnale.

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
// ❌ Il token c'è ma non viene passato: l'operazione prosegue anche se annullata
public async Task<List<Ordine>> GetOrdiniAsync(CancellationToken ct)
{
    return await _db.Ordini.ToListAsync(); // manca ct!
}
```

Se un metodo riceve un `CancellationToken`, deve propagarlo. Altrimenti il parametro è una promessa non mantenuta.

### Catturare e ingoiare OperationCanceledException

```csharp
// ❌ Nasconde la cancellazione: il chiamante non sa che l'operazione è stata interrotta
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
