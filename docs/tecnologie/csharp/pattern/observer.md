---
sidebar_position: 8
sidebar_label: "Observer / Pub-Sub in C#"
description: "Observer / Pub-Sub in C#: MediatR INotification per eventi in-process, MassTransit per eventi cross-process e considerazioni su idempotenza e ordinamento."
---

# Observer / Pub-Sub in C\#

L'[Observer / Pub-Sub](../../../pattern-di-sviluppo/observer.md) ha due incarnazioni distinte in C#: gli eventi **in-process** (più semplici, sincroni o leggermente differiti) e quelli **cross-process** (asincroni, persistenti, attraverso un broker). Questa pagina copre entrambi.

---

## 1. Eventi in-process con MediatR Notifications

### Scenario

Quando un ordine viene confermato, devono accadere più cose: si manda una mail al cliente, si emette un audit log, si aggiorna una proiezione di reporting. Sono reazioni indipendenti, tutte all'interno dello stesso processo.

### Definizione dell'evento

```csharp
public record OrderConfirmed(
    Guid OrderId,
    Guid CustomerId,
    decimal TotalAmount,
    DateTimeOffset OccurredAt) : INotification;
```

L'evento è un `record` immutabile. Il nome è al passato.

### Consumatori

```csharp
public class SendOrderConfirmationEmail : INotificationHandler<OrderConfirmed>
{
    private readonly INotificationSender _sender;

    public SendOrderConfirmationEmail(INotificationSender sender) => _sender = sender;

    public Task Handle(OrderConfirmed e, CancellationToken ct) =>
        _sender.SendOrderConfirmationAsync(e.CustomerId, e.OrderId, ct);
}

public class WriteOrderAuditLog : INotificationHandler<OrderConfirmed>
{
    private readonly IAuditLog _audit;

    public WriteOrderAuditLog(IAuditLog audit) => _audit = audit;

    public Task Handle(OrderConfirmed e, CancellationToken ct) =>
        _audit.RecordAsync("order.confirmed", e, ct);
}
```

Ogni consumatore è una classe indipendente. Aggiungerne uno significa aggiungere una classe, senza toccare il produttore.

### Pubblicazione

```csharp
public class ConfirmOrderUseCase : IUseCase
{
    private readonly AppDbContext _db;
    private readonly IPublisher _publisher;
    private readonly TimeProvider _clock;

    public async Task<Result> HandleAsync(ConfirmOrder command, CancellationToken ct)
    {
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == command.OrderId, ct);
        if (order is null) return Result.Failure(OrderErrors.NotFound);

        order.Confirm(_clock.GetUtcNow());
        await _db.SaveChangesAsync(ct);

        await _publisher.Publish(
            new OrderConfirmed(order.Id, order.CustomerId, order.TotalAmount, _clock.GetUtcNow()),
            ct);

        return Result.Success();
    }
}
```

### Default di MediatR: esecuzione sequenziale

`IPublisher.Publish` invoca **tutti** gli handler in sequenza, sullo stesso thread del produttore. Un'eccezione in un handler interrompe la catena: i successivi non vengono invocati.

Per cambiare strategia (es. continuare anche su errore, eseguire in parallelo) si registra una `INotificationPublisher` custom:

```csharp
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssemblyContaining<Program>();
    cfg.NotificationPublisher = new TaskWhenAllPublisher();
});
```

### Limiti delle notification in-process

- **Stesso processo**: se l'istanza muore prima che gli handler abbiano completato, il lavoro è perso.
- **Stessa transazione DB**: se il publisher è dentro un caso d'uso, gli handler vedono lo stato della transazione corrente. Va deciso esplicitamente se pubblicare **prima** o **dopo** `SaveChangesAsync`.

Il default consigliato è pubblicare **dopo** `SaveChangesAsync`: l'evento descrive un fatto già avvenuto e i consumatori operano su uno stato persistito.

---

## 2. Eventi cross-process con MassTransit

### Scenario

Quando i consumatori sono in servizi diversi (o devono sopravvivere ai riavvii, o vanno scalati orizzontalmente) l'in-process non basta. Si pubblica su un broker (RabbitMQ, Azure Service Bus, Amazon SQS) e i consumatori leggono dalla coda.

### Definizione del messaggio (contratto condiviso)

```csharp
// In un assembly condiviso tra produttore e consumatori
public record OrderConfirmed(
    Guid OrderId,
    Guid CustomerId,
    decimal TotalAmount,
    DateTimeOffset OccurredAt);
```

