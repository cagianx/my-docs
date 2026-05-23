---
sidebar_position: 3
sidebar_label: "Builder in C#"
description: "Builder in C# — builder fluente con record immutabili, step builder con tipi, e test data builder per scenari di test."
---

# Builder in C\#

Questa pagina mostra le forme idiomatiche del [Builder](../../../pattern-di-sviluppo/builder.md) in C#, partendo dal caso più semplice fino allo step builder type-safe.

---

## 1. Object initializer e `record` — quando il builder non serve

Per oggetti con molti campi opzionali, C# offre due meccanismi nativi che spesso rendono superfluo un builder dedicato:

### Object initializer

```csharp
public class HttpRequestSettings
{
    public required Uri BaseAddress { get; init; }
    public TimeSpan Timeout { get; init; } = TimeSpan.FromSeconds(30);
    public int MaxRetries { get; init; } = 3;
    public bool EnableCompression { get; init; } = true;
}

var settings = new HttpRequestSettings
{
    BaseAddress = new Uri("https://api.example.com"),
    Timeout = TimeSpan.FromSeconds(10),
};
```

### Record con `with`

```csharp
public record SearchCriteria(string Query)
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
    public string? SortBy { get; init; }
}

var basic = new SearchCriteria("docusaurus");
var paged = basic with { Page = 2, PageSize = 50 };
```

Si introduce un builder dedicato solo quando questi meccanismi non bastano: validazioni cross-field al termine, sequenze obbligatorie di chiamate, costruzione progressiva con dipendenze esterne.

---

## 2. Fluent builder

### Scenario

Si costruisce una query complessa, dove certe operazioni sono opzionali e l'ordine di chiamata non conta.

```csharp
public class ReportQuery
{
    public DateOnly From { get; }
    public DateOnly To { get; }
    public IReadOnlyList<Guid> CustomerIds { get; }
    public IReadOnlyList<string> Categories { get; }
    public bool IncludeRefunds { get; }

    internal ReportQuery(
        DateOnly from, DateOnly to,
        IReadOnlyList<Guid> customers, IReadOnlyList<string> categories,
        bool includeRefunds)
    {
        From = from;
        To = to;
        CustomerIds = customers;
        Categories = categories;
        IncludeRefunds = includeRefunds;
    }

    public static ReportQueryBuilder Between(DateOnly from, DateOnly to) =>
        new(from, to);
}

public class ReportQueryBuilder
{
    private readonly DateOnly _from;
    private readonly DateOnly _to;
    private readonly List<Guid> _customers = new();
    private readonly List<string> _categories = new();
    private bool _includeRefunds;

    internal ReportQueryBuilder(DateOnly from, DateOnly to)
    {
        if (from > to)
            throw new ArgumentException("Intervallo non valido: from > to.");
        _from = from;
        _to = to;
    }

    public ReportQueryBuilder ForCustomers(params Guid[] ids)
    {
        _customers.AddRange(ids);
        return this;
    }

    public ReportQueryBuilder InCategories(params string[] categories)
    {
        _categories.AddRange(categories);
        return this;
    }

    public ReportQueryBuilder WithRefunds()
    {
        _includeRefunds = true;
        return this;
    }

    public ReportQuery Build() =>
        new(_from, _to, _customers, _categories, _includeRefunds);
}
```

### Uso

```csharp
var query = ReportQuery
    .Between(new DateOnly(2026, 1, 1), new DateOnly(2026, 3, 31))
    .ForCustomers(customerA, customerB)
    .InCategories("retail", "wholesale")
    .WithRefunds()
    .Build();
```

Il costruttore di `ReportQuery` è `internal`: il builder è l'unica strada. Le validazioni avvengono in `Between` (obbligatorie all'avvio) e in `Build` (cross-field, se necessarie).

---

## 3. Step builder (sequenza obbligatoria)

### Idea

Quando esiste un ordine logico di chiamate — alcuni passi sono obbligatori e devono precedere altri — si può forzare la sequenza a compile-time facendo tornare a ogni step un'**interfaccia diversa** che espone solo i passi consentiti successivi.

