---
sidebar_position: 4
description: Enum persistiti come stringa con Entity Framework Core — lunghezza massima e check constraint derivati dinamicamente dai valori dell'enum.
---

# Enum sul database

Un enum di dominio modella un insieme finito e chiuso di valori — `StatoOrdine.InAttesa`, `StatoOrdine.Confermato`, `StatoOrdine.Annullato`. Sul database questi valori si possono persistere come **intero** (il valore numerico dell'enum) o come **stringa** (il nome del valore).

La forma stringa è quasi sempre preferibile: il dato resta leggibile in qualunque tool di ispezione, le query SQL ad-hoc non richiedono mappature mentali, e una rinomina o riassegnazione di valori interi non corrompe silenziosamente i dati storici. Il costo è un po' di spazio in più — irrilevante in pratica.

```csharp
public class OrdineConfiguration : IEntityTypeConfiguration<Ordine>
{
    public void Configure(EntityTypeBuilder<Ordine> builder)
    {
        builder.Property(o => o.Stato)
            .HasConversion<EnumToStringConverter<StatoOrdine>>()
            .IsRequired();
    }
}
```

Si usa la forma esplicita [`HasConversion<EnumToStringConverter<TEnum>>()`](https://learn.microsoft.com/en-us/dotnet/api/microsoft.entityframeworkcore.storage.valueconversion.enumtostringconverter-1): rende immediatamente leggibile il converter in uso e non lascia margine di interpretazione su cosa viene serializzato e come. Esiste anche la scorciatoia `HasConversion<string>()`, che fa la stessa cosa, ma è ambigua a colpo d'occhio — non si capisce se sta convertendo da/verso una stringa generica o se sta usando il converter dedicato all'enum. Una sola forma, ovunque.

## Lunghezza massima derivata dall'enum

Per default EF mappa le colonne stringa a un tipo a lunghezza variabile non vincolata (`text` in PostgreSQL, `nvarchar(max)` in SQL Server). È preferibile dichiarare una `MaxLength` esplicita: rende lo schema autodocumentante e impedisce che un refactor che introduce un nuovo valore enum eccessivamente lungo passi inosservato in produzione.

`EnumToStringConverter<TEnum>` non comunica alcuna `MaxLength`: la conversione sa come trasformare i valori, ma il vincolo di colonna è una decisione di mapping separata. La lunghezza massima non si scrive a mano — si calcola dall'enum stesso. Hardcodare `HasMaxLength(20)` significa creare un valore che mente non appena qualcuno aggiunge `StatoOrdine.InAttesaConfermaCliente`.

```csharp
builder.Property(o => o.Stato)
    .HasConversion<EnumToStringConverter<StatoOrdine>>()
    .HasMaxLength(Enum.GetNames<StatoOrdine>().Max(n => n.Length))
    .IsRequired();
```

La `MaxLength` segue automaticamente l'enum: aggiungere o rinominare un valore aggiorna lo schema alla prossima migration, senza sincronizzazioni manuali.

Se la stessa configurazione si ripete su molte property enum, conviene estrarla in un'extension method sul `PropertyBuilder<TEnum>`. Per uno o due casi, l'inline è più chiaro.

:::tip[Risparmio nel tempo]

Calcolare `MaxLength` dinamicamente paga ogni volta che si aggiunge un valore all'enum: non c'è alcuna sincronizzazione manuale tra l'enum e la `HasMaxLength(N)` da cercare e correggere. Lo stesso vale per la check constraint dei valori ammessi. La regola operativa per evolvere un enum è semplice e non negoziabile:

1. **modificare l'enum solo in aggiunta** — mai rinominare, mai rinumerare, mai cambiare ordine se i valori sono interi (vedi [Valori espliciti, mai modificati](#valori-espliciti-mai-modificati))
2. **creare sempre una migration dopo la modifica** — anche se vuota. La migration è il marker storico della modifica al dominio: ogni cambio dell'enum lascia una traccia nella sequenza delle migration, ricostruibile dal repo

Tipicamente la migration non sarà vuota — `MaxLength` o check constraint cambiano e la migration le riflette automaticamente. Quando per caso non rileva differenze a livello di schema (es. il nuovo valore è più corto del massimo precedente e per qualche motivo la check constraint non viene rigenerata), si crea comunque la migration vuota per non lasciare buchi nella storia.

:::

## Check constraint derivata dai valori

`MaxLength` blocca solo le stringhe troppo lunghe — non impedisce di inserire stringhe arbitrarie tramite SQL diretto, import di dati legacy o bug applicativi. La garanzia che la colonna contenga **solo** valori dell'enum la dà una **check constraint**, anch'essa generata dall'enum stesso.

```csharp
public static class EnumConfigurationExtensions
{
    public static EntityTypeBuilder<TEntity> HasEnumCheckConstraint<TEntity, TEnum>(
        this EntityTypeBuilder<TEntity> builder,
        string columnName)
        where TEntity : class
        where TEnum : struct, Enum
    {
        var valoriSql = string.Join(", ", Enum.GetNames<TEnum>().Select(n => $"'{n}'"));
        var tableName = builder.Metadata.GetTableName();

        return builder.ToTable(t => t.HasCheckConstraint(
            name: $"CK_{tableName}_{columnName}",
            sql: $"\"{columnName}\" IN ({valoriSql})"));
    }
}
```

Uso nella configurazione (vedi [Convenzioni di naming](01-code-first.md#convenzioni-di-naming) per `nameof()` su tabelle e colonne):

```csharp
builder.ToTable(nameof(Ordine));

builder.Property(o => o.Stato)
    .HasColumnName(nameof(Ordine.Stato))
    .HasConversion<EnumToStringConverter<StatoOrdine>>()
    .HasMaxLength(Enum.GetNames<StatoOrdine>().Max(n => n.Length))
    .IsRequired();

builder.HasEnumCheckConstraint<Ordine, StatoOrdine>(nameof(Ordine.Stato));
```

La migration generata produce un `CHECK ("Stato" IN ('InAttesa', 'Confermato', 'Annullato'))` direttamente sul database. Tentativi di scrittura con valori non previsti — da qualunque sorgente — vengono respinti dal motore prima che diventino un problema.

I nomi degli enum C# non contengono apice singolo, quindi la concatenazione diretta è sicura. Se la convenzione dovesse cambiare, la lista andrebbe sanificata.

## Evoluzione dei valori enum

Aggiungere un valore all'enum è un'operazione retrocompatibile sul software vecchio (che non lo userà), ma rompe la check constraint esistente. La sequenza corretta è:

1. aggiungere il valore all'enum
2. generare una migration — EF rileva il cambiamento e ricrea la constraint con la lista aggiornata
3. applicare la migration prima di deployare il software che usa il nuovo valore

### Rimozione tramite deprecazione

Anche un valore enum si può rimuovere — passa per il [processo di deprecazione](../../../regole/dominio.md): non è uno strappo, è un percorso preciso. Saltarne anche solo un passo non produce un bug innocuo, ma un'interruzione di servizio.

Il motivo è concreto: se il database contiene anche **una sola riga** con un valore che non esiste più nell'enum C#, ogni query che tocca quella riga fallisce. EF non sa come deserializzare la stringa (o l'intero) letta dal database in un membro dell'enum, e solleva eccezione. Non è un avvertimento silenzioso — è un errore in faccia all'utente, su tutte le query che leggono righe contaminate. Lo stesso vale se si rinomina un valore senza migrare i dati: il vecchio nome resta nel database, il nuovo nel codice, e tutto ciò che li attraversa rompe.

Per questo la deprecazione di un valore enum si fa in questo ordine:

1. **smettere di scrivere il valore** — il codice che lo produceva viene aggiornato per usare un altro valore (o viene rimosso). Il valore resta nell'enum, ma nessun write nuovo lo userà
2. **migrare i dati esistenti** — una migration `UPDATE` riassegna le righe storiche a un valore valido, oppure le marca come deprecate, oppure le elimina. Dipende dal dominio
3. **verificare che il database non contenga più il valore** — query di controllo prima di procedere (`SELECT COUNT(*) WHERE stato = 'VecchioValore'` deve dare zero)
4. **rimuovere il simbolo dall'enum** e generare la migration: la check constraint viene rigenerata senza il valore deprecato

Saltare il passo 2 o 3 è esattamente lo scenario di rottura descritto sopra. Il punto 4 è pulizia finale, non l'inizio.

Per gli enum con valori interi vale la regola aggiuntiva: anche dopo la rimozione del simbolo, **il numero non si recicla**. Se `Annullato = 3` viene deprecato, il `3` resta riservato, non si riassegna a un nuovo stato. Non c'è modo di sapere se nel database, in backup, o in dati esportati altrove, esista ancora un `3` con il vecchio significato.

Vedi [`regole/entity-framework`](../../../regole/entity-framework.md#il-database-si-aggiorna-prima-del-software) per come questa logica si inserisce nel ciclo di deploy.

## L'enum come fonte unica per le annotation

`MaxLength` e check constraint non esauriscono ciò che si può derivare automaticamente dall'enum. Lo stesso elenco di valori governa anche la validazione applicativa e la documentazione del contratto API — senza che la lista vada riscritta da nessun'altra parte.

**Validazione** — FluentValidation ha una regola dedicata che riusa direttamente il tipo enum:

```csharp
RuleFor(x => x.Stato).IsInEnum();
```

Aggiungere un valore all'enum aggiorna la regola implicitamente. Nessuna lista da mantenere a mano.

**Contratto API** — se l'enum è serializzato come stringa con `JsonStringEnumConverter`, lo schema OpenAPI generato da ASP.NET Core espone automaticamente l'elenco dei valori ammessi:

```jsonc
// in Program.cs
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
```

```yaml
# OpenAPI generato
StatoOrdine:
  type: string
  enum: [InAttesa, Confermato, Annullato]
```

Il client che consuma il contratto vede gli stessi nomi che esistono sul database e nel codice. Una sola fonte di verità — l'enum — propaga il vincolo a tutti i layer: schema database, check constraint, validazione, contratto pubblicato. Aggiungere un valore richiede di toccare un solo posto; tutto il resto si aggiorna alla compilazione o alla migration successiva.

Questo è esattamente il principio "scrittura difficile, lettura facile" applicato alla definizione del dominio: un solo punto di modifica, molti consumatori automatici.

## Cardinalità e quando preferire l'intero

Un enum ha per natura una **cardinalità piccola e fissa**: un insieme chiuso di pochi valori — tipicamente meno di una decina, raramente più di qualche decina. Questa è proprio la caratteristica che lo rende un ottimo discriminante per partizionare i dati: lo stato di un ordine, il tipo di un documento, il livello di un utente sono campi naturalmente al centro delle query di filtro e ordinamento. Per questo gli enum **fanno spesso parte di un indice** — da soli o, più frequentemente, come prima colonna di un indice composito (`(stato, data_creazione)`, `(tipo, cliente_id)`).

La forma stringa costa più spazio della forma intera: ogni riga porta con sé il nome del valore (`"Confermato"` = 10 byte) anziché un singolo byte (o due, o quattro a seconda del tipo intero scelto). Su una tabella con poche migliaia di righe la differenza è trascurabile. Su tabelle con milioni di righe, o quando il campo finisce in un indice, l'impatto si misura in gigabyte di indice e in tempi di scansione più lunghi.

Il caso più rilevante è infatti l'**indicizzazione**: un indice su una colonna intera è significativamente più piccolo e veloce di uno equivalente su stringa. Confronti, ordinamenti e join lavorano su numeri anziché su confronti lessicografici. Quando l'enum è destinato a un indice — e dato il discorso sopra, questo è lo scenario comune più che l'eccezione — il guadagno è concreto.

In questi scenari la forma intera diventa la scelta corretta:

```csharp
public enum StatoOrdine
{
    InAttesa = 1,
    Confermato = 2,
    Annullato = 3,
    Evaso = 4
}
```

```csharp
builder.Property(o => o.Stato)
    .HasConversion<int>()
    .IsRequired();

builder.HasEnumCheckConstraint<Ordine, StatoOrdine>(nameof(Ordine.Stato)); // genera CHECK ... IN (1, 2, 3, 4)
```

L'helper `HasEnumCheckConstraint` va adattato a `Enum.GetValues<TEnum>().Cast<int>()` per produrre la lista numerica anziché quella nominale.

### Valori espliciti, mai modificati

La forma intera introduce un vincolo non negoziabile: **i valori numerici dell'enum vanno assegnati esplicitamente e non cambiano mai**.

Senza assegnazione esplicita, C# numera i valori in base alla posizione di dichiarazione: aggiungere un valore in mezzo, riordinare alfabeticamente, o lasciare che un refactor automatico cambi l'ordine modifica silenziosamente i numeri associati ai simboli — e quindi il significato di tutti i dati già persistiti. `StatoOrdine.Confermato` che era `2` può diventare `3`, e ogni riga del database con `2` ora rappresenta uno stato diverso.

Le regole sono:

- **assegnare esplicitamente** ogni valore: `InAttesa = 1`, non `InAttesa`
- **non riusare** valori di simboli rimossi: se `Annullato = 3` viene deprecato, il `3` resta riservato, non si recicla per un nuovo stato
- **non rinumerare** mai un valore esistente, nemmeno per "fare ordine"
- **aggiungere** nuovi valori sempre con un numero non ancora usato, indipendentemente dall'ordine di dichiarazione

Con la forma stringa questo problema non esiste: il legame tra simbolo e valore persistito è il nome, e rinominare un simbolo è già esplicitamente un breaking change. È una delle ragioni per cui la stringa resta la scelta di default — sposta la fragilità dal database al codice, dove è più visibile.
