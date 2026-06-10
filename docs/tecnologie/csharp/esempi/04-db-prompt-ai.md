---
sidebar_position: 4
description: Modellazione su database dei prompt per funzionalità AI — provider di default con override per caso d'uso, modello opzionale, system e user prompt versionati.
---

# Prompt AI su database (EF)

Quando un'applicazione usa modelli linguistici per più funzionalità — riassumere un documento, classificare un ticket, estrarre dati da un testo — i prompt non vanno lasciati come stringhe sparse nel codice. Tenerli nel database permette di **cambiare prompt, parametri o modello senza ricompilare**, e soprattutto di sapere con esattezza *quale* prompt e *quale* modello hanno prodotto un certo output.

L'idea è separare tre cose che cambiano con ritmi diversi:

- **Cosa è disponibile** — il catalogo di `Provider` e `Modello`. Cambia raramente, lo governa chi gestisce l'infrastruttura. Un provider è marcato come **default**.
- **A cosa serve** — il `CasoUso`, cioè la funzionalità AI. È la chiave logica stabile con cui il codice chiede un prompt, ed è qui che si decide **quale provider e quale modello** usare, per differenza rispetto al default.
- **Come si fa, oggi** — la `ConfigurazionePrompt`: system prompt, user prompt e parametri di inferenza. È la parte volatile, quindi **versionata**.

Il caso d'uso è referenziato dal codice e non cambia; la configurazione attiva sotto può evolvere — prompt ritoccato, parametri diversi — senza toccare l'applicazione e senza perdere lo storico.

Vale qui in pieno il principio di [modellazione](../../../processi/analisi-tecnica/03-modellazione.md): ogni comportamento dell'AI in produzione dev'essere **ricostruibile a posteriori**, quindi nulla si sovrascrive, tutto si versiona.

## Provider e modello: default con override

La scelta del modello a runtime segue una cascata a due livelli, così il caso comune resta a configurazione zero e i casi particolari si dichiarano solo dove servono:

1. **Provider** — esiste un provider di sistema marcato come `Default`. Un caso d'uso può puntare a un **provider specifico che lo sovrascrive**; se non lo fa, vale il default.
2. **Modello** — un caso d'uso può specificare il **modello**; se lo lascia nullo, si usa il **modello di default del provider** effettivo.

In pratica: un caso d'uso senza override gira sul provider di default con il suo modello di default; basta valorizzare un campo per spostarne uno solo dei due, o entrambi.

## Quando usarlo

Buoni candidati:

- app con **più funzionalità AI** che condividono un provider di default ma vogliono poterne deviare alcune
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

Il **catalogo**: quali provider e quali modelli sono utilizzabili. Un provider è il default di sistema e indica il proprio modello di default. Niente cancellazioni fisiche — un modello dismesso resta referenziabile dallo storico, si marca solo come non più attivo.

```csharp
// MyApp.Infrastructure/Ai/Provider.cs
public class Provider
{
    public int Id { get; set; }

    // Chiave logica usata in configurazione: 'anthropic', 'openai', 'azure-openai'
    public string Codice { get; set; } = default!;
    public string Nome { get; set; } = default!;

    // Esattamente un provider ha Default = true: è quello usato quando
    // il caso d'uso non specifica un override
    public bool Default { get; set; }

    // Modello di default del provider: usato quando il caso d'uso non ne specifica uno
    public int? ModelloDefaultId { get; set; }
    public Modello? ModelloDefault { get; set; }

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

La **funzionalità AI**. Il `Codice` è la chiave stabile che il codice usa per chiedere il prompt. È qui che vivono gli **override** di provider e modello: entrambi nullable, perché il caso normale è ereditare i default.

```csharp
// MyApp.Infrastructure/Ai/CasoUso.cs
public class CasoUso
{
    public int Id { get; set; }

    public string Codice { get; set; } = default!;   // 'riassunto-documento'
    public string Nome { get; set; } = default!;
    public string? Descrizione { get; set; }

    // Override del provider di default. Null => si usa il provider marcato Default
    public int? ProviderId { get; set; }
    public Provider? Provider { get; set; }

