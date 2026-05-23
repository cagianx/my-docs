---
sidebar_position: 2
sidebar_label: "Factory Method in C#"
description: "Factory Method in C# — implementazione con factory function, factory class registrata in DI e factory delegate via Func<T>."
---

# Factory Method in C\#

Questa pagina mostra le forme idiomatiche del [Factory Method](../../../pattern-di-sviluppo/factory-method.md) in ASP.NET Core, dalla più leggera alla più strutturata.

---

## 1. Factory function (metodo statico)

### Idea

Quando la costruzione ha logica non banale ma non richiede dipendenze, un metodo statico è la forma più semplice.

```csharp
public class Order
{
    public Guid Id { get; }
    public Guid CustomerId { get; }
    public IReadOnlyList<OrderLine> Lines { get; }
    public DateTimeOffset CreatedAt { get; }

    private Order(Guid id, Guid customerId, IReadOnlyList<OrderLine> lines, DateTimeOffset createdAt)
    {
        Id = id;
        CustomerId = customerId;
        Lines = lines;
        CreatedAt = createdAt;
    }

    public static Order CreateNew(Guid customerId, IEnumerable<OrderLine> lines, TimeProvider clock)
    {
        var materialized = lines.ToList();
        if (materialized.Count == 0)
            throw new ArgumentException("Un ordine richiede almeno una riga.", nameof(lines));

        return new Order(Guid.NewGuid(), customerId, materialized, clock.GetUtcNow());
    }
}
```

Il costruttore è privato: l'unico modo di ottenere un `Order` valido è passare dalla factory. Le invarianti (almeno una riga, ID generato, timestamp) sono garantite alla costruzione.

---

## 2. Factory class registrata in DI

### Idea

Quando la factory ha dipendenze proprie — configurazione, accesso al database, altri servizi — diventa una classe registrata nel container.

```csharp
public interface IInvoiceNumberFactory
{
    Task<string> NextAsync(Guid tenantId, CancellationToken ct);
}

public class InvoiceNumberFactory : IInvoiceNumberFactory
{
    private readonly AppDbContext _db;
    private readonly TimeProvider _clock;

    public InvoiceNumberFactory(AppDbContext db, TimeProvider clock)
    {
        _db = db;
        _clock = clock;
    }

    public async Task<string> NextAsync(Guid tenantId, CancellationToken ct)
    {
        var year = _clock.GetUtcNow().Year;
        var counter = await _db.InvoiceCounters
            .Where(c => c.TenantId == tenantId && c.Year == year)
            .FirstAsync(ct);

        counter.LastNumber++;
        return $"{year}/{counter.LastNumber:D6}";
    }
}
```

### Registrazione

```csharp
builder.Services.AddScoped<IInvoiceNumberFactory, InvoiceNumberFactory>();
```

Il consumatore inietta `IInvoiceNumberFactory` e ottiene un numero pronto, senza conoscere la logica di numerazione.

---

## 3. Factory delegate con `Func<T>`

### Idea

Quando la scelta dell'implementazione concreta dipende da un parametro noto solo a runtime — il payload di un messaggio, un tipo letto da configurazione, l'esito di una validazione — si registra una factory delegate che il container risolve.

### Scenario: parser scelto in base al MIME type del file

```csharp
public interface IDocumentParser
{
    string MimeType { get; }
    Task<ParsedDocument> ParseAsync(Stream content, CancellationToken ct);
}

public class PdfParser : IDocumentParser { public string MimeType => "application/pdf"; /* ... */ }
public class DocxParser : IDocumentParser { public string MimeType => "application/vnd.openxmlformats-officedocument.wordprocessingml.document"; /* ... */ }
public class CsvParser : IDocumentParser { public string MimeType => "text/csv"; /* ... */ }
```

### Factory dedicata

```csharp
public interface IDocumentParserFactory
{
    IDocumentParser For(string mimeType);
}

public class DocumentParserFactory : IDocumentParserFactory
{
    private readonly Dictionary<string, IDocumentParser> _parsers;

    public DocumentParserFactory(IEnumerable<IDocumentParser> parsers)
    {
        _parsers = parsers.ToDictionary(p => p.MimeType, StringComparer.OrdinalIgnoreCase);
    }

    public IDocumentParser For(string mimeType) =>
        _parsers.TryGetValue(mimeType, out var parser)
            ? parser
            : throw new NotSupportedException($"MIME type non supportato: {mimeType}");
}
```

### Registrazione

```csharp
builder.Services.AddScoped<IDocumentParser, PdfParser>();
builder.Services.AddScoped<IDocumentParser, DocxParser>();
builder.Services.AddScoped<IDocumentParser, CsvParser>();
builder.Services.AddScoped<IDocumentParserFactory, DocumentParserFactory>();
```

La factory costruisce il dizionario una sola volta per richiesta (scope), poi serve i parser in `O(1)`. Questo è esattamente il selettore di [Strategy](strategy.md), espresso come factory dedicata.

---

## Factory vs DI: quando una è meglio dell'altra

| Situazione | Forma consigliata |
|---|---|
| Una sola implementazione, parametri noti a compile-time | Iniettare direttamente l'interfaccia |
| Più implementazioni, scelta dichiarativa (chiave fissa) | [Keyed services](strategy.md#2-selezione-dichiarativa-con-keyed-services-net-8) |
| Più implementazioni, scelta dinamica da payload | Factory delegate (`Func<T>` o classe dedicata) |
| Costruzione con dipendenze, ma chiamata sporadica | Factory class registrata in DI |
| Oggetto di dominio con invarianti da proteggere | Factory statica sul tipo stesso, costruttore privato |

In generale: il container DI è la prima opzione. Si introduce una factory esplicita solo quando il container non è sufficiente — tipicamente perché la scelta dipende da dati che il container non conosce.

---

## Anti-pattern: factory inutili

Una factory che restituisce sempre `new ConcreteType()` senza logica aggiuntiva è solo indirezione. Va eliminata: il container fa già lo stesso lavoro, meglio.

Allo stesso modo, una "factory" il cui unico metodo accetta tutti i parametri del costruttore e li inoltra non sta costruendo nulla — sta solo aggiungendo un livello. Costruire direttamente è più chiaro.
