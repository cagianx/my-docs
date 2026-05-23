---
sidebar_position: 1
sidebar_label: "Strategy pattern in C#"
description: "Strategy pattern in C# — implementazione tramite IEnumerable<T> per selezione a runtime e tramite Keyed Services per selezione dichiarativa via DI."
---

# Strategy pattern in C\#

Questa pagina mostra due implementazioni idiomatiche dello [Strategy pattern](../../../pattern-di-sviluppo/strategy.md) in ASP.NET Core, entrambe basate sulla Dependency Injection nativa.

---

## 1. Selezione a runtime con `IEnumerable<T>`

### Idea

Si registrano tutte le implementazioni di un'interfaccia strategy nel container. Il consumatore riceve un `IEnumerable<IStrategy>` e sceglie l'implementazione corretta a runtime, in base a un discriminante (enum, stringa, proprietà del messaggio).

### Interfaccia

```csharp
public interface INotificationSender
{
    string Channel { get; } // discriminante
    Task SendAsync(string recipient, string message, CancellationToken ct);
}
```

### Implementazioni

```csharp
public class EmailSender : INotificationSender
{
    public string Channel => "email";

    public async Task SendAsync(string recipient, string message, CancellationToken ct)
    {
        // invio via SMTP
    }
}

public class SmsSender : INotificationSender
{
    public string Channel => "sms";

    public async Task SendAsync(string recipient, string message, CancellationToken ct)
    {
        // invio via provider SMS
    }
}

public class PushSender : INotificationSender
{
    public string Channel => "push";

    public async Task SendAsync(string recipient, string message, CancellationToken ct)
    {
        // invio via Firebase / APNs
    }
}
```

### Registrazione

```csharp
builder.Services.AddScoped<INotificationSender, EmailSender>();
builder.Services.AddScoped<INotificationSender, SmsSender>();
builder.Services.AddScoped<INotificationSender, PushSender>();
```

Quando si registrano più implementazioni della stessa interfaccia, il container le espone tutte tramite `IEnumerable<INotificationSender>`.

### Consumo (context)

```csharp
public class NotificationUseCase
{
    private readonly IEnumerable<INotificationSender> _senders;

    public NotificationUseCase(IEnumerable<INotificationSender> senders)
    {
        _senders = senders;
    }

    public async Task NotifyAsync(string channel, string recipient, string message, CancellationToken ct)
    {
        var sender = _senders.FirstOrDefault(s => s.Channel == channel)
            ?? throw new ArgumentException($"Canale '{channel}' non supportato.");

        await sender.SendAsync(recipient, message, ct);
    }
}
```

### Vantaggi

- **Aperto all'estensione**: aggiungere un canale significa aggiungere una classe e una riga di registrazione.
- **Testabile**: si inietta una lista con un solo mock per testare il context in isolamento.
- **Nessuna dipendenza da attributi o convenzioni .NET specifiche**.

### Limiti

- La selezione avviene a runtime con una ricerca lineare. Per un numero elevato di strategy, si può costruire un `Dictionary` nel costruttore.
- Il compilatore non aiuta a verificare che tutte le chiavi siano coperte.

---

## 2. Selezione dichiarativa con Keyed Services (.NET 8+)

### Idea

Si sfruttano i keyed services introdotti in .NET 8 per associare ciascuna implementazione a una chiave (stringa o enum). Il container risolve direttamente l'implementazione corretta in base alla chiave, senza iterare.

### Interfaccia

La stessa dell'esempio precedente, ma il discriminante non è più necessario nell'interfaccia:

```csharp
public interface INotificationSender
{
    Task SendAsync(string recipient, string message, CancellationToken ct);
}
```

### Registrazione

```csharp
builder.Services.AddKeyedScoped<INotificationSender, EmailSender>("email");
builder.Services.AddKeyedScoped<INotificationSender, SmsSender>("sms");
builder.Services.AddKeyedScoped<INotificationSender, PushSender>("push");
```

### Consumo tramite attributo `[FromKeyedServices]`

Quando la chiave è nota a compile-time (es. un controller dedicato a un canale specifico):

```csharp
public class EmailController : ControllerBase
{
    private readonly INotificationSender _sender;

    public EmailController([FromKeyedServices("email")] INotificationSender sender)
    {
        _sender = sender;
    }
}
```

### Consumo tramite `IServiceProvider` (selezione a runtime)

Quando la chiave è determinata a runtime:

```csharp
public class NotificationUseCase
{
    private readonly IServiceProvider _provider;

    public NotificationUseCase(IServiceProvider provider)
    {
        _provider = provider;
    }

    public async Task NotifyAsync(string channel, string recipient, string message, CancellationToken ct)
    {
        var sender = _provider.GetRequiredKeyedService<INotificationSender>(channel);
        await sender.SendAsync(recipient, message, ct);
    }
}
```

### Vantaggi

- **Risoluzione O(1)** — il container indicizza per chiave internamente.
- **Interfaccia più pulita** — non serve un discriminante esposto dalla strategy.
- **Integrazione nativa** — nessun codice custom di selezione.

### Limiti

- Richiede .NET 8 o superiore.
- L'uso di `IServiceProvider` direttamente è un *service locator* — accettabile nello use case ma da non propagare ovunque.
- La chiave è una stringa: refusi non vengono rilevati a compile-time. Si può mitigare usando costanti o un enum con `.ToString()`.

---

## Quale approccio scegliere

| Criterio | `IEnumerable<T>` | Keyed Services |
|----------|-------------------|----------------|
| Versione .NET | Qualsiasi | .NET 8+ |
| Selezione | A runtime, logica nel context | Dichiarativa o a runtime via provider |
| Numero di strategy | Basso–medio (ricerca lineare) | Qualsiasi (lookup O(1)) |
| Interfaccia strategy | Include discriminante | Pulita, senza discriminante |
| Testabilità | Ottima (lista di mock) | Buona (mock del provider o test con container reale) |

In generale:

- Se il progetto è già su .NET 8+ e le chiavi sono note, i **keyed services** sono l'approccio più idiomatico.
- Se si vuole massima portabilità o il numero di strategy è piccolo, `IEnumerable<T>` è più semplice e trasparente.
- I due approcci non si escludono: si può usare `IEnumerable<T>` per scenari a runtime e keyed services per iniezioni statiche nello stesso progetto.