    // Override del modello. Null => si usa il modello di default del provider effettivo.
    // Se valorizzato, deve appartenere al provider effettivo del caso d'uso (validato in scrittura)
    public int? ModelloId { get; set; }
    public Modello? Modello { get; set; }

    public bool Attivo { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<ConfigurazionePrompt> Configurazioni { get; set; }
        = new List<ConfigurazionePrompt>();
}
```

La **configurazione del prompt**, versionata. Tiene insieme i due prompt e i parametri di inferenza. Di un caso d'uso ce ne possono essere molte versioni, ma una sola **attiva** alla volta.

```csharp
// MyApp.Infrastructure/Ai/ConfigurazionePrompt.cs
public class ConfigurazionePrompt
{
    public int Id { get; set; }

    public int CasoUsoId { get; set; }
    public CasoUso CasoUso { get; set; } = default!;

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

Due vincoli vivono nel database, non nel codice applicativo, entrambi come indice univoco filtrato: **un solo provider di default** e **una sola configurazione attiva per caso d'uso**.

```csharp
// MyApp.Infrastructure/Ai/ProviderConfiguration.cs
public class ProviderConfiguration : IEntityTypeConfiguration<Provider>
{
    public void Configure(EntityTypeBuilder<Provider> builder)
    {
        builder.ToTable(nameof(Provider));
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Codice).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Nome).HasMaxLength(200).IsRequired();
        builder.HasIndex(x => x.Codice).IsUnique();

        // Al più un provider di default. Filtro in sintassi SQL Server;
        // con PostgreSQL: "Default = true".
        builder.HasIndex(x => x.Default)
            .HasFilter("[Default] = 1")
            .IsUnique();

        builder.HasOne(x => x.ModelloDefault)
            .WithMany()
            .HasForeignKey(x => x.ModelloDefaultId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
```

```csharp
// MyApp.Infrastructure/Ai/CasoUsoConfiguration.cs
public class CasoUsoConfiguration : IEntityTypeConfiguration<CasoUso>
{
    public void Configure(EntityTypeBuilder<CasoUso> builder)
    {
        builder.ToTable(nameof(CasoUso));
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Codice).HasMaxLength(100).IsRequired();
        builder.HasIndex(x => x.Codice).IsUnique();

        // Override opzionali: nessuna cascade, il catalogo non si tocca
        // cancellando un caso d'uso
        builder.HasOne(x => x.Provider)
            .WithMany()
            .HasForeignKey(x => x.ProviderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Modello)
            .WithMany()
            .HasForeignKey(x => x.ModelloId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
```

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
        builder.HasIndex(x => x.CasoUsoId)
            .HasFilter("[Stato] = 'Attiva'")
            .IsUnique();

