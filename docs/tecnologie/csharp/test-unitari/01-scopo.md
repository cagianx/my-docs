---
sidebar_position: 1
description: A cosa servono i test unitari — logica pura senza dipendenze, monitoraggio di librerie di terze parti e verifica di comportamenti puntuali.
---

# A cosa servono i test unitari

Un test unitario testa un'unità di codice in isolamento: nessun database, nessuna rete, nessun file system. Il test parte, esegue, termina in millisecondi. Non c'è nulla da preparare e nulla da smontare.

Questo li rende diversi dai test di integrazione per scopo, non solo per velocità. Servono a tre cose distinte.

---

## 1. Testare logica pura senza dipendenze

La business logic che non tocca infrastruttura — entity di dominio, value object, algoritmi, regole di validazione — si testa in isolamento. Non serve un database per verificare che un ordine confermato non possa essere annullato.

```csharp
[TestFixture]
public class OrdineTests
{
    [Test]
    public void Ordine_confermato_non_puo_essere_annullato()
    {
        var ordine = new Ordine(clienteId: 1, importo: 100m);
        ordine.Conferma();

        var act = () => ordine.Annulla("ripensamento");

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*confermato*");
    }

    [Test]
    public void Importo_negativo_non_e_ammesso()
    {
        var act = () => new Ordine(clienteId: 1, importo: -1m);

        act.Should().Throw<ArgumentException>();
    }

    [Test]
    public void Sconto_non_puo_superare_il_totale()
    {
        var ordine = new Ordine(clienteId: 1, importo: 50m);

        var act = () => ordine.ApplicaSconto(60m);

        act.Should().Throw<InvalidOperationException>();
    }
}
```

Questi test sono anche la documentazione più precisa delle regole di dominio: chiunque legga i nomi dei metodi capisce cosa il sistema permette e cosa vieta, senza aprire un manuale.

---

## 2. Monitorare le librerie di terze parti

Una libreria esterna ha un ciclo di vita indipendente dal progetto. Quando viene aggiornata — intenzionalmente o perché un tool di aggiornamento automatico lo fa — il suo comportamento può cambiare in modo sottile: una edge case gestita diversamente, un default modificato, una funzione deprecata che ora si comporta in modo diverso.

I test che documentano il comportamento atteso di una libreria diventano il sensore che rileva questi cambiamenti.

```csharp
[TestFixture]
public class FluentValidationBehaviorTests
{
    // Documenta: NotEmpty() tratta stringa vuota e null allo stesso modo
    [TestCase("")]
    [TestCase(null)]
    public void NotEmpty_rifiuta_stringa_vuota_e_null(string? valore)
    {
        var validator = new InlineValidator<string?>();
        validator.RuleFor(x => x).NotEmpty();

        validator.Validate(valore).IsValid.Should().BeFalse();
    }

    // Documenta: il messaggio di errore predefinito contiene il nome del campo
    [Test]
    public void NotEmpty_include_il_nome_del_campo_nel_messaggio()
    {
        var validator = new InlineValidator<CreaOrdineRequest>();
        validator.RuleFor(x => x.ClienteId).NotEmpty();

        var result = validator.Validate(new CreaOrdineRequest());

        result.Errors.Single().ErrorMessage.Should().Contain("Cliente Id");
    }

    // Documenta: When() non esegue la regola se la condizione è falsa
    [Test]
    public void When_salta_la_validazione_se_condizione_falsa()
    {
        var validator = new InlineValidator<CreaOrdineRequest>();
        validator.RuleFor(x => x.DataConsegna)
            .GreaterThan(DateTime.Today)
            .When(x => x.DataConsegna.HasValue);

        var request = new CreaOrdineRequest { DataConsegna = null };

        validator.Validate(request).IsValid.Should().BeTrue();
    }
}
```

Se dopo un aggiornamento di FluentValidation uno di questi test fallisce, il fallimento è intenzionale: segnala che il comportamento è cambiato e che va rivalutato prima di procedere con l'aggiornamento.

---

## 3. Coltellino svizzero per dubbi puntuali

Non tutto nasce da un requisito. A volte si vuole capire come funziona qualcosa di preciso: come `DateTimeOffset` gestisce le conversioni tra fusi orari, come `string.Split` tratta i separatori multipli, come EF serializza un tipo custom senza andare a leggere la documentazione per venti minuti.

Il test è il posto più rapido e preciso dove chiarirsi le idee. Una volta scritto, rimane come documentazione eseguibile per chiunque abbia lo stesso dubbio in futuro.

```csharp
[TestFixture]
public class DateTimeOffsetBehaviorTests
{
    [Test]
    public void ToUniversalTime_converte_correttamente_da_fuso_europeo()
    {
        // UTC+2 in estate (ora legale italiana)
        var offset = new DateTimeOffset(2024, 6, 15, 10, 0, 0, TimeSpan.FromHours(2));

        offset.ToUniversalTime().Hour.Should().Be(8);
    }

    [Test]
    public void Due_DateTimeOffset_con_stesso_istante_e_fusi_diversi_sono_uguali()
    {
        var utc   = new DateTimeOffset(2024, 1, 1, 12, 0, 0, TimeSpan.Zero);
        var rome  = new DateTimeOffset(2024, 1, 1, 13, 0, 0, TimeSpan.FromHours(1));

        utc.Should().Be(rome); // stesso istante, fuso diverso
    }
}

[TestFixture]
public class StringSplitBehaviorTests
{
    [Test]
    public void Split_con_separatore_multiplo_non_produce_elementi_vuoti_con_RemoveEmptyEntries()
    {
        var risultato = "a,,b,,c".Split(',', StringSplitOptions.RemoveEmptyEntries);

        risultato.Should().BeEquivalentTo(["a", "b", "c"]);
    }

    [Test]
    public void Split_senza_opzioni_include_gli_elementi_vuoti()
    {
        var risultato = "a,,b".Split(',');

        risultato.Should().HaveCount(3);
        risultato[1].Should().BeEmpty();
    }
}
```

Questi test non nascono da un bug o da un requisito: nascono da una domanda. Risponderla con un test invece che con un breakpoint o una lettura veloce di Stack Overflow produce qualcosa di permanente e condivisibile.
