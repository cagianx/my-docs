---
sidebar_position: 2
description: Middleware ASP.NET Core per registrare su database tutte le chiamate HTTP in ingresso, compresi body di request e response, via Entity Framework.
---

# HTTP audit log (middleware + EF)

Un middleware che intercetta ogni richiesta HTTP, ne legge body in entrata e in uscita, e salva tutto su database tramite Entity Framework. Utile per audit trail, troubleshooting e analisi retroattiva delle operazioni.

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
    public string? RequestBody { get; set; }

    public int StatusCode { get; set; }
    public string? ResponseContentType { get; set; }
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

        builder.Property(e => e.ResponseContentType)
            .HasMaxLength(200);

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

## Middleware

```csharp
// MyApp.Api/Middleware/HttpAuditMiddleware.cs
using System.Diagnostics;
using System.Security.Claims;
using System.Text;

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

        // --- Lettura del body della request ---
        // EnableBuffering permette di leggere il body più volte
        // (il middleware lo legge, poi il controller lo deve rileggere dall'inizio)
        context.Request.EnableBuffering();
        var requestBody = await ReadBodyAsync(context.Request.Body);
        context.Request.Body.Position = 0; // riporta a inizio per il middleware successivo

        // --- Intercettazione del body della response ---
        // Si sostituisce il body stream originale con un MemoryStream intercettabile,
        // poi al termine si riscrive tutto nel body originale
        var originalResponseBody = context.Response.Body;
        using var capturedResponse = new MemoryStream();
        context.Response.Body = capturedResponse;

        var sw = Stopwatch.StartNew();
        Exception? thrownException = null;

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

            // Ripristina il body originale copiando quanto scritto dal controller
            capturedResponse.Position = 0;
            var responseBody = await ReadBodyAsync(capturedResponse);
            capturedResponse.Position = 0;
            await capturedResponse.CopyToAsync(originalResponseBody);
            context.Response.Body = originalResponseBody;

            // Salva il log in uno scope separato per isolare la transazione
            // dal DbContext della request (che potrebbe essere in stato di errore)
            await SaveAsync(context, requestBody, responseBody, sw.ElapsedMilliseconds);
        }
    }

    private async Task SaveAsync(
        HttpContext context,
        string? requestBody,
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
                RequestBody         = requestBody,
                StatusCode          = context.Response.StatusCode,
                ResponseContentType = context.Response.ContentType,
                ResponseBody        = responseBody,
                ElapsedMs           = elapsedMs,
                UserId              = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                RemoteIp            = context.Connection.RemoteIpAddress?.ToString()
            });

            await db.SaveChangesAsync();
        }
        catch { /* il middleware di audit non deve compromettere la request */ }
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

Il salvataggio avviene in uno scope dedicato, non nel `DbContext` della request. Questo evita conflitti con eventuali modifiche tracciate nel contesto della richiesta o con un contesto già in stato di errore dopo un'eccezione.

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

Usare questo controllo prima di `ReadBodyAsync` — sia per la request che per la response — e salvare `null` per i tipi binari.

## Registrazione

```csharp
// Program.cs — dopo UseExceptionHandler, prima di UseAuthentication
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