```csharp
public interface IRecipientStep
{
    ISubjectStep To(string recipient);
}

public interface ISubjectStep
{
    IBodyStep WithSubject(string subject);
}

public interface IBodyStep
{
    IOptionsStep WithBody(string body);
}

public interface IOptionsStep
{
    IOptionsStep Attach(string fileName, byte[] content);
    IOptionsStep WithPriority(EmailPriority priority);
    Email Build();
}

public class EmailBuilder : IRecipientStep, ISubjectStep, IBodyStep, IOptionsStep
{
    private string _to = null!;
    private string _subject = null!;
    private string _body = null!;
    private readonly List<Attachment> _attachments = new();
    private EmailPriority _priority = EmailPriority.Normal;

    public static IRecipientStep Compose() => new EmailBuilder();

    public ISubjectStep To(string recipient) { _to = recipient; return this; }
    public IBodyStep WithSubject(string subject) { _subject = subject; return this; }
    public IOptionsStep WithBody(string body) { _body = body; return this; }
    public IOptionsStep Attach(string fileName, byte[] content)
    {
        _attachments.Add(new Attachment(fileName, content));
        return this;
    }
    public IOptionsStep WithPriority(EmailPriority priority) { _priority = priority; return this; }
    public Email Build() => new(_to, _subject, _body, _attachments, _priority);
}
```

### Uso

```csharp
var email = EmailBuilder.Compose()
    .To("user@example.com")
    .WithSubject("Conferma ordine")
    .WithBody("Grazie per il tuo ordine.")
    .Attach("ricevuta.pdf", pdfBytes)
    .Build();
```

Il compilatore non permette di chiamare `Build()` prima di aver impostato destinatario, oggetto e corpo: dopo `Compose()` l'unico metodo disponibile è `To`, e così via. È la forma più sicura ma anche la più verbosa: vale la pena solo quando l'ordine obbligatorio è davvero parte del contratto.

---

## 4. Test data builder

### Idea

Nei test si costruiscono entità o DTO ripetutamente, con piccole variazioni. Un builder con default sensati riduce drasticamente il rumore.

```csharp
public class OrderBuilder
{
    private Guid _id = Guid.NewGuid();
    private Guid _customerId = Guid.NewGuid();
    private List<OrderLine> _lines = new() { new OrderLine("SKU-1", 1, 10m) };
    private OrderStatus _status = OrderStatus.Pending;

    public OrderBuilder WithId(Guid id) { _id = id; return this; }
    public OrderBuilder ForCustomer(Guid id) { _customerId = id; return this; }
    public OrderBuilder WithLine(string sku, int qty, decimal price)
    {
        _lines.Add(new OrderLine(sku, qty, price));
        return this;
    }
    public OrderBuilder Empty() { _lines.Clear(); return this; }
    public OrderBuilder Shipped() { _status = OrderStatus.Shipped; return this; }

    public Order Build() => new(_id, _customerId, _lines, _status);

    public static implicit operator Order(OrderBuilder b) => b.Build();
}
```

### Uso nei test

```csharp
[Test]
public async Task Refund_OnShippedOrder_Succeeds()
{
    Order order = new OrderBuilder().Shipped().WithLine("SKU-9", 2, 50m);

    var result = await _useCase.RefundAsync(order.Id, CancellationToken.None);

    result.IsSuccess.Should().BeTrue();
}
```

L'operatore di conversione implicita evita il `.Build()` finale nei casi in cui il test non lo richiede esplicitamente. Va usato con moderazione: nei test complessi, il `.Build()` esplicito è più leggibile.

---

## Quale forma scegliere

| Caso | Forma consigliata |
|---|---|
| Pochi campi, niente invarianti | Object initializer su classe / record |
| Variazioni leggere su un oggetto immutabile | `record` + `with` |
| Validazioni cross-field, costruttore protetto | Fluent builder |
| Ordine di chiamate obbligatorio da garantire a compile-time | Step builder |
| Setup di test ripetitivo | Test data builder con default sensati |

Coerentemente con il principio di [una sola forma consigliata per ogni cosa](../../../regole/principi.md), si introduce un builder dedicato solo quando i meccanismi nativi del linguaggio (object initializer, record, parametri opzionali) non bastano.
