---
sidebar_position: 5
sidebar_label: "Decorator in C#"
description: "Decorator in C# — implementazione manuale con DI nativa e tramite Scrutor per applicare logging, caching e altri cross-cutting concern."
---

# Decorator in C\#

Questa pagina mostra come applicare il [Decorator](../../../pattern-di-sviluppo/decorator.md) in ASP.NET Core, sia in modo manuale che tramite la libreria Scrutor.

---

## 1. Decorator manuale con DI nativa

### Scenario

Un servizio di catalogo viene interrogato spesso con gli stessi parametri. Si vuole aggiungere caching senza toccare il servizio.

### Interfaccia e implementazione

```csharp
public interface ICatalogService
{
    Task<Product?> GetByIdAsync(Guid id, CancellationToken ct);
}

public class CatalogService : ICatalogService
{
    private readonly AppDbContext _db;
    public CatalogService(AppDbContext db) => _db = db;

    public Task<Product?> GetByIdAsync(Guid id, CancellationToken ct) =>
        _db.Products.FirstOrDefaultAsync(p => p.Id == id, ct);
}
```

### Decorator di caching

```csharp
public class CachingCatalogService : ICatalogService
{
    private readonly ICatalogService _inner;
    private readonly IMemoryCache _cache;

    public CachingCatalogService(ICatalogService inner, IMemoryCache cache)
    {
        _inner = inner;
        _cache = cache;
    }

    public Task<Product?> GetByIdAsync(Guid id, CancellationToken ct) =>
        _cache.GetOrCreateAsync($"product:{id}", entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);
            return _inner.GetByIdAsync(id, ct);
        });
}
```

### Decorator di logging

```csharp
public class LoggingCatalogService : ICatalogService
{
    private readonly ICatalogService _inner;
    private readonly ILogger<LoggingCatalogService> _logger;

    public LoggingCatalogService(ICatalogService inner, ILogger<LoggingCatalogService> logger)
    {
        _inner = inner;
        _logger = logger;
    }

    public async Task<Product?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        using var scope = _logger.BeginScope("CatalogService.GetById {ProductId}", id);
        var sw = Stopwatch.StartNew();
        var result = await _inner.GetByIdAsync(id, ct);
        _logger.LogInformation("Completed in {Elapsed} ms (found={Found})",
            sw.ElapsedMilliseconds, result is not null);
        return result;
    }
}
```

### Registrazione manuale della catena

```csharp
builder.Services.AddScoped<CatalogService>();
builder.Services.AddScoped<ICatalogService>(sp =>
{
    var real = sp.GetRequiredService<CatalogService>();
    var cached = new CachingCatalogService(real, sp.GetRequiredService<IMemoryCache>());
    return new LoggingCatalogService(cached, sp.GetRequiredService<ILogger<LoggingCatalogService>>());
});
```

L'ordine conta: `LoggingCatalogService` è all'esterno, quindi registra anche le chiamate servite dalla cache. Invertendo l'ordine, si loggherebbe solo ciò che arriva al servizio reale — utile in altri scenari.

---

## 2. Decorator con Scrutor

[Scrutor](https://github.com/khellang/Scrutor) estende la DI nativa con un metodo `Decorate` che evita la registrazione manuale.

```csharp
builder.Services.AddScoped<ICatalogService, CatalogService>();
builder.Services.Decorate<ICatalogService, CachingCatalogService>();
builder.Services.Decorate<ICatalogService, LoggingCatalogService>();
```

L'ordine di chiamata di `Decorate` determina la composizione: l'ultimo registrato è il più esterno. La catena risultante è la stessa dell'esempio manuale: `Logging → Caching → Catalog`.

---

## 3. Decorator come pipeline di MediatR

Quando si usa MediatR, i `IPipelineBehavior<TRequest, TResponse>` sono decorator applicati a tutti i command/query. Sono l'equivalente dei middleware HTTP, ma applicati a livello di handler. Vedi la [pagina sul Chain of Responsibility](chain-of-responsibility.md#3-mediatr-pipeline-behavior) per i dettagli.

---

## 4. Composizione: quando l'ordine conta

| Composizione | Effetto |
|---|---|
| `Logging → Caching → Real` | Logga tutte le chiamate, inclusi i cache hit |
| `Caching → Logging → Real` | Logga solo i cache miss |
| `Retry → Logging → Real` | Logga ogni tentativo |
| `Logging → Retry → Real` | Logga solo l'esito finale dopo eventuali retry |

L'ordine va deciso esplicitamente in base a cosa si vuole osservare.

---

## 5. Quando non usare Decorator

- **Per modificare la pipeline HTTP**: usa [middleware](../pipeline/10-middleware.md), non decorator.
- **Per intercettare azioni MVC**: usa [action filter](../pipeline/11-action-filter.md), [authorization filter](../pipeline/12-authorization-filter.md) o [exception filter](../pipeline/13-exception-filter.md).
- **Per cross-cutting su tutti i command**: usa pipeline behavior di MediatR.
- **Per un solo metodo, su un solo servizio**: spesso una modifica diretta al servizio è più chiara.

Il decorator è la risposta giusta quando si ha un'**interfaccia** condivisa da più consumatori e si vuole aggiungere comportamento componibile.

---

## Anti-pattern: decorator passivo

```csharp
public class UselessDecorator : ICatalogService
{
    private readonly ICatalogService _inner;
    public UselessDecorator(ICatalogService inner) => _inner = inner;
    public Task<Product?> GetByIdAsync(Guid id, CancellationToken ct) =>
        _inner.GetByIdAsync(id, ct);
}
```

Un decorator che si limita a inoltrare non aggiunge nulla. Se ne nasce uno così "in vista" di un comportamento futuro, va rimosso: si aggiungerà quando servirà davvero.
