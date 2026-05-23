---
sidebar_position: 4
sidebar_label: "Adapter in C#"
description: "Adapter in C# — implementazione tramite progetti di integrazione, isolamento di librerie esterne dietro interfacce di dominio e gestione degli errori."
---

# Adapter in C\#

Questa pagina mostra come applicare l'[Adapter](../../../pattern-di-sviluppo/adapter.md) in una solution C# strutturata secondo la guida sui [progetti di integrazione](../struttura-soluzione/06-integrazioni.md).

---

## Il contesto: il confine tra Core e librerie

Il Core esprime il dominio in termini propri. Librerie come `MailKit`, `Microsoft.Graph`, `Stripe.net`, `AWSSDK.S3` portano con sé un proprio vocabolario, modello di errore e tipi concreti. L'adapter è il livello che li tiene fuori dal Core.

```text
┌────────────┐    INotificationSender    ┌──────────────────┐    MailKit    ┌──────────┐
│   Core     │ ──────────────────────────│ MailKitAdapter   │──────────────▶│   SMTP   │
│            │                           │ (Integrazioni)   │               │  server  │
└────────────┘                           └──────────────────┘               └──────────┘
```

Il Core dipende solo da `INotificationSender`. L'adapter, che vive nel progetto di integrazione, è l'unico punto a importare `MailKit`.

---

## 1. Interfaccia nel Core

L'interfaccia è scritta dal punto di vista del Core: nomi, tipi e modello d'errore sono quelli del dominio.

```csharp
// Core/Notifications/INotificationSender.cs
public interface INotificationSender
{
    Task<Result<MessageId>> SendEmailAsync(
        EmailAddress to,
        string subject,
        string body,
        CancellationToken ct);
}
```

Note:

- Niente `MimeMessage`, niente `SmtpClient`. Tipi puri di dominio.
- L'esito è un [`Result<T>`](../struttura-soluzione/07-models.md): l'adapter cattura le eccezioni della libreria e le traduce in fallimenti espliciti.
- Il `CancellationToken` propaga la cancellazione.

---

## 2. Adapter nel progetto di integrazione

```csharp
// Integrazioni.Email/MailKitNotificationSender.cs
public class MailKitNotificationSender : INotificationSender
{
    private readonly SmtpSettings _settings;
    private readonly ILogger<MailKitNotificationSender> _logger;

    public MailKitNotificationSender(
        IOptions<SmtpSettings> settings,
        ILogger<MailKitNotificationSender> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<Result<MessageId>> SendEmailAsync(
        EmailAddress to, string subject, string body, CancellationToken ct)
    {
        var message = new MimeMessage();
        message.From.Add(MailboxAddress.Parse(_settings.From));
        message.To.Add(MailboxAddress.Parse(to.Value));
        message.Subject = subject;
        message.Body = new TextPart("plain") { Text = body };

        try
        {
            using var client = new SmtpClient();
            await client.ConnectAsync(_settings.Host, _settings.Port, _settings.UseSsl, ct);
            await client.AuthenticateAsync(_settings.Username, _settings.Password, ct);
            await client.SendAsync(message, ct);
            await client.DisconnectAsync(true, ct);

            return Result.Success(new MessageId(message.MessageId));
        }
        catch (AuthenticationException ex)
        {
            _logger.LogWarning(ex, "Autenticazione SMTP fallita verso {Host}", _settings.Host);
            return Result.Failure<MessageId>(NotificationErrors.AuthenticationFailed);
        }
        catch (SmtpCommandException ex) when (ex.ErrorCode == SmtpErrorCode.RecipientNotAccepted)
        {
            _logger.LogWarning(ex, "Destinatario {Recipient} rifiutato", to.Value);
            return Result.Failure<MessageId>(NotificationErrors.RecipientRejected);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Errore imprevisto nell'invio email a {Recipient}", to.Value);
            return Result.Failure<MessageId>(NotificationErrors.TransportError);
        }
    }
}
```

Punti chiave:

- L'adapter è **l'unico** punto in cui appare `MailKit`. Il Core non lo vede.
- Le eccezioni della libreria diventano `Result.Failure` con codici espressi nel vocabolario del dominio.
- Il logging registra il contesto in cui si è verificato l'errore di libreria, prima di tradurlo.
- `SmtpSettings` è una classe del progetto di integrazione, non leaked nel Core.

---

## 3. Registrazione

Nel `Program.cs` (o in una extension `AddNotifications()` del progetto di integrazione):

```csharp
builder.Services.Configure<SmtpSettings>(builder.Configuration.GetSection("Smtp"));
builder.Services.AddScoped<INotificationSender, MailKitNotificationSender>();
```

Il Core continua a iniettare `INotificationSender`. Cambiare provider (SendGrid, AWS SES, Mailgun) significa scrivere un nuovo adapter e cambiare una sola riga di registrazione.

---

## 4. Adapter di sistemi legacy

L'Adapter è anche lo strumento per integrare codice legacy senza farlo leakare nel nuovo dominio. Esempio: un servizio SOAP storico che restituisce DataSet.

```csharp
public interface ICustomerLookup
{
    Task<Result<Customer>> FindByVatIdAsync(string vatId, CancellationToken ct);
}

public class LegacyCustomerLookupAdapter : ICustomerLookup
{
    private readonly LegacyCustomerService _legacy; // client SOAP generato

    public LegacyCustomerLookupAdapter(LegacyCustomerService legacy) => _legacy = legacy;

    public async Task<Result<Customer>> FindByVatIdAsync(string vatId, CancellationToken ct)
    {
        var ds = await _legacy.GetCustomerByVatAsync(vatId);
        if (ds.Tables[0].Rows.Count == 0)
            return Result.Failure<Customer>(CustomerErrors.NotFound);

        var row = ds.Tables[0].Rows[0];
        return Result.Success(new Customer(
            Id: Guid.Parse((string)row["GUID"]),
            Name: ((string)row["RAG_SOC"]).Trim(),
            VatId: (string)row["P_IVA"]));
    }
}
```

Il Core riceve un `Customer` pulito. La presenza del `DataSet`, dei nomi colonna criptici e dei tipi `object` resta confinata all'adapter.

---

## 5. Anti-pattern: adapter che leaka

```csharp
// SBAGLIATO: il tipo della libreria entra nel Core
public interface INotificationSender
{
    Task SendAsync(MimeMessage message, CancellationToken ct);
}
```

L'interfaccia è quella che espone la libreria, non quella che serve al dominio. Cambiare provider richiede di toccare ogni chiamante. È un wrapper, non un adapter.

```csharp
// SBAGLIATO: l'eccezione della libreria attraversa il confine
public class MailKitNotificationSender : INotificationSender
{
    public async Task SendAsync(...)
    {
        // nessun try/catch: SmtpCommandException risale al Core
    }
}
```

Il Core finisce per catturare eccezioni della libreria, che è esattamente ciò che l'adapter doveva evitare.

---

## Riassunto

| Regola | Motivo |
|---|---|
| L'interfaccia vive nel Core, usa tipi di dominio | Il Core non dipende dalla libreria |
| L'adapter vive nel progetto di integrazione | La libreria resta confinata |
| Le eccezioni della libreria diventano `Result.Failure` | Il Core ha un modello d'errore uniforme |
| Un solo adapter per integrazione | Sostituire la libreria è una modifica a un solo file |
