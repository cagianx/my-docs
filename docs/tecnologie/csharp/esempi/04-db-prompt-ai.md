---
sidebar_position: 4
description: Modellazione su database dei prompt per funzionalità AI — catalogo provider e modelli, caso d'uso con system prompt e user prompt versionati, modello selezionabile.
---

# Prompt AI su database (EF)

Quando un'applicazione usa modelli linguistici per più funzionalità — riassumere un documento, classificare un ticket, estrarre dati da un testo — i prompt non vanno lasciati come stringhe sparse nel codice. Tenerli nel database permette di **cambiare prompt, parametri o modello senza ricompilare**, e soprattutto di sapere con esattezza *quale* prompt e *quale* modello hanno prodotto un certo output.

L'idea è separare tre cose che cambiano con ritmi diversi:

- **Cosa è disponibile** — il catalogo di `Provider` e `Modello`. Cambia raramente, lo governa chi gestisce l'infrastruttura.
- **A cosa serve** — il `CasoUso`, cioè la funzionalità AI. È la chiave logica stabile con cui il codice applicativo chiede un prompt.
- **Come si fa, oggi** — la `ConfigurazionePrompt`: system prompt, user prompt, modello scelto e parametri di inferenza. È la parte volatile, quindi **versionata**.

Il caso d'uso è referenziato dal codice e non cambia; la configurazione attiva sotto può evolvere — nuovo modello, prompt ritoccato — senza toccare l'applicazione e senza perdere lo storico.

Vale qui in pieno il principio di [modellazione](../../../processi/analisi-tecnica/03-modellazione.md): ogni comportamento dell'AI in produzione dev'essere **ricostruibile a posteriori**, quindi nulla si sovrascrive, tutto si versiona.

## Quando usarlo

Buoni candidati:

- app con **più funzionalità AI** che condividono provider e modelli
- prompt che vanno ritoccati da chi cura il prodotto, **senza passare da una release**
- requisito di **tracciabilità**: ricostruire quale prompt/modello ha generato un output

Cattivi candidati:

- un'unica chiamata AI marginale, con prompt fisso: una costante nel codice basta e avanza
- prompt che cambiano ad ogni richiesta in modo non riconducibile a un caso d'uso stabile

## Le entità

```csharp
// MyApp.Infrastructure/Ai/StatoConfigurazione.cs
public enum StatoConfigurazione
{
    Bozza = 0,
    Attiva = 1,
    Archiviata = 2
}
```

Il **catalogo**: quali provider e quali modelli sono utilizzabili. Niente cancellazioni fisiche — un modello dismesso resta referenziabile dallo storico, si marca solo come non più attivo.

```csharp
// MyApp.Infrastructure/Ai/Provider.cs
public class Provider
{
    public int Id { get; set; }

    // Chiave logica usata in configurazione: 'anthropic', 'openai', 'azure-openai'
    public string Codice { get; set; } = default!;
    public string Nome { get; set; } = default!;

    public bool Attivo { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<Modello> Modelli { get; set; } = new List<Modello>();
}
```

```csharp
// MyApp.Infrastructure/Ai/Modello.cs
public class Modello
{
    public int Id { get; set; }

    public int ProviderId { get; set; }
    public Provider Provider { get; set; } = default!;

    // Identificativo presso il provider: 'claude-opus-4-8', 'gpt-4o'
    public string Codice { get; set; } = default!;
    public string Nome { get; set; } = default!;

    public bool Attivo { get; set; }
    // Deprecation tracciata, non cancellazione: lo storico resta integro
    public DateOnly? DismessoAl { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
```

La **funzionalità AI**. Il `Codice` è la chiave stabile che il codice applicativo usa per chiedere il prompt («dammi la configurazione attiva di `riassunto-documento`»).

```csharp
// MyApp.Infrastructure/Ai/CasoUso.cs
public class CasoUso
{
    public int Id { get; set; }

    public string Codice { get; set; } = default!;   // 'riassunto-documento'
    public string Nome { get; set; } = default!;
    public string? Descrizione { get; set; }

    public bool Attivo { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<ConfigurazionePrompt> Configurazioni { get; set; }
        = new List<ConfigurazionePrompt>();
}
```

La **configurazione del prompt**, versionata. Tiene insieme i due prompt, il modello scelto e i parametri di inferenza. È l'entità centrale: di un caso d'uso ce ne possono essere molte versioni, ma una sola **attiva** alla volta.

