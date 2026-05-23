---
sidebar_position: 6
sidebar_label: "Chain of Responsibility in C#"
description: "Chain of Responsibility in C# — middleware ASP.NET Core, filter MVC e pipeline behavior di MediatR come incarnazioni del pattern."
---

# Chain of Responsibility in C\#

In ASP.NET Core il [Chain of Responsibility](../../../pattern-di-sviluppo/chain-of-responsibility.md) è il pattern fondante della pipeline HTTP. Si manifesta in tre forme distinte, da scegliere in base al livello di intervento richiesto.

---

## 1. Middleware HTTP

### Scenario

Si vuole intercettare ogni request a livello pipeline, prima ancora che l'MVC entri in gioco: logging, correlation ID, gestione globale errori, header di sicurezza.

```csharp
public class CorrelationIdMiddleware
{
    private const string HeaderName = "X-Correlation-Id";
    private readonly RequestDelegate _next;

    public CorrelationIdMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = context.Request.Headers.TryGetValue(HeaderName, out var value)
            ? value.ToString()
            : Guid.NewGuid().ToString();

        context.Response.Headers[HeaderName] = correlationId;

        using (context.RequestServices.GetRequiredService<ILogger<CorrelationIdMiddleware>>()
            .BeginScope(new Dictionary<string, object> { ["CorrelationId"] = correlationId }))
        {
            await _next(context);
        }
    }
}
```

### Registrazione

```csharp
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
```

L'ordine di registrazione **è** la composizione della catena. Cambiare ordine cambia comportamento. Per i dettagli operativi vedi la pagina dedicata al [middleware](../pipeline/10-middleware.md).

---

## 2. Filter MVC

I filter sono un Chain of Responsibility ristretto al perimetro MVC: hanno accesso al `ControllerContext`, al model binding, ai risultati delle action. Sono lo strumento giusto quando il comportamento dipende da metadati MVC (attributi su controller/action, tipo del modello, esito del routing).

| Filter | Quando interviene | Pagina |
|---|---|---|
| Authorization filter | Prima di tutto il resto del MVC | [12-authorization-filter](../pipeline/12-authorization-filter.md) |
| Action filter | Prima e dopo l'esecuzione dell'action | [11-action-filter](../pipeline/11-action-filter.md) |
| Exception filter | Quando un'eccezione non gestita lascia l'action | [13-exception-filter](../pipeline/13-exception-filter.md) |

La regola generale: se il comportamento si applica indipendentemente da MVC, si usa middleware; se dipende dal contesto MVC, si usa un filter.

---

## 3. MediatR pipeline behavior

### Scenario

Si vuole applicare un comportamento a tutti i command o query: logging strutturato del nome del command, validazione FluentValidation, transazione, gestione standardizzata del `Result`.

```csharp
public class LoggingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly ILogger<LoggingBehavior<TRequest, TResponse>> _logger;

    public LoggingBehavior(ILogger<LoggingBehavior<TRequest, TResponse>> logger) =>
        _logger = logger;

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken ct)
    {
        var name = typeof(TRequest).Name;
        using var scope = _logger.BeginScope("Handle {RequestName}", name);

        var sw = Stopwatch.StartNew();
        try
        {
            var response = await next();
            _logger.LogInformation("{RequestName} completed in {Elapsed} ms", name, sw.ElapsedMilliseconds);
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "{RequestName} failed after {Elapsed} ms", name, sw.ElapsedMilliseconds);
            throw;
        }
    }
}
```

### Validation behavior

```csharp
public class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators) =>
        _validators = validators;

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken ct)
    {
        if (!_validators.Any()) return await next();

        var context = new ValidationContext<TRequest>(request);
        var results = await Task.WhenAll(_validators.Select(v => v.ValidateAsync(context, ct)));
        var failures = results.SelectMany(r => r.Errors).Where(f => f is not null).ToList();

        if (failures.Count != 0)
            throw new ValidationException(failures);

        return await next();
    }
}
```

### Registrazione

```csharp
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssemblyContaining<Program>();
    cfg.AddOpenBehavior(typeof(LoggingBehavior<,>));
    cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
});
```

L'ordine di `AddOpenBehavior` determina la composizione della pipeline: il primo registrato è il più esterno. Nell'esempio, ogni command passa per `Logging → Validation → Handler`.

---

## 4. Scegliere il livello giusto

| Esigenza | Livello |
|---|---|
| Header HTTP, redirect, response compression | Middleware |
| Autorizzazione basata su attributi MVC | Authorization filter |
| Logging input/output di un'action | Action filter |
| Eccezione → `ProblemDetails` MVC-aware | Exception filter |
| Logging input/output di un command | Pipeline behavior MediatR |
| Validazione di un command | Pipeline behavior MediatR |
| Apertura/chiusura transazione attorno a un command | Pipeline behavior MediatR |

In una solution ben strutturata, le tre forme convivono e ciascuna fa la propria parte. Il middleware vede tutte le request, il filter vede solo quelle che arrivano all'MVC, il behavior vede solo quelle che diventano un command. Più si scende di livello, più cresce la conoscenza del contesto.