        builder.HasMany(x => x.Variabili)
            .WithOne(x => x.Configurazione)
            .HasForeignKey(x => x.ConfigurazioneId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

`Modello` riceve allo stesso modo un indice univoco su `(ProviderId, Codice)`: lo stesso codice modello è unico nell'ambito del provider.

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

Il servizio prende il codice del caso d'uso, applica la cascata provider/modello, recupera la configurazione attiva, valida le variabili e produce i due prompt pronti per la chiamata. La selezione esce di qui già risolta in `Codice` di provider e modello, così lo strato che parla con l'SDK del provider non conosce il database.

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
        var caso = await _db.CasiUso
            .AsNoTracking()
            .Include(x => x.Provider!).ThenInclude(p => p.ModelloDefault)
            .Include(x => x.Modello!).ThenInclude(m => m.Provider)
            .SingleOrDefaultAsync(x => x.Codice == codiceCasoUso && x.Attivo, ct)
            ?? throw new InvalidOperationException(
                $"Caso d'uso '{codiceCasoUso}' inesistente o non attivo.");

        // Cascata: override sul caso d'uso, altrimenti il default di sistema
        var provider = caso.Provider
            ?? await _db.Provider
                .AsNoTracking()
                .Include(p => p.ModelloDefault)
                .SingleAsync(p => p.Default, ct);

        // Cascata: modello del caso d'uso, altrimenti il default del provider
        var modello = caso.Modello ?? provider.ModelloDefault
            ?? throw new InvalidOperationException(
                $"Il provider '{provider.Codice}' non ha un modello di default e " +
                $"il caso d'uso '{codiceCasoUso}' non ne specifica uno.");

        var config = await _db.ConfigurazioniPrompt
            .AsNoTracking()
            .Include(x => x.Variabili)
            .SingleOrDefaultAsync(
                x => x.CasoUsoId == caso.Id
                  && x.Stato == StatoConfigurazione.Attiva, ct)
            ?? throw new InvalidOperationException(
                $"Nessuna configurazione attiva per il caso d'uso '{codiceCasoUso}'.");

        var valori = ApplicaDefaultEValida(config.Variabili, variabili);

        return new PromptRisolto(
            ProviderCodice:   provider.Codice,
            ModelloCodice:    modello.Codice,
            SystemPrompt:     config.SystemPrompt,
            UserPrompt:       Rendi(config.UserPrompt, valori),
            Parametri:        config.Parametri,
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

`ConfigurazioneId` viaggia nel risultato apposta: registrandolo accanto all'output (in un log o in una tabella di esecuzioni) si chiude il cerchio della tracciabilità — da una risposta si risale alla versione esatta di prompt e ai parametri che l'hanno prodotta.

## Versionare una modifica del prompt

Cambiare un prompt o i parametri **non è un `UPDATE`** sulla configurazione attiva. Si crea una nuova versione e si sposta lo stato:

1. si duplica la configurazione attiva in una nuova riga `Bozza` con `Versione` incrementata e le modifiche;
2. quando è pronta, in **un'unica transazione**, la vecchia attiva passa ad `Archiviata` e la bozza ad `Attiva`.

L'indice univoco filtrato garantisce che il passaggio non possa mai lasciare due versioni attive insieme.

La scelta di **provider e modello**, invece, vive sul caso d'uso, non nella versione del prompt: è una decisione di instradamento, non di contenuto. Cambiarla è un `UPDATE` sui campi del `CasoUso`, indipendente dalla storia delle versioni dei prompt.

## Le quattro richieste, mappate

| Requisito | Come è soddisfatto |
|---|---|
| Più provider | Catalogo `Provider` → `Modello`; uno è `Default` |
| System prompt per caso d'uso | `ConfigurazionePrompt.SystemPrompt`, versionato e legato al `CasoUso` |
| User prompt modificabile | `ConfigurazionePrompt.UserPrompt` come template versionato; le `{{variabili}}` riempite a runtime |
| Modello specificabile | `CasoUso.ModelloId` opzionale; se nullo vale il modello di default del provider effettivo |

## Considerazioni operative

- **Provider di default obbligatorio.** La cascata presuppone che esista sempre un provider con `Default = true`. L'indice filtrato garantisce che non ce ne sia più d'uno, ma non che ce ne sia almeno uno: lo si assicura con un seed e con un controllo in fase di disattivazione.
- **Coerenza provider/modello.** Se un caso d'uso specifica un modello, questo deve appartenere al provider effettivo del caso d'uso. È un vincolo che attraversa due righe e non si esprime con una semplice `CHECK`: si valida nel caso d'uso che salva il `CasoUso`.
- **Tracciare le esecuzioni.** Se l'utente finale può riscrivere a piacere lo user prompt e serve auditarlo (con input, output, token e costo), si introduce una tabella `EsecuzionePrompt` che referenzia `ConfigurazioneId`, il modello effettivo e registra il prompt inviato. Vale la pena solo se c'è il caso d'uso: senza, è [debito strutturale](../../../processi/analisi-tecnica/03-modellazione.md).
- **Segreti fuori dal modello.** Le API key dei provider non stanno in queste tabelle: vivono nella [configurazione applicativa](../07-configuration.md). Qui si modella *quale* modello usare, non *come* autenticarsi.
- **Parametri espliciti.** Tenere `Temperature`, `MaxToken` e `TopP` come colonne — non come JSON opaco — mantiene il modello leggibile e interrogabile, in linea con il principio dei [dati duttili in lettura](../../../processi/analisi-tecnica/03-modellazione.md).

Per il quadro su come si imposta il lavoro con strumenti AI nel processo di sviluppo, vedi [uso con l'IA](../../../uso-con-ia.md).
