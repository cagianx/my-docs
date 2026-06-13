---
sidebar_position: 2
description: Middleware ASP.NET Core con attributo per audit HTTP per-endpoint, configurabile su errori/all e full/headers; persiste nella struttura unificata ChiamataHttp come lato inbound.
---

# HTTP audit log (middleware + EF + attributo)

Un middleware che intercetta le richieste HTTP solo quando l'endpoint ha un attributo di audit. L'attributo consente una configurazione capillare per controller/metodo: quando loggare (`All` o `ErrorsOnly`) e cosa salvare (`None`, `Headers`, `Full`) per request e response.

## Modello dati: la struttura unificata

Questa pagina è il **lato inbound** del [Log integrale di chiamate HTTP](modellazioni/05-log-chiamate-http.md): non ha una tabella propria, scrive nella stessa `ChiamataHttp` valorizzando `Direzione.Entrata`. La struttura (metadati `ChiamataHttp` separati dal payload `ChiamataHttpContenuto`, con headers e body di richiesta e risposta) è definita lì una volta sola.

Quello che resta specifico dell'inbound è **come** lo si riempie:

- `Categoria` = `"api"`, `Servizio` = nome dell'endpoint o route;
- `Url` = path + query string della richiesta ricevuta;
- `Utente` e `IpRemota` valorizzati dal contesto del chiamante (sull'outbound restano `null`);
- e la **policy capillare per-endpoint** (quando loggare e cosa catturare) espressa con l'attributo qui sotto, che il middleware in uscita non ha.

## Attributo + enum di configurazione

```csharp
// MyApp.Api/Audit/HttpAuditAttribute.cs
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false, Inherited = true)]
public sealed class HttpAuditAttribute : Attribute
{
    public HttpAuditTrigger Trigger { get; init; } = HttpAuditTrigger.All;
    public HttpAuditCaptureMode Request { get; init; } = HttpAuditCaptureMode.Headers;
    public HttpAuditCaptureMode Response { get; init; } = HttpAuditCaptureMode.Headers;
}

public enum HttpAuditTrigger
{
    All = 0,
    ErrorsOnly = 1
}

public enum HttpAuditCaptureMode
{
    None = 0,
    Headers = 1,
    Full = 2
}
```

Con questa configurazione puoi applicare l'audit in modo capillare:

```csharp
[ApiController]
[Route("api/orders")]
[HttpAudit(Trigger = HttpAuditTrigger.ErrorsOnly, Request = HttpAuditCaptureMode.Headers)]
public class OrdersController : ControllerBase
{
    [HttpPost]
    [HttpAudit(Trigger = HttpAuditTrigger.All, Request = HttpAuditCaptureMode.Full, Response = HttpAuditCaptureMode.Full)]
    public IActionResult Create(CreateOrderRequest request) => Ok();
}
```

## Middleware

```csharp
// MyApp.Api/Middleware/HttpAuditMiddleware.cs
using System.Diagnostics;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

public class HttpAuditMiddleware
{
    // Dimensione massima del body catturato: oltre questo limite il testo viene troncato
    private const int MaxBodyBytes = 32 * 1024; // 32 KB

    // Path esclusi dall'audit: health check, metrics, swagger non portano valore
    private static readonly HashSet<string> ExcludedPrefixes =
        new(StringComparer.OrdinalIgnoreCase) { "/health", "/metrics", "/swagger" };

    private readonly RequestDelegate _next;
    private readonly IServiceScopeFactory _scopeFactory;

    public HttpAuditMiddleware(RequestDelegate next, IServiceScopeFactory scopeFactory)
    {
        _next = next;
        _scopeFactory = scopeFactory;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? string.Empty;

        if (ExcludedPrefixes.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
        {
            await _next(context);
            return;
        }

        var policy = context.GetEndpoint()?.Metadata.GetMetadata<HttpAuditAttribute>();
        if (policy is null)
        {
            await _next(context);
            return;
        }

        string? requestHeaders = null;
        string? requestBody = null;

        if (policy.Request is HttpAuditCaptureMode.Headers or HttpAuditCaptureMode.Full)
            requestHeaders = SerializeHeaders(context.Request.Headers);

        if (policy.Request is HttpAuditCaptureMode.Full && IsTextContent(context.Request.ContentType))
        {
            context.Request.EnableBuffering();
            requestBody = await ReadBodyAsync(context.Request.Body);
            context.Request.Body.Position = 0;
        }

        // intercetta la response per poter leggere body e status finale
        var originalResponseBody = context.Response.Body;
        using var capturedResponse = new MemoryStream();
        context.Response.Body = capturedResponse;

        string? responseHeaders = null;
        string? responseBody = null;
        Exception? thrownException = null;
        var sw = Stopwatch.StartNew();

        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            thrownException = ex;
            throw;
        }
        finally
        {
            sw.Stop();

            capturedResponse.Position = 0;
            if (policy.Response is HttpAuditCaptureMode.Full && IsTextContent(context.Response.ContentType))
                responseBody = await ReadBodyAsync(capturedResponse);

            capturedResponse.Position = 0;
            await capturedResponse.CopyToAsync(originalResponseBody);
            context.Response.Body = originalResponseBody;

            if (policy.Response is HttpAuditCaptureMode.Headers or HttpAuditCaptureMode.Full)
                responseHeaders = SerializeHeaders(context.Response.Headers);

            var hasError = thrownException is not null || context.Response.StatusCode >= 400;
            if (policy.Trigger == HttpAuditTrigger.All || hasError)
            {
                await SaveAsync(
                    context,
                    thrownException,
                    requestHeaders,
                    requestBody,
                    responseHeaders,
                    responseBody,
                    sw.ElapsedMilliseconds);
            }
        }
    }

    private async Task SaveAsync(
        HttpContext context,
        Exception? thrownException,
        string? requestHeaders,
        string? requestBody,
        string? responseHeaders,
        string? responseBody,
        long elapsedMs)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var status = context.Response.StatusCode;
            var esito = thrownException is not null ? EsitoChiamata.Eccezione
                      : status >= 400 ? EsitoChiamata.ErroreHttp
                      : EsitoChiamata.Ok;

            // Stessa struttura del log in uscita, con Direzione.Entrata
            db.ChiamateHttp.Add(new ChiamataHttp
            {
                Timestamp     = DateTimeOffset.UtcNow,
                Direzione     = DirezioneChiamata.Entrata,
                Categoria     = "api",
                Servizio      = context.GetEndpoint()?.DisplayName ?? context.Request.Path,
                Metodo        = context.Request.Method,
                Url           = context.Request.Path + context.Request.QueryString,
                StatusCode    = status,
                Esito         = esito,
                Errore        = thrownException?.Message,
                DurataMs      = elapsedMs,
                CorrelationId = Activity.Current?.Id,
                Utente        = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                IpRemota      = context.Connection.RemoteIpAddress?.ToString(),
                Contenuto     = new ChiamataHttpContenuto
                {
                    RequestHeaders  = requestHeaders,
                    RequestBody     = requestBody,
                    ResponseHeaders = responseHeaders,
                    ResponseBody    = responseBody
                }
            });

            await db.SaveChangesAsync();
        }
        catch { /* il middleware di audit non deve compromettere la request */ }
    }

    private static string? SerializeHeaders(IHeaderDictionary headers)
    {
        // Evita di persistere header sensibili
        var filtered = headers
            .Where(h => !h.Key.Equals("Authorization", StringComparison.OrdinalIgnoreCase)
                     && !h.Key.Equals("Cookie", StringComparison.OrdinalIgnoreCase)
                     && !h.Key.Equals("Set-Cookie", StringComparison.OrdinalIgnoreCase))
            .ToDictionary(h => h.Key, h => h.Value.ToString());

        return filtered.Count == 0 ? null : JsonSerializer.Serialize(filtered);
    }

    private static bool IsTextContent(string? contentType)
    {
        if (contentType is null) return false;
        return contentType.StartsWith("application/json", StringComparison.OrdinalIgnoreCase)
            || contentType.StartsWith("text/", StringComparison.OrdinalIgnoreCase)
            || contentType.StartsWith("application/xml", StringComparison.OrdinalIgnoreCase)
            || contentType.StartsWith("application/x-www-form-urlencoded", StringComparison.OrdinalIgnoreCase);
    }

    private static async Task<string?> ReadBodyAsync(Stream stream)
    {
        if (!stream.CanRead || !stream.CanSeek) return null;

        var buffer = new byte[MaxBodyBytes + 1];
        var read = await stream.ReadAsync(buffer.AsMemory(0, buffer.Length));

        if (read == 0) return null;

        var content = Encoding.UTF8.GetString(buffer, 0, Math.Min(read, MaxBodyBytes));
        return read > MaxBodyBytes ? content + " [troncato]" : content;
    }
}
```

Il salvataggio avviene in uno scope dedicato, non nel `DbContext` della request. Questo evita conflitti con eventuali modifiche tracciate nel contesto della richiesta o con un contesto già in stato di errore dopo un'eccezione. Se l'endpoint non ha `[HttpAudit]`, il middleware passa senza persistere nulla.

## Esclusione dei body binari

Per content-type binari (file upload, immagini, PDF) il body non va catturato:

```csharp
private static bool IsTextContent(string? contentType)
{
    if (contentType is null) return false;
    return contentType.StartsWith("application/json", StringComparison.OrdinalIgnoreCase)
        || contentType.StartsWith("text/", StringComparison.OrdinalIgnoreCase)
        || contentType.StartsWith("application/xml", StringComparison.OrdinalIgnoreCase)
        || contentType.StartsWith("application/x-www-form-urlencoded", StringComparison.OrdinalIgnoreCase);
}
```

Nel middleware sopra è già usato prima di leggere request/response body.

## Registrazione

```csharp
// Program.cs, dopo UseRouting (endpoint metadata disponibile)
app.UseMiddleware<HttpAuditMiddleware>();
```

Oppure con un extension method:

```csharp
public static class HttpAuditMiddlewareExtensions
{
    public static IApplicationBuilder UseHttpAudit(this IApplicationBuilder app)
        => app.UseMiddleware<HttpAuditMiddleware>();
}

// Program.cs
app.UseHttpAudit();
```

## Migration

La tabella è quella condivisa `ChiamataHttp`: la migration che la crea sta con il [log integrale](modellazioni/05-log-chiamate-http.md), non qui. Questo middleware è solo un altro produttore della stessa struttura, non introduce tabelle nuove.

## Considerazioni operative

- **Dati sensibili**: il body delle chiamate di autenticazione (login, token refresh) non va mai salvato: aggiungere il path di login a `ExcludedPrefixes`.
- **Performance**: la latenza aggiunta dipende dal tempo di scrittura su DB. Per sistemi ad alto carico si può usare un buffer in memoria o una coda in background invece del salvataggio sincrono per-request.
- **Volume e retention**: valgono per l'inbound le stesse note del [log integrale](modellazioni/05-log-chiamate-http.md#considerazioni-operative): retention e partizionamento sulla `Timestamp` sono condivisi, perché la tabella è una sola.