Niente `INotification`: il contratto è un POCO/`record` puro. La libreria di trasporto è invisibile.

### Configurazione MassTransit

```csharp
builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<SendOrderConfirmationEmail>();
    x.AddConsumer<UpdateReportingProjection>();

    x.UsingRabbitMq((ctx, cfg) =>
    {
        cfg.Host(builder.Configuration["RabbitMq:Host"]);
        cfg.ConfigureEndpoints(ctx);
    });
});
```

### Consumatore MassTransit

```csharp
public class SendOrderConfirmationEmail : IConsumer<OrderConfirmed>
{
    private readonly INotificationSender _sender;

    public SendOrderConfirmationEmail(INotificationSender sender) => _sender = sender;

    public Task Consume(ConsumeContext<OrderConfirmed> context) =>
        _sender.SendOrderConfirmationAsync(
            context.Message.CustomerId,
            context.Message.OrderId,
            context.CancellationToken);
}
```

### Pubblicazione

```csharp
public class ConfirmOrderUseCase : IUseCase
{
    private readonly AppDbContext _db;
    private readonly IPublishEndpoint _publisher;

    public async Task<Result> HandleAsync(ConfirmOrder command, CancellationToken ct)
    {
        // ... logica di dominio + SaveChangesAsync

        await _publisher.Publish(
            new OrderConfirmed(order.Id, order.CustomerId, order.TotalAmount, DateTimeOffset.UtcNow),
            ct);

        return Result.Success();
    }
}
```

### Outbox pattern

C'è un problema sottile: `SaveChangesAsync` e `Publish` non sono in transazione comune. Se il processo muore tra i due, l'ordine risulta confermato ma l'evento non è stato pubblicato.

La soluzione è il **transactional outbox**: l'evento viene scritto nella stessa transazione DB del `SaveChangesAsync`, in una tabella di outbox; un processo separato legge la outbox e pubblica al broker. MassTransit lo supporta nativamente:

```csharp
x.AddEntityFrameworkOutbox<AppDbContext>(o =>
{
    o.UsePostgres();
    o.UseBusOutbox();
});
```

Per ogni sistema che pubblica eventi critici cross-process, l'outbox non è opzionale.

---

## 3. Implicazioni operative

| Aspetto | In-process (MediatR) | Cross-process (MassTransit) |
|---|---|---|
| Consegna | Sincrona, *at-most-once* | Asincrona, *at-least-once* |
| Durabilità | No | Sì (broker + outbox) |
| Idempotenza richiesta? | Solo per evitare doppia esecuzione applicativa | Obbligatoria: i messaggi possono arrivare più volte |
| Ordinamento garantito? | Sì (sequenziale per default) | Solo per partizione/coda specifica |
| Cosa fare in caso di errore consumatore | Eccezione → l'esito dipende dalla strategia del publisher | Retry, dead letter queue, alert |
| Cambio di contratto (evento) | Compile-time | Va versionato esplicitamente |

### Idempotenza

Un consumatore cross-process **deve** essere idempotente. La forma più comune è registrare gli ID dei messaggi processati e ignorare i duplicati:

```csharp
public async Task Consume(ConsumeContext<OrderConfirmed> context)
{
    var alreadyProcessed = await _db.ProcessedEvents
        .AnyAsync(e => e.MessageId == context.MessageId, context.CancellationToken);
    if (alreadyProcessed) return;

    await DoTheWorkAsync(context.Message, context.CancellationToken);

    _db.ProcessedEvents.Add(new ProcessedEvent(context.MessageId!.Value, DateTimeOffset.UtcNow));
    await _db.SaveChangesAsync(context.CancellationToken);
}
```

---

## 4. Quale forma scegliere

| Situazione | Forma |
|---|---|
| Reazioni interne al processo, non critiche se perse | MediatR `INotification` |
| Reazioni interne ma critiche → outbox + dispatcher locale | MediatR + outbox, oppure MassTransit con trasporto in-memory |
| Più servizi devono reagire, anche dopo riavvio | MassTransit + broker + outbox |
| Eventi rilasciati esternamente come contratto pubblico | Broker, contratto versionato, schema registry se possibile |

Non promuovere prematuramente da in-process a broker: introduce complessità operativa (broker da mantenere, schema da versionare, idempotenza ovunque). Si fa il salto quando la durabilità o il disaccoppiamento di processo sono effettivamente richiesti.
