---
sidebar_position: 1
description: Configurare Serilog per scrivere le eccezioni su database tramite un sink custom che usa Entity Framework, con supporto alle inner exception.
---

# Serilog su database (EF)

Serilog include diversi sink per database relazionali (es. `Serilog.Sinks.MSSqlServer`), ma questi scrivono direttamente via ADO.NET, bypassando Entity Framework. Quando si vuole usare EF — per stare dentro le convenzioni del progetto, gestire la connessione in modo uniforme o avere le migration — si scrive un sink custom.

Il sink è minimale: salva solo i log di livello `Error` o superiore, che sono quelli con le eccezioni rilevanti. I log informativi e di warning rimangono su console o file.

## Pacchetti

```bash
dotnet add package Serilog.AspNetCore
```

`Serilog.AspNetCore` include già `Serilog` core e le API necessarie per il sink.

## Entità

```csharp
// MyApp.Infrastructure/Logging/LogEntry.cs
public class LogEntry
{
    public int Id { get; set; }
    public DateTimeOffset Timestamp { get; set; }
    public string Level { get; set; } = default!;
    public string Message { get; set; } = default!;

    // Tipo dell'eccezione di primo livello — utile per filtrare
    public string? ExceptionType { get; set; }

    // Catena completa: eccezione + tutte le inner exception + stack trace
    // Exception.ToString() include già tutto il chain in modo leggibile
    public string? Exception { get; set; }

    // Classe che ha emesso il log (es. "MyApp.UseCases.CreaOrdine")
    public string? SourceContext { get; set; }

    // Proprietà strutturate aggiuntive serializzate come JSON
    public string? Properties { get; set; }
}
```

La colonna `Exception` usa `Exception.ToString()` che in .NET produce la catena completa delle inner exception nel formato standard:

```
System.InvalidOperationException: Messaggio principale
 ---> System.ArgumentNullException: Parameter name: valore
   at MyApp.Services.ValidaOrdine.Execute() in ...
   --- End of inner exception stack trace ---
 at MyApp.UseCases.CreaOrdine.ExecuteAsync() in ...
```

Non serve nessuna colonna aggiuntiva per le inner exception: sono già incluse.

## Configurazione EF

```csharp
// MyApp.Infrastructure/Logging/LogEntryConfiguration.cs
public class LogEntryConfiguration : IEntityTypeConfiguration<LogEntry>
{
    public void Configure(EntityTypeBuilder<LogEntry> builder)
    {
        builder.ToTable(nameof(LogEntry));

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Level)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(e => e.Message)
            .IsRequired();

        builder.Property(e => nameof(e.ExceptionType))
            .HasMaxLength(500);

        // Indici per le query più comuni: per periodo e per gravità
        builder.HasIndex(e => e.Timestamp);
        builder.HasIndex(e => e.Level);
        builder.HasIndex(e => e.ExceptionType);
    }
}
```

Aggiungere `DbSet<LogEntry>` al contesto:

```csharp
// MyApp.Infrastructure/AppDbContext.cs
public class AppDbContext : DbContext
{
    public DbSet<LogEntry> LogEntries => Set<LogEntry>();
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

            db.LogEntries.Add(new LogEntry
            {
                Timestamp     = logEvent.Timestamp,
                Level         = logEvent.Level.ToString(),
                Message       = logEvent.RenderMessage(),
                ExceptionType = logEvent.Exception?.GetType().FullName,
                Exception     = logEvent.Exception?.ToString(),
                SourceContext = logEvent.Properties.TryGetValue("SourceContext", out var sc)
                                ? sc.ToString().Trim('"') : null,
                Properties    = SerializeProperties(logEvent.Properties)
            });

            db.SaveChanges();
        }
        catch { /* intenzionalmente vuoto */ }
    }

    private static string? SerializeProperties(
        IReadOnlyDictionary<string, LogEventPropertyValue> properties)
    {
        if (properties.Count == 0) return null;

        // Esclude SourceContext che è già salvato nella colonna dedicata
        var filtered = properties
            .Where(p => p.Key != "SourceContext")
            .ToDictionary(p => p.Key, p => p.Value.ToString());

        return filtered.Count > 0 ? JsonSerializer.Serialize(filtered) : null;
    }
}
```

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
