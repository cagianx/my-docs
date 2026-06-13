---
sidebar_position: 23
description: "InternalsVisibleTo in C#: visibilità interna ai progetti di test senza esporre API private."
---

# InternalsVisibleTo

## Il problema

Una libreria espone solo i membri `public` ai consumatori esterni. I membri `internal` restano nascosti, ed è giusto così: sono dettagli implementativi che non devono far parte del contratto pubblico.

Il problema nasce quando si scrivono test unitari in un progetto separato: per verificare il comportamento di classi e metodi `internal`, l'unica opzione apparente è renderli `public`. Questo inquina l'API pubblica con dettagli che il consumatore non dovrebbe vedere né usare.

## La soluzione: `InternalsVisibleTo`

L'attributo `InternalsVisibleTo` dichiara che un assembly «amico» può accedere ai membri `internal` come se fossero nello stesso progetto. Nessuna modifica ai modificatori di accesso, nessun compromesso sull'incapsulamento.

```csharp
// Nel file .csproj della libreria oppure in un file AssemblyInfo.cs
[assembly: InternalsVisibleTo("MiaLibreria.Tests")]
```

Da questo momento il progetto `MiaLibreria.Tests` vede tutti i tipi e i membri `internal` di `MiaLibreria`.

## Configurazione nel `.csproj`

Il modo più comune in progetti .NET moderni è inserirlo direttamente nel file di progetto:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <ItemGroup>
    <InternalsVisibleTo Include="MiaLibreria.Tests" />
  </ItemGroup>
</Project>
```

Il compilatore genera automaticamente l'attributo assembly corrispondente.

## Cosa non serve più

Senza `InternalsVisibleTo` si vedono spesso workaround che inquinano il codice:

| Workaround evitabile | Perché è sbagliato |
|---------------------|-------------------|
| Rendere `public` un tipo che dovrebbe essere `internal` | Espone dettagli implementativi ai consumatori |
| Creare namespace con nomi evocativi tipo `Internal` o `Internals` | Il nome suggerisce «non usare», ma il compilatore non lo impedisce: è una convenzione fragile |
| Usare reflection nei test per accedere a membri privati | Fragile, lento, non refactoring-safe |

Con `InternalsVisibleTo` nessuno di questi compromessi è necessario. I membri restano `internal`, l'API pubblica resta pulita, e i test accedono a tutto ciò che serve.

## Esempio concreto

```csharp
// MiaLibreria/Calcoli/CalcoloSconto.cs
internal class CalcoloSconto
{
    internal decimal Applica(decimal prezzo, decimal percentuale)
    {
        if (percentuale is < 0 or > 100)
            throw new ArgumentOutOfRangeException(nameof(percentuale));

        return prezzo * (1 - percentuale / 100);
    }
}
```

```csharp
// MiaLibreria.Tests/Calcoli/CalcoloScontoTests.cs
public class CalcoloScontoTests
{
    [Fact]
    public void Applica_con_percentuale_valida_restituisce_prezzo_scontato()
    {
        var calcolo = new CalcoloSconto();

        var risultato = calcolo.Applica(100m, 20m);

        Assert.Equal(80m, risultato);
    }
}
```

Il test accede direttamente a `CalcoloSconto` pur essendo `internal`, grazie a `InternalsVisibleTo`.

## Quando usarlo

- **Test unitari**: il caso d'uso principale. Il progetto di test ha visibilità completa sulla libreria senza alterarne la superficie pubblica.
- **Progetti companion**: quando due assembly fanno parte della stessa soluzione e devono collaborare strettamente, ma non si vuole esporre l'interfaccia interna a terzi.

## Quando non usarlo

- Non usarlo per aggirare un problema di design. Se un tipo `internal` ha bisogno di essere visibile a molti assembly, forse dovrebbe essere `public` con un contratto esplicito.
- Non usarlo come alternativa al refactoring: se i test hanno bisogno di accedere a troppi interni, potrebbe essere un segnale che la classe fa troppo.

## Riepilogo

`InternalsVisibleTo` è il meccanismo ufficiale per dare visibilità completa di un assembly ai progetti di test senza compromessi:

- L'API pubblica resta invariata.
- I dettagli implementativi restano `internal`.
- Non servono namespace dal nome evocativo come `Internal`: il compilatore, non una convenzione, garantisce l'accesso.