```csharp
// MyApp.Infrastructure/Ai/ConfigurazionePrompt.cs
public class ConfigurazionePrompt
{
    public int Id { get; set; }

    public int CasoUsoId { get; set; }
    public CasoUso CasoUso { get; set; } = default!;

    // Modello selezionato per questa versione: punta a un Modello, quindi a un Provider
    public int ModelloId { get; set; }
    public Modello Modello { get; set; } = default!;

    public int Versione { get; set; }

    // System prompt: fissa il ruolo e i vincoli, lo governa chi cura il prodotto
    public string SystemPrompt { get; set; } = default!;

    // User prompt: template editabile, con segnaposto {{variabile}} riempiti a runtime
    public string UserPrompt { get; set; } = default!;

    // Parametri di inferenza come colonne esplicite, non come blob opaco:
    // il modello resta leggibile e interrogabile direttamente sul DB
    public ParametriInferenza Parametri { get; set; } = new();

    public StatoConfigurazione Stato { get; set; }

    public string CreatedBy { get; set; } = default!;
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<VariabilePrompt> Variabili { get; set; }
        = new List<VariabilePrompt>();
}
```

```csharp
// MyApp.Infrastructure/Ai/ParametriInferenza.cs
// Owned type: vive nella stessa tabella della configurazione.
// Nullable perché non tutti i provider espongono gli stessi parametri.
public class ParametriInferenza
{
    public decimal? Temperature { get; set; }
    public int? MaxToken { get; set; }
    public decimal? TopP { get; set; }
}
```

Le **variabili attese** dal template. Dichiararle esplicitamente serve a validare (il caso d'uso non parte se manca una variabile obbligatoria) e a documentare cosa il prompt si aspetta in ingresso.

```csharp
// MyApp.Infrastructure/Ai/VariabilePrompt.cs
public class VariabilePrompt
{
    public int Id { get; set; }

    public int ConfigurazioneId { get; set; }
    public ConfigurazionePrompt Configurazione { get; set; } = default!;

    public string Nome { get; set; } = default!;   // 'testo_documento'
    public bool Obbligatoria { get; set; }
    public string? ValoreDefault { get; set; }
    public string? Descrizione { get; set; }
}
```

## Configurazione EF

Il vincolo che conta — **una sola configurazione attiva per caso d'uso** — vive nel database, non nel codice applicativo, come indice univoco filtrato.

```csharp
// MyApp.Infrastructure/Ai/ConfigurazionePromptConfiguration.cs
public class ConfigurazionePromptConfiguration
    : IEntityTypeConfiguration<ConfigurazionePrompt>
{
    public void Configure(EntityTypeBuilder<ConfigurazionePrompt> builder)
    {
        builder.ToTable(nameof(ConfigurazionePrompt));
        builder.HasKey(x => x.Id);

        // Enum come stringa: la riga resta leggibile direttamente sul DB
        builder.Property(x => x.Stato)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x => x.SystemPrompt).IsRequired();
        builder.Property(x => x.UserPrompt).IsRequired();
        builder.Property(x => x.CreatedBy).HasMaxLength(200).IsRequired();

        // I parametri di inferenza come colonne della stessa tabella
        builder.OwnsOne(x => x.Parametri);

        // Numero di versione univoco nell'ambito del caso d'uso
        builder.HasIndex(x => new { x.CasoUsoId, x.Versione }).IsUnique();

        // Una sola versione ATTIVA per caso d'uso: indice univoco filtrato.
        // Filtro in sintassi SQL Server; con PostgreSQL: "Stato = 'Attiva'".
        builder.HasIndex(x => x.CasoUsoId)
            .HasFilter("[Stato] = 'Attiva'")
            .IsUnique();

        builder.HasOne(x => x.Modello)
            .WithMany()
            .HasForeignKey(x => x.ModelloId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.Variabili)
            .WithOne(x => x.Configurazione)
            .HasForeignKey(x => x.ConfigurazioneId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

Il catalogo si configura con i vincoli di unicità sulle chiavi logiche:

```csharp
public class ModelloConfiguration : IEntityTypeConfiguration<Modello>
{
    public void Configure(EntityTypeBuilder<Modello> builder)
    {
        builder.ToTable(nameof(Modello));
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Codice).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Nome).HasMaxLength(200).IsRequired();

        // Stesso codice modello unico per provider
        builder.HasIndex(x => new { x.ProviderId, x.Codice }).IsUnique();
    }
}
```

`Provider.Codice` e `CasoUso.Codice` ricevono allo stesso modo un indice univoco: sono le chiavi su cui il codice applicativo aggancia la configurazione.

## DbContext

```csharp
public class AppDbContext : DbContext
{
    public DbSet<Provider> Provider => Set<Provider>();
    public DbSet<Modello> Modelli => Set<Modello>();
    public DbSet<CasoUso> CasiUso => Set<CasoUso>();
    public DbSet<ConfigurazionePrompt> ConfigurazioniPrompt => Set<ConfigurazionePrompt>();
}
```

## Risolvere il prompt attivo

Il servizio prende il codice del caso d'uso, recupera la configurazione attiva, valida le variabili ricevute e produce i due prompt pronti per la chiamata al provider. La selezione del modello esce di qui già risolta (`Codice` del modello e del provider), così lo strato che parla con l'SDK del provider non conosce il database.

```csharp
// MyApp.Infrastructure/Ai/RisolutorePrompt.cs
public sealed class RisolutorePrompt
{
    private readonly AppDbContext _db;

