---
sidebar_position: 1
description: Setup pratico di Entity Framework Core — DbContext, registrazione, configurazione e workflow delle migration.
---

# Code First — Setup e migration

La filosofia Code First e le motivazioni per adottarla sono descritte in [`regole/entity-framework`](../../../regole/entity-framework.md). Questa pagina copre la parte pratica: come configurare il progetto, registrare il contesto e gestire le migration.

## DbContext

Il `DbContext` rappresenta la sessione con il database. Eredita da `DbContext` e dichiara una proprietà `DbSet<T>` per ogni entità radice del modello.

```csharp
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Ordine> Ordini => Set<Ordine>();
    public DbSet<Cliente> Clienti => Set<Cliente>();
    public DbSet<Prodotto> Prodotti => Set<Prodotto>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Applica tutte le IEntityTypeConfiguration<T> presenti nell'assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
```

`ApplyConfigurationsFromAssembly` rileva automaticamente tutte le classi `IEntityTypeConfiguration<T>` nell'assembly, evitando di registrarle manualmente una per una.

## Registrazione in Program.cs

```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));
```

Con `AddDbContext` il contesto è registrato come **scoped**: una nuova istanza per ogni richiesta HTTP. Questo garantisce che le modifiche tracciate da una richiesta non interferiscano con quelle di un'altra.

### Connection string

```json
// appsettings.json
{
  "ConnectionStrings": {
    "Default": "Host=localhost;Database=myapp;Username=myapp;Password=secret"
  }
}
```

In produzione la connection string si passa come variabile d'ambiente (`ConnectionStrings__Default`) o tramite un secret manager. Non si mettono credenziali nei file di configurazione versionati. Vedi [`regole/configurazione`](../../../regole/configurazione.md).

## IEntityTypeConfiguration\<T\>

La configurazione EF di ogni entità va in una classe dedicata, non con Data Annotations sull'entità stessa:

```csharp
public class OrdineConfiguration : IEntityTypeConfiguration<Ordine>
{
    public void Configure(EntityTypeBuilder<Ordine> builder)
    {
        builder.ToTable("ordini");

        builder.HasKey(o => o.Id);

        builder.Property(o => o.Numero)
            .IsRequired()
            .HasMaxLength(20);

        builder.HasIndex(o => o.Numero)
            .IsUnique();

        builder.Property(o => o.DataCreazione)
            .HasDefaultValueSql("now()");

        builder.HasOne(o => o.Cliente)
            .WithMany(c => c.Ordini)
            .HasForeignKey(o => o.ClienteId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
```

## Workflow delle migration

```bash
# Aggiungere una migration (dalla root del progetto infrastruttura)
dotnet ef migrations add NomeDescrittivoDelCambiamento \
    --project src/MyApp.Infrastructure \
    --startup-project src/MyApp.Api

# Applicare le migration al database
dotnet ef database update \
    --project src/MyApp.Infrastructure \
    --startup-project src/MyApp.Api

# Generare lo script SQL (utile per review o applicazione manuale in produzione)
dotnet ef migrations script \
    --idempotent \
    --output migration.sql
```

Il nome della migration è descrittivo: `AddOrdineTable`, `AddIndirizzoACliente`, `RinominaStatoOrdine`. Mai `Update1`, `Fix`, `Migration20240315`.

### Applicazione allo startup

Per ambienti semplici o interni, si possono applicare le migration automaticamente all'avvio:

```csharp
// Program.cs
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}
```

Per ambienti di produzione con tabelle grandi o migration complesse, si preferisce lo script SQL applicato manualmente prima del deploy. Vedi [`regole/entity-framework`](../../../regole/entity-framework.md#migration-come-storia-del-dominio) per la policy completa.
