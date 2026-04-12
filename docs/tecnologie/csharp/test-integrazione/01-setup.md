---
sidebar_position: 1
description: Test di integrazione in .NET con NUnit, database PostgreSQL usa e getta, classe base e FluentAssertions.
---

# Setup — database usa e getta

## Perché test di integrazione

I test unitari verificano la logica isolata; i test di integrazione verificano che la logica funzioni con il database reale. Sono quelli che trovano i problemi che contano: query N+1, constraint violati, migration incomplete, comportamenti LINQ non traducibili in SQL.

Il database usato nei test è **PostgreSQL**, lo stesso motore di produzione. SQLite in-memory è più veloce ma non si comporta come PostgreSQL su tipi, constraint, case sensitivity e molte funzioni SQL.

## Pattern: classe base con database usa e getta

Ogni suite di test (`[TestFixture]`) riceve un database PostgreSQL dedicato, creato all'inizio e distrutto alla fine. I dati vengono puliti tra un test e l'altro, ma il database non viene ricreato ogni volta — le migration girano una volta sola per fixture.

```
[OneTimeSetUp]   → crea il database, applica le migration
[SetUp]          → pulisce i dati tra un test e l'altro
test A           → chiama la logica, verifica il risultato
test B           → chiama la logica, verifica il risultato
[OneTimeTearDown]→ elimina il database
```

## Classe base

```csharp
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NUnit.Framework;
using Npgsql;

[TestFixture]
public abstract class IntegrationTestBase
{
    private string _dbName = null!;
    private string _connectionString = null!;

    protected AppDbContext Db { get; private set; } = null!;

    // Sovrascrivere per aggiungere seed data specifico della suite
    protected virtual async Task SeedAsync(AppDbContext db) => await Task.CompletedTask;

    [OneTimeSetUp]
    public async Task CreateDatabase()
    {
        _dbName = $"test_{Guid.NewGuid():N}";
        var masterCs = TestConfiguration.MasterConnectionString; // es. "Host=localhost;Username=postgres;Password=secret"
        _connectionString = $"{masterCs};Database={_dbName}";

        // Crea il database
        await using var conn = new NpgsqlConnection($"{masterCs};Database=postgres");
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"CREATE DATABASE \"{_dbName}\"";
        await cmd.ExecuteNonQueryAsync();

        // Applica le migration
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(_connectionString)
            .Options;
        Db = new AppDbContext(options);
        await Db.Database.MigrateAsync();

        await SeedAsync(Db);
    }

    [SetUp]
    public async Task ResetData()
    {
        // Elimina i dati rispettando l'ordine dei vincoli di FK
        // L'ordine dipende dal modello — le tabelle figlie si svuotano prima delle parent
        await Db.Database.ExecuteSqlRawAsync("""
            DELETE FROM righe_ordine;
            DELETE FROM ordini;
            DELETE FROM prodotti;
            DELETE FROM clienti;
            """);

        await SeedAsync(Db);
    }

    [OneTimeTearDown]
    public async Task DropDatabase()
    {
        await Db.DisposeAsync();

        var masterCs = TestConfiguration.MasterConnectionString;
        await using var conn = new NpgsqlConnection($"{masterCs};Database=postgres");
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        // Forza la disconnessione di eventuali connessioni aperte prima di droppare
        cmd.CommandText = $"""
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = '{_dbName}' AND pid <> pg_backend_pid();
            DROP DATABASE "{_dbName}";
            """;
        await cmd.ExecuteNonQueryAsync();
    }
}
```

La connection string del master si legge da una configurazione dedicata ai test (variabile d'ambiente o `appsettings.Test.json`, non commissionata):

```csharp
public static class TestConfiguration
{
    public static string MasterConnectionString =>
        Environment.GetEnvironmentVariable("TEST_DB_CONNECTION")
        ?? "Host=localhost;Username=postgres;Password=secret";
}
```

## Esempio di test

```csharp
[TestFixture]
public class CreaOrdineTests : IntegrationTestBase
{
    protected override async Task SeedAsync(AppDbContext db)
    {
        db.Clienti.Add(new Cliente { Id = 1, Nome = "Acme Srl", Email = "acme@example.com" });
        await db.SaveChangesAsync();
    }

    [Test]
    public async Task Esegui_con_dati_validi_crea_ordine()
    {
        // Arrange
        var useCase = new CreaOrdine(Db);
        var command = new CreaOrdineCommand(ClienteId: 1, Importo: 250.00m);

        // Act
        var result = await useCase.ExecuteAsync(command);

        // Assert
        result.IsSuccess.Should().BeTrue();

        var ordine = await Db.Ordini.SingleAsync();
        ordine.ClienteId.Should().Be(1);
        ordine.Importo.Should().Be(250.00m);
        ordine.Stato.Should().Be(StatoOrdine.InAttesa);
    }

    [Test]
    public async Task Esegui_con_cliente_inesistente_fallisce()
    {
        var useCase = new CreaOrdine(Db);
        var command = new CreaOrdineCommand(ClienteId: 999, Importo: 100m);

        var result = await useCase.ExecuteAsync(command);

        result.IsSuccess.Should().BeFalse();
        result.Error.Should().Be("Cliente non trovato.");
    }
}
```

I test chiamano direttamente il use case con il `DbContext` reale. Nessun mock. L'obiettivo è verificare che la logica funzioni con PostgreSQL, non che "il metodo è stato chiamato".

## FluentAssertions

FluentAssertions rende le asserzioni leggibili e i messaggi di errore descrittivi:

```csharp
// Valori semplici
result.IsSuccess.Should().BeTrue();
ordine.Stato.Should().Be(StatoOrdine.Confermato);
ordine.DataCreazione.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));

// Collezioni
ordine.Righe.Should().HaveCount(3);
ordine.Righe.Should().AllSatisfy(r => r.Importo.Should().BeGreaterThan(0));
ordine.Righe.Select(r => r.ProdottoId).Should().BeEquivalentTo([1, 2, 3]);

// Eccezioni
var act = async () => await useCase.ExecuteAsync(commandNonValido);
await act.Should().ThrowAsync<InvalidOperationException>()
    .WithMessage("*importo*");

// Oggetti (confronto per valore)
risposta.Should().BeEquivalentTo(atteso, options => options.Excluding(x => x.Id));
```

## NUnit e parallelismo

I test di integrazione non devono girare in parallelo sulla stessa suite: condividerebbero il database e interferirebbero l'uno con l'altro. Il default di NUnit è esecuzione sequenziale all'interno della stessa fixture, che è il comportamento corretto.

Fixture diverse (classi diverse che estendono `IntegrationTestBase`) possono girare in parallelo perché ciascuna ha il proprio database dedicato.

```csharp
// Per abilitare il parallelismo tra fixture (ogni fixture ha il suo DB)
[assembly: Parallelizable(ParallelScope.Fixtures)]
```
