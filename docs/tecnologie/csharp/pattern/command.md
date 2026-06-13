---
sidebar_position: 7
sidebar_label: "Command in C#"
description: "Command in C#: implementazione con IUseCase nativa e con MediatR, scelta tra le due alternative e applicazione di pipeline behavior."
---

# Command in C\#

Il [Command](../../../pattern-di-sviluppo/command.md) in C# si esprime tipicamente in due modi: con il pattern `IUseCase` nativo della solution o con la libreria MediatR. Entrambi reificano l'operazione in un oggetto e separano il chiamante dall'esecutore.

---

## 1. Command con `IUseCase`

### Idea

Il pattern `IUseCase`, descritto in [struttura-soluzione/04-usecases](../struttura-soluzione/04-usecases.md), è già un'implementazione di Command: ogni caso d'uso è una classe che riceve l'input come parametro, orchestra il dominio e restituisce un `Result<T>`.

```csharp
public record RegisterCustomer(string Name, string VatId, string Email);

public class RegisterCustomerUseCase : IUseCase
{
    private readonly AppDbContext _db;
    private readonly INotificationSender _notifier;
    private readonly TimeProvider _clock;

    public RegisterCustomerUseCase(
        AppDbContext db, INotificationSender notifier, TimeProvider clock)
    {
        _db = db;
        _notifier = notifier;
        _clock = clock;
    }

    public async Task<Result<Guid>> HandleAsync(RegisterCustomer command, CancellationToken ct)
    {
        var existing = await _db.Customers
            .AnyAsync(c => c.VatId == command.VatId, ct);
        if (existing)
            return Result.Failure<Guid>(CustomerErrors.AlreadyExists);

        var customer = new Customer(Guid.NewGuid(), command.Name, command.VatId, command.Email, _clock.GetUtcNow());
        _db.Customers.Add(customer);
        await _db.SaveChangesAsync(ct);

        await _notifier.SendWelcomeAsync(customer.Email, ct);
        return Result.Success(customer.Id);
    }
}
```

### Chiamata da un controller

```csharp
[HttpPost]
public async Task<IActionResult> Register(
    [FromBody] RegisterCustomer command,
    [FromServices] RegisterCustomerUseCase useCase,
    CancellationToken ct)
{
    var result = await useCase.HandleAsync(command, ct);
    return result.ToActionResult();
}
```

Il controller non orchestra: riceve il command (dall'HTTP), invoca lo use case, mappa il risultato. Questa forma è descritta come default nella sezione su [UseCases](../struttura-soluzione/04-usecases.md).

---

## 2. Command con MediatR

### Idea

MediatR introduce un dispatcher esplicito (`ISender`) che individua l'handler giusto per il command e gli applica una pipeline di behavior comuni a tutti i command. Il chiamante perde la dipendenza diretta dallo use case.

```csharp
public record RegisterCustomer(string Name, string VatId, string Email) : IRequest<Result<Guid>>;

public class RegisterCustomerHandler : IRequestHandler<RegisterCustomer, Result<Guid>>
{
    private readonly AppDbContext _db;
    private readonly INotificationSender _notifier;
    private readonly TimeProvider _clock;

    public RegisterCustomerHandler(AppDbContext db, INotificationSender notifier, TimeProvider clock)
    {
        _db = db;
        _notifier = notifier;
        _clock = clock;
    }

    public async Task<Result<Guid>> Handle(RegisterCustomer command, CancellationToken ct)
    {
        // identica all'esempio precedente
    }
}
```

### Chiamata da un controller

```csharp
[HttpPost]
public async Task<IActionResult> Register(
    [FromBody] RegisterCustomer command,
    [FromServices] ISender sender,
    CancellationToken ct)
{
    var result = await sender.Send(command, ct);
    return result.ToActionResult();
}
```

Il controller ora dipende solo da `ISender`. Aggiungere un nuovo command non richiede di iniettare uno use case in più.

### Pipeline behavior

I behavior MediatR sono decorator applicati a tutti i command. Vedi [Chain of Responsibility, MediatR pipeline behavior](chain-of-responsibility.md#3-mediatr-pipeline-behavior) per implementazione e registrazione di logging e validation behavior.

---

## 3. Quale dei due

Coerentemente con il principio di [una sola forma consigliata](../../../regole/principi.md), la scelta va fatta a livello di solution e non mescolata.

| Criterio | `IUseCase` | MediatR |
|---|---|---|
| Dipendenze esplicite nel controller | Sì: ogni controller inietta gli use case che usa | No: si inietta solo `ISender` |
| Navigabilità nell'IDE | «Vai alla definizione» porta direttamente all'handler | Richiede di cercare l'handler dell'`IRequest` |
| Dipendenza esterna | Nessuna | Pacchetto MediatR |
| Comportamenti trasversali | Decorator manuali o filter MVC | Pipeline behavior, una sola registrazione |
| Verbosità per command «puntuali» | Bassa | Bassa |
| Verbosità con molti behavior trasversali | Alta (decorator manuali) | Bassa |

**Raccomandazione**:

- Per solution piccole o medie con pochi comportamenti trasversali, `IUseCase` è più diretto, più navigabile e non aggiunge dipendenze.
- Per solution dove serve applicare in modo uniforme logging, validazione, transazione, audit a *ogni* command, MediatR riduce il boilerplate.

Non mescolare le due forme nello stesso progetto.

---

## 4. Command e CQRS

Il pattern Command è la base lato scrittura di [CQRS](https://martinfowler.com/bliki/CQRS.html): le scritture passano per command (con esito esplicito), le letture per query (senza side effect). In questa solution la separazione è leggera:

- **Command** = `IUseCase` che modifica stato e chiama `SaveChangesAsync`.
- **Query** = `IUseCase` (o handler MediatR) che proietta dati con `IQueryable.Select` e non tocca lo stato.

Non serve un'infrastruttura CQRS separata: la separazione concettuale è sufficiente, l'infrastruttura DI è la stessa.

---

## 5. Anti-pattern

### Command anemico

```csharp
public record DoStuff(string Data);
```

Un nome generico non comunica nulla. Il command è parte del vocabolario del dominio: `RegisterCustomer`, `ShipOrder`, `RefundPayment`. Se non si riesce a dargli un nome di dominio, probabilmente è una query travestita o un'operazione non ancora ben definita.

### Logica nel command

Il command è un **dato**, non un servizio. Non ha metodi che eseguono lavoro, non ha dipendenze iniettate. È un DTO immutabile (idealmente un `record`).

### Esiti via eccezione

Un command che fallisce per regola di business deve restituire `Result.Failure`. Le eccezioni sono per errori imprevisti, non per esiti previsti, vedi [gestione errori](../../../regole/gestione-errori.md).
