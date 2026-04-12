---
sidebar_position: 2
description: Come scrivere test unitari — naming, AAA, test parametrici, indipendenza e cosa non testare.
---

# Come scriverli

## Il nome è la specifica

Il nome del test è la prima cosa che si legge quando un test fallisce. Deve descrivere il comportamento atteso in modo che il fallimento sia autoesplicativo, senza aprire il corpo del test.

```csharp
// ❌ Non dice nulla sul comportamento
[Test] public void Test1() { }
[Test] public void OrdineTest() { }

// ✅ Il nome è una frase che descrive scenario e risultato atteso
[Test] public void Ordine_confermato_non_accetta_nuove_righe() { }
[Test] public void Sconto_superiore_al_totale_lancia_eccezione() { }
[Test] public void Importo_zero_non_e_ammesso() { }
```

La convenzione `UnitàDiTest_Scenario_RisultatoAtteso` funziona bene per casi semplici. Per scenari più narrativi si può usare una frase libera in snake_case. L'importante è che il nome si legga come una riga di specifica.

La classe di test prende il nome dell'unità testata:

```csharp
[TestFixture] public class OrdineTests { }
[TestFixture] public class EmailTests { }
[TestFixture] public class ScontoCumulativoTests { }
```

---

## Struttura AAA

Ogni test segue la struttura **Arrange / Act / Assert**: prepara, esegui, verifica. Tre blocchi separati, ciascuno con una responsabilità sola.

```csharp
[Test]
public void Applica_sconto_percentuale_riduce_il_totale()
{
    // Arrange
    var ordine = new Ordine(clienteId: 1, importo: 200m);

    // Act
    ordine.ApplicaScontoPercentuale(10);

    // Assert
    ordine.Totale.Should().Be(180m);
}
```

Se l'arrange è lungo più di qualche riga, il test sta probabilmente testando troppo — o il codice produttivo è troppo difficile da costruire in isolamento, che è già un segnale.

Un test dovrebbe verificare **un concetto alla volta**. Non significa necessariamente una sola asserzione, ma un solo comportamento:

```csharp
// ✅ Un concetto, più asserzioni coerenti
[Test]
public void Conferma_aggiorna_stato_e_data()
{
    var ordine = new Ordine(clienteId: 1, importo: 100m);

    ordine.Conferma();

    ordine.Stato.Should().Be(StatoOrdine.Confermato);
    ordine.DataConferma.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
}
```

---

## Test parametrici

Quando lo stesso comportamento va verificato su più input diversi, `[TestCase]` elimina la duplicazione senza perdere leggibilità:

```csharp
// ❌ Tre test identici nella struttura
[Test] public void Importo_zero_non_ammesso() { ... }
[Test] public void Importo_negativo_non_ammesso() { ... }
[Test] public void Importo_molto_negativo_non_ammesso() { ... }

// ✅ Un test parametrico
[TestCase(0)]
[TestCase(-1)]
[TestCase(-999.99)]
public void Importo_non_positivo_non_e_ammesso(decimal importo)
{
    var act = () => new Ordine(clienteId: 1, importo: importo);

    act.Should().Throw<ArgumentException>();
}
```

Quando i casi sono molti o complessi si usa `[TestCaseSource]`, che permette di definire i dati in un metodo o campo separato:

```csharp
private static IEnumerable<TestCaseData> CasiSconto()
{
    yield return new TestCaseData(100m, 10, 90m).SetName("10% su 100 → 90");
    yield return new TestCaseData(200m, 25, 150m).SetName("25% su 200 → 150");
    yield return new TestCaseData(50m,  50, 25m).SetName("50% su 50 → 25");
}

[TestCaseSource(nameof(CasiSconto))]
public void Sconto_percentuale_calcola_correttamente(decimal importo, int percentuale, decimal atteso)
{
    var ordine = new Ordine(clienteId: 1, importo: importo);
    ordine.ApplicaScontoPercentuale(percentuale);
    ordine.Totale.Should().Be(atteso);
}
```

---

## Indipendenza tra test

I test non devono dipendere dall'ordine di esecuzione né condividere stato mutabile. Ogni test crea ciò di cui ha bisogno e non lascia nulla a chi viene dopo.

```csharp
// ❌ Stato condiviso — l'ordine di esecuzione influenza il risultato
[TestFixture]
public class OrdineTests
{
    private Ordine _ordine = new(clienteId: 1, importo: 100m); // condiviso

    [Test] public void Test_A() { _ordine.Conferma(); /* modifica lo stato */ }
    [Test] public void Test_B() { _ordine.Stato.Should().Be(StatoOrdine.Nuovo); /* dipende da Test_A */ }
}

// ✅ Ogni test costruisce il proprio stato
[TestFixture]
public class OrdineTests
{
    [Test]
    public void Test_A()
    {
        var ordine = new Ordine(clienteId: 1, importo: 100m);
        ordine.Conferma();
        ordine.Stato.Should().Be(StatoOrdine.Confermato);
    }

    [Test]
    public void Test_B()
    {
        var ordine = new Ordine(clienteId: 1, importo: 100m);
        ordine.Stato.Should().Be(StatoOrdine.Nuovo);
    }
}
```

`[SetUp]` ha senso solo quando l'arrange è identico per tutti i test della classe e non introduce stato mutabile condiviso (ad esempio, ricrea un oggetto fresco per ogni test). Se i test hanno arrange diversi, è meglio che ciascuno costruisca il proprio.

---

## Cosa non testare

Non tutto va testato. Testare l'ovvio non aggiunge documentazione utile e aumenta il costo di manutenzione.

**Getter e setter senza logica** — se una proprietà è un semplice assegnamento, il test non documenta nulla di interessante:

```csharp
// ❌ Non serve: non c'è comportamento da documentare
[Test]
public void Nome_viene_impostato_correttamente()
{
    var cliente = new Cliente();
    cliente.Nome = "Mario";
    cliente.Nome.Should().Be("Mario");
}
```

**Comportamento del framework** — EF Core, ASP.NET Core, NUnit stesso non vanno testati. Si assume che funzionino. Se un comportamento del framework è sorprendente o poco noto, va nel capitolo [coltellino svizzero](01-scopo.md#3-coltellino-svizzero-per-dubbi-puntuali) — ma come esplorazione documentata, non come verifica di correttezza.

**Logica già coperta dai test di integrazione** — se un caso d'uso è già testato end-to-end con il database reale, non serve duplicare il test unitario sullo stesso scenario. I due livelli si completano, non si sovrappongono. Il test di integrazione verifica che tutto funzioni insieme; il test unitario verifica le regole di dominio in isolamento.

**Metodi privati** — se la logica in un metodo privato è abbastanza complessa da meritare un test, probabilmente merita di essere estratta in una classe separata con interfaccia pubblica. Testare metodi privati via reflection è un segnale di design da rivedere.
