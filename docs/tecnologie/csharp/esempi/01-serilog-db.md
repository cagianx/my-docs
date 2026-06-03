---
sidebar_position: 1
description: Configurare Serilog per scrivere le eccezioni su database tramite un sink custom che usa Entity Framework, con una riga per ogni livello della catena di inner exception.
---

# Serilog su database (EF)

Serilog include diversi sink per database relazionali (es. `Serilog.Sinks.MSSqlServer`), ma questi scrivono direttamente via ADO.NET, bypassando Entity Framework. Quando si vuole usare EF — per stare dentro le convenzioni del progetto, gestire la connessione in modo uniforme o avere le migration — si scrive un sink custom.

Il sink salva solo i log di livello `Error` o superiore. Per ogni evento salva una riga in `LogEntry` e tante righe in `LogEntryException` quante le eccezioni nella catena (l'eccezione principale + ogni inner exception, in ordine di profondità). Questo permette di filtrare e aggregare per tipo di eccezione a qualunque livello della catena.

## Pacchetti

```bash
dotnet add package Serilog.AspNetCore
```

## Entità

```csharp
// MyApp.Infrastructure/Logging/LogEntry.cs
public class LogEntry
{
    public int Id { get; set; }
    public DateTimeOffset Timestamp { get; set; }
    public string Level { get; set; } = default!;
    public string Message { get; set; } = default!;

    // Classe che ha emesso il log (es. "MyApp.UseCases.CreaOrdine")
    public string? SourceContext { get; set; }

    // Proprietà strutturate aggiuntive serializzate come JSON
    public string? Properties { get; set; }

    public ICollection<LogEntryException> Exceptions { get; set; } = [];
}
```

```csharp
// MyApp.Infrastructure/Logging/LogEntryException.cs
public class LogEntryException
{
    public int Id { get; set; }
    public int LogEntryId { get; set; }

    // 0 = eccezione principale, 1 = prima inner exception, 2 = seconda, ecc.
    public int Depth { get; set; }

    public string ExceptionType { get; set; } = default!;
    public string Message { get; set; } = default!;
    public string? StackTrace { get; set; }
}
```

Una catena `InvalidOperationException → ArgumentNullException → DbException` produce tre righe con `Depth` 0, 1, 2.

## Configurazione EF

```csharp
// MyApp.Infrastructure/Logging/LogEntryConfiguration.cs
public class LogEntryConfiguration : IEntityTypeConfiguration<LogEntry>
{
    public void Configure(EntityTypeBuilder<LogEntry> builder)
    {
        builder.ToTable(nameof(LogEntry));
        builder.HasKey(e => e.Id);

        builder.Property(e => e.Level).HasMaxLength(20).IsRequired();
        builder.Property(e => e.Message).IsRequired();
        builder.Property(e => e.SourceContext).HasMaxLength(500);

        builder.HasMany(e => e.Exceptions)
            .WithOne()
            .HasForeignKey(ex => ex.LogEntryId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(e => e.Timestamp);
        builder.HasIndex(e => e.Level);
    }
}
```

```csharp
// MyApp.Infrastructure/Logging/LogEntryExceptionConfiguration.cs
public class LogEntryExceptionConfiguration : IEntityTypeConfiguration<LogEntryException>
{
    public void Configure(EntityTypeBuilder<LogEntryException> builder)
    {
        builder.ToTable(nameof(LogEntryException));
        builder.HasKey(e => e.Id);

        builder.Property(e => e.ExceptionType).HasMaxLength(500).IsRequired();
        builder.Property(e => e.Message).IsRequired();

        // Indice sul tipo: permette di cercare "quanti DbException abbiamo avuto?"
        builder.HasIndex(e => e.ExceptionType);
        builder.HasIndex(e => new { e.LogEntryId, e.Depth }).IsUnique();
    }
}
```

Aggiungere i `DbSet` al contesto:

```csharp
public class AppDbContext : DbContext
{
    public DbSet<LogEntry> LogEntries => Set<LogEntry>();
    public DbSet<LogEntryException> LogEntryExceptions => Set<LogEntryException>();
    // ... altri DbSet
}
```

## Sink custom

```csharp
// MyApp.Infrastructure/Logging/EfCoreSink.cs
using System.Text.Json;
using Serilog.Core;
using Serilog.Events;

public sealed class EfCoreSink : ILogEventSink
{
    private readonly IServiceScopeFactory _scopeFactory;

    public EfCoreSink(IServiceScopeFactory scopeFactory)
        => _scopeFactory = scopeFactory;

    public void Emit(LogEvent logEvent)
    {
        // Il sink non deve mai propagare eccezioni: un errore nel logging
        // non deve far crashare la request originale
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var entry = new LogEntry
            {
                Timestamp     = logEvent.Timestamp,
                Level         = logEvent.Level.ToString(),
                Message       = logEvent.RenderMessage(),
                SourceContext = logEvent.Properties.TryGetValue("SourceContext", out var sc)
                                ? sc.ToString().Trim('"') : null,
                Properties    = SerializeProperties(logEvent.Properties),
                Exceptions    = BuildExceptionChain(logEvent.Exception)
            };

            db.LogEntries.Add(entry);
            db.SaveChanges();
        }
        catch { /* intenzionalmente vuoto */ }
    }

    private static List<LogEntryException> BuildExceptionChain(Exception? ex)
    {
        var result = new List<LogEntryException>();
        var current = ex;
        var depth = 0;

        while (current is not null)
        {
            result.Add(new LogEntryException
            {
                Depth         = depth++,
                ExceptionType = current.GetType().FullName ?? current.GetType().Name,
                Message       = current.Message,
                StackTrace    = current.StackTrace
            });
            current = current.InnerException;
        }

        return result;
    }

    private static string? SerializeProperties(
        IReadOnlyDictionary<string, LogEventPropertyValue> properties)
    {
        if (properties.Count == 0) return null;

        var filtered = properties
            .Where(p => p.Key != "SourceContext")
            .ToDictionary(p => p.Key, p => p.Value.ToString());

        return filtered.Count > 0 ? JsonSerializer.Serialize(filtered) : null;
    }
}
```

EF salva `LogEntry` e tutte le `LogEntryException` in un'unica `SaveChanges`, quindi l'inserimento è atomico.

Il sink usa `IServiceScopeFactory` invece di `AppDbContext` direttamente perché il sink è singleton (costruito una volta sola), mentre `DbContext` è scoped. Creare uno scope per ogni evento garantisce un'istanza fresca del contesto per ogni salvataggio.

`Emit` è sincrono per rispettare il contratto di `ILogEventSink`. `SaveChanges()` blocca per il tempo della scrittura, ma Serilog gestisce i sink su thread separati quando configurato con buffering.

## Registrazione in Program.cs

```csharp
// MyApp.Api/Program.cs
builder.Host.UseSerilog((context, services, configuration) =>
    configuration
        .ReadFrom.Configuration(context.Configuration)   // console, file, seq, ecc.
        .ReadFrom.Services(services)
        .WriteTo.Sink(
            new EfCoreSink(services.GetRequiredService<IServiceScopeFactory>()),
            restrictedToMinimumLevel: Serilog.Events.LogEventLevel.Error));
```

L'overload `UseSerilog` con tre parametri riceve `IServiceProvider` già costruito, quindi `IServiceScopeFactory` è disponibile. Il sink EF si aggiunge sopra alla configurazione da `appsettings.json` — console e file continuano a ricevere tutti i livelli come configurato lì.

```json
// appsettings.json — invariato, il DB riceve solo Error+ via codice
{
  "Serilog": {
    "MinimumLevel": {
      "Default": "Information",
      "Override": {
        "Microsoft": "Warning",
        "Microsoft.EntityFrameworkCore": "Warning"
      }
    },
    "WriteTo": [
      { "Name": "Console" }
    ]
  }
}
```

## Migration

```bash
dotnet ef migrations add AddLogEntry \
    --project src/MyApp.Infrastructure \
    --startup-project src/MyApp.Api
```
