---
sidebar_position: 2
description: Middleware ASP.NET Core con attributo per audit HTTP per-endpoint, configurabile su errori/all e full/headers.
---

# HTTP audit log (middleware + EF + attributo)

Un middleware che intercetta le richieste HTTP solo quando l'endpoint ha un attributo di audit. L'attributo consente una configurazione capillare per controller/metodo: quando loggare (`All` o `ErrorsOnly`) e cosa salvare (`None`, `Headers`, `Full`) per request e response.

:::tip Audit inbound e outbound nella stessa struttura
Questa pagina mostra l'audit **inbound** con una tabella dedicata. Se serve loggare anche le chiamate **in uscita** (servizi IA, REST, SOAP), conviene unificare i due versi in un'unica struttura con un campo `Direzione`: vedi [Log integrale di chiamate HTTP](05-log-chiamate-http.md). Lì il middleware qui descritto diventa il produttore inbound della tabella unificata.
:::

## Modello dati

```csharp
// MyApp.Infrastructure/Audit/HttpAuditLog.cs
public class HttpAuditLog
{
    public long Id { get; set; }
    public DateTimeOffset Timestamp { get; set; }

    public string Method { get; set; } = default!;
    public string Path { get; set; } = default!;
    public string? QueryString { get; set; }

    public string? RequestContentType { get; set; }
    public string? RequestHeaders { get; set; }
    public string? RequestBody { get; set; }

    public int StatusCode { get; set; }
    public string? ResponseContentType { get; set; }
    public string? ResponseHeaders { get; set; }
    public string? ResponseBody { get; set; }

    public long ElapsedMs { get; set; }

    // Contesto della chiamata
    public string? UserId { get; set; }
    public string? RemoteIp { get; set; }
}
```

### Configurazione EF

```csharp
// MyApp.Infrastructure/Audit/HttpAuditLogConfiguration.cs
public class HttpAuditLogConfiguration : IEntityTypeConfiguration<HttpAuditLog>
{
    public void Configure(EntityTypeBuilder<HttpAuditLog> builder)
    {
        builder.ToTable(nameof(HttpAuditLog));

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Method)
            .HasMaxLength(10)
            .IsRequired();

        builder.Property(e => e.Path)
            .HasMaxLength(2048)
            .IsRequired();

        builder.Property(e => e.RequestContentType)
            .HasMaxLength(200);

        builder.Property(e => e.RequestHeaders)
            .HasColumnType("nvarchar(max)");

        builder.Property(e => e.ResponseContentType)
            .HasMaxLength(200);

        builder.Property(e => e.ResponseHeaders)
            .HasColumnType("nvarchar(max)");

        builder.Property(e => e.RemoteIp)
            .HasMaxLength(45); // IPv6 max length

        builder.HasIndex(e => e.Timestamp);
        builder.HasIndex(e => e.Path);
        builder.HasIndex(e => e.StatusCode);
        builder.HasIndex(e => e.UserId);
    }
}
```

Aggiungere il `DbSet` al contesto:

```csharp
public class AppDbContext : DbContext
{
    public DbSet<HttpAuditLog> HttpAuditLogs => Set<HttpAuditLog>();
    // ... altri DbSet
}
```

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

            db.HttpAuditLogs.Add(new HttpAuditLog
            {
                Timestamp           = DateTimeOffset.UtcNow,
                Method              = context.Request.Method,
                Path                = context.Request.Path.Value ?? string.Empty,
                QueryString         = context.Request.QueryString.HasValue
                                      ? context.Request.QueryString.Value : null,
                RequestContentType  = context.Request.ContentType,
                RequestHeaders      = requestHeaders,
                RequestBody         = requestBody,
                StatusCode          = context.Response.StatusCode,
                ResponseContentType = context.Response.ContentType,
                ResponseHeaders     = responseHeaders,
                ResponseBody        = responseBody,
                ElapsedMs           = elapsedMs,
                UserId              = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                RemoteIp            = context.Connection.RemoteIpAddress?.ToString()
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
// Program.cs — dopo UseRouting (endpoint metadata disponibile)
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

```bash
dotnet ef migrations add AddHttpAuditLog \
    --project src/MyApp.Infrastructure \
    --startup-project src/MyApp.Api
```

## Considerazioni operative

- **Volume**: in produzione con traffico elevato la tabella cresce rapidamente. Pianificare una retention policy (es. `DELETE FROM HttpAuditLog WHERE Timestamp < now() - interval '90 days'`) o usare il partizionamento per mese.
- **Dati sensibili**: il body delle chiamate di autenticazione (login, token refresh) non va mai salvato — aggiungere il path di login a `ExcludedPrefixes`.
- **Performance**: la latenza aggiunta dipende dal tempo di scrittura su DB. Per sistemi ad alto carico si può usare un buffer in memoria o una coda in background invece del salvataggio sincrono per-request.