    public RisolutorePrompt(AppDbContext db) => _db = db;

    public async Task<PromptRisolto> RisolviAsync(
        string codiceCasoUso,
        IReadOnlyDictionary<string, string> variabili,
        CancellationToken ct = default)
    {
        var config = await _db.ConfigurazioniPrompt
            .AsNoTracking()
            .Include(x => x.Modello).ThenInclude(m => m.Provider)
            .Include(x => x.Variabili)
            .SingleOrDefaultAsync(
                x => x.CasoUso.Codice == codiceCasoUso
                  && x.Stato == StatoConfigurazione.Attiva,
                ct)
            ?? throw new InvalidOperationException(
                $"Nessuna configurazione attiva per il caso d'uso '{codiceCasoUso}'.");

        var valori = ApplicaDefaultEValida(config.Variabili, variabili);

        return new PromptRisolto(
            ProviderCodice: config.Modello.Provider.Codice,
            ModelloCodice:  config.Modello.Codice,
            SystemPrompt:   config.SystemPrompt,
            UserPrompt:     Rendi(config.UserPrompt, valori),
            Parametri:      config.Parametri,
            ConfigurazioneId: config.Id);
    }

    private static Dictionary<string, string> ApplicaDefaultEValida(
        IEnumerable<VariabilePrompt> attese,
        IReadOnlyDictionary<string, string> ricevute)
    {
        var valori = new Dictionary<string, string>();
        foreach (var v in attese)
        {
            if (ricevute.TryGetValue(v.Nome, out var valore))
                valori[v.Nome] = valore;
            else if (v.ValoreDefault is not null)
                valori[v.Nome] = v.ValoreDefault;
            else if (v.Obbligatoria)
                throw new InvalidOperationException($"Variabile obbligatoria mancante: '{v.Nome}'.");
        }
        return valori;
    }

    // Sostituzione dei segnaposto {{nome}} con i valori
    private static string Rendi(string template, IReadOnlyDictionary<string, string> valori)
    {
        foreach (var (nome, valore) in valori)
            template = template.Replace($"{{{{{nome}}}}}", valore);
        return template;
    }
}

public sealed record PromptRisolto(
    string ProviderCodice,
    string ModelloCodice,
    string SystemPrompt,
    string UserPrompt,
    ParametriInferenza Parametri,
    int ConfigurazioneId);
```

`ConfigurazioneId` viaggia nel risultato apposta: registrandolo accanto all'output (in un log o in una tabella di esecuzioni) si chiude il cerchio della tracciabilità — da una risposta si risale alla versione esatta di prompt e modello che l'ha prodotta.

## Versionare una modifica

Cambiare un prompt o il modello **non è un `UPDATE`** sulla configurazione attiva. Si crea una nuova versione e si sposta lo stato:

1. si duplica la configurazione attiva in una nuova riga `Bozza` con `Versione` incrementata e le modifiche;
2. quando è pronta, in **un'unica transazione**, la vecchia attiva passa ad `Archiviata` e la bozza ad `Attiva`.

L'indice univoco filtrato garantisce che il passaggio non possa mai lasciare due versioni attive insieme. Lo storico resta tutto sul DB: nessuna versione passata viene persa.

## Considerazioni operative

- **Un modello per caso d'uso.** Il modello qui non prevede una catena di fallback fra provider. Se serve, si aggiunge una `Priorita` alla configurazione e si rilassa il vincolo «una sola attiva» in «una sola attiva per priorità».
- **Tracciare le esecuzioni.** Se l'utente finale può riscrivere a piacere lo user prompt e serve auditarlo (con input, output, token e costo), si introduce una tabella `EsecuzionePrompt` che referenzia `ConfigurazioneId` e registra il prompt effettivamente inviato. Vale la pena solo se c'è il caso d'uso: senza, è [debito strutturale](../../../processi/analisi-tecnica/03-modellazione.md).
- **Segreti fuori dal modello.** Le API key dei provider non stanno in queste tabelle: vivono nella [configurazione applicativa](../07-configuration.md). Qui si modella *quale* modello usare, non *come* autenticarsi.
- **Parametri espliciti.** Tenere `Temperature`, `MaxToken` e `TopP` come colonne — non come JSON opaco — mantiene il modello leggibile e interrogabile, in linea con il principio dei [dati duttili in lettura](../../../processi/analisi-tecnica/03-modellazione.md). Se un provider espone parametri molto eterogenei, si valuta un owned type dedicato per quel provider.

Per il quadro su come si imposta il lavoro con strumenti AI nel processo di sviluppo, vedi [uso con l'IA](../../../uso-con-ia.md).
