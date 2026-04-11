---
sidebar_position: 8
description: Log strutturati con ILogger, livelli appropriati, troubleshooting e cosa non loggare mai.
---

# Logging e Osservabilità

## Astrazione prima dell'implementazione

Il codice dipende sempre da `Microsoft.Extensions.Logging.ILogger<T>`, mai da Serilog direttamente. Serilog è il backend — il sink che decide dove i log finiscono — ma il codice applicativo non lo conosce.

```csharp
// Corretto: dipendenza sull'astrazione
public class OrdineService
{
    private readonly ILogger<OrdineService> _logger;

    public OrdineService(ILogger<OrdineService> logger)
    {
        _logger = logger;
    }
}
```

```csharp
// Sbagliato: dipendenza diretta su Serilog
private readonly Serilog.ILogger _logger = Log.ForContext<OrdineService>();
```

Questo mantiene il Core libero da dipendenze infrastrutturali e rende possibile cambiare backend (o usarne più di uno) senza toccare il codice applicativo.

## Serilog

Serilog si configura al livello più alto della solution — `Program.cs` del progetto Api o Console. È l'unico punto in cui appare il riferimento diretto a Serilog.

Si configurano i sink in base all'ambiente: console in sviluppo, file o aggregatori strutturati (Seq, Elastic, Application Insights) in produzione.

## Livelli di log

| Livello | Quando usarlo |
|---------|---------------|
| `Trace` | dettagli granulari per diagnostica profonda, solo in sviluppo |
| `Debug` | informazioni utili durante lo sviluppo, disabilitate in produzione |
| `Information` | eventi significativi del flusso normale — avvio, operazioni completate |
| `Warning` | situazioni anomale ma gestite — retry, fallback, dati inattesi |
| `Error` | errori che impediscono un'operazione ma non abbattono il sistema |
| `Critical` | errori che compromettono il funzionamento del sistema |

## Cosa si logga

**Obbligatorio:**
- avvio e shutdown dell'applicazione
- eccezioni non gestite — con stack trace completo
- operazioni sul dominio rilevanti per audit o diagnostica
- chiamate a servizi esterni — con esito e tempo di risposta

**Regola fondamentale sugli errori:** l'ultimo log prima del fallimento deve contenere **tutte le informazioni necessarie per un rapido troubleshooting**: id delle entità coinvolte, chiavi semantiche, utente, stack trace. Chi legge quel log deve poter ricostruire il contesto senza dover cercare altrove.

Catturare un'eccezione per rilanciarla decorata con informazioni di contesto è una buona pratica:

```csharp
catch (Exception ex)
{
    throw new InvalidOperationException(
        $"Errore nell'elaborazione dell'ordine {ordineId} per il cliente {clienteId}", ex);
}
```

**Facoltativo (Debug/Trace):**
- dettagli interni ai flussi, utili solo in fase di debug

**Mai:**
- dati personali, password, token, chiavi API
- contenuto integrale di request/response senza sanitizzazione
- log su database — usare sistemi di log centralizzato (.NET offre middleware dedicati per la cattura delle eccezioni)

## Log strutturati

Serilog usa log strutturati: i valori non si concatenano nella stringa, si passano come proprietà. Questo li rende ricercabili e aggregabili.

```csharp
// Corretto: log strutturato
_logger.LogInformation("Ordine {OrdineId} creato per cliente {ClienteId}", ordine.Id, cliente.Id);

// Sbagliato: interpolazione di stringa
_logger.LogInformation($"Ordine {ordine.Id} creato per cliente {cliente.Id}");
```

L'interpolazione vanifica la struttura e genera allocazioni inutili anche quando il livello di log è disabilitato.