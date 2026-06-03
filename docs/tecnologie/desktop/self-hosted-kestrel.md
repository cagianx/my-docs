---
sidebar_position: 1
description: Distribuire WebAPI + Angular come desktop app usando un launcher separato che avvia il backend e serve i file statici.
---

# Self-hosted Kestrel

L'approccio più semplice senza dipendenze aggiuntive. Un progetto `MyApp.Launcher` separato si occupa di avviare il WebAPI come child process, servire i file statici di Angular tramite un proprio mini-server Kestrel, e aprire il browser puntando all'app.

Il WebAPI rimane invariato: nessuna aggiunta di middleware per file statici, nessuna logica desktop.

Non è una vera app desktop nativa (la barra del browser è visibile), ma è sufficiente per molti casi d'uso interni.

## Struttura della soluzione

```
MyApp.sln
├── MyApp.Api/        ← WebAPI puro, invariato
├── MyApp.Frontend/   ← progetto Angular
└── MyApp.Launcher/   ← console app: avvia API + serve Angular + apre browser
```

## MyApp.Launcher

Il Launcher è una semplice console app .NET che:
1. Avvia `MyApp.Api` come child process
2. Avvia un proprio Kestrel minimale per servire i file statici di Angular
3. Aspetta che il WebAPI sia pronto
4. Apre il browser

```xml
<!-- MyApp.Launcher/MyApp.Launcher.csproj -->
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net10.0</TargetFramework>
  </PropertyGroup>
</Project>
```

```csharp
// MyApp.Launcher/Program.cs
using System.Diagnostics;
using System.Net;

const string ApiUrl      = "http://localhost:5000";
const string FrontendUrl = "http://localhost:4200";

// 1. Avvia il WebAPI come child process
var apiProcess = new Process
{
    StartInfo = new ProcessStartInfo
    {
        FileName = Path.Combine(AppContext.BaseDirectory, "api", "MyApp.Api.exe"),
        UseShellExecute = false,
        CreateNoWindow = true,
        Environment = { ["ASPNETCORE_URLS"] = ApiUrl }
    }
};
apiProcess.Start();

// 2. Avvia il server statico per Angular
var frontendHost = WebApplication.CreateBuilder(args);
frontendHost.WebHost.UseUrls(FrontendUrl);
var frontend = frontendHost.Build();

var distPath = Path.Combine(AppContext.BaseDirectory, "wwwroot");
frontend.UseDefaultFiles(new DefaultFilesOptions { FileProvider = new PhysicalFileProvider(distPath) });
frontend.UseStaticFiles(new StaticFileOptions    { FileProvider = new PhysicalFileProvider(distPath) });
// Fallback per il routing client-side di Angular
frontend.MapFallbackToFile("index.html", new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(distPath)
});

await frontend.StartAsync();

// 3. Aspetta che il WebAPI risponda
await WaitForApi(ApiUrl + "/health");

// 4. Apre il browser
Process.Start(new ProcessStartInfo(FrontendUrl) { UseShellExecute = true });

// Aspetta la chiusura del frontend (Ctrl+C o chiusura finestra)
await frontend.WaitForShutdownAsync();
apiProcess.Kill(entireProcessTree: true);

static async Task WaitForApi(string healthUrl, int maxRetries = 30)
{
    using var http = new HttpClient();
    for (var i = 0; i < maxRetries; i++)
    {
        try
        {
            var res = await http.GetAsync(healthUrl);
            if (res.IsSuccessStatusCode) return;
        }
        catch { /* non ancora pronto */ }
        await Task.Delay(500);
    }
    throw new Exception("WebAPI non raggiungibile");
}
```

Il WebAPI deve esporre un endpoint `/health` (consigliato comunque per qualsiasi servizio):

```csharp
// MyApp.Api/Program.cs — nessuna modifica al resto
app.MapHealthChecks("/health");
// oppure, minimo:
app.MapGet("/health", () => Results.Ok());
```

## Angular: URL del backend

Angular deve sapere dove chiamare il WebAPI. Usare un `environment`:

```typescript
// environments/environment.ts
export const environment = {
  apiBaseUrl: 'http://localhost:5000'
};
```

## Build e layout dell'installer

La struttura attesa nella directory di installazione:

```
MyApp/
├── MyApp.Launcher.exe   ← punto di ingresso
├── wwwroot/             ← build Angular (ng build)
│   ├── index.html
│   └── ...
└── api/                 ← dotnet publish di MyApp.Api
    ├── MyApp.Api.exe
    └── ...
```

```bash
# Pubblica il WebAPI
dotnet publish MyApp.Api -c Release -r win-x64 --self-contained -o dist/api/

# Build Angular
ng build --configuration production --output-path dist/wwwroot/

# Pubblica il Launcher
dotnet publish MyApp.Launcher -c Release -r win-x64 --self-contained -o dist/
```

## Limitazioni

- La barra degli indirizzi del browser è visibile
- Nessun controllo sulla finestra (dimensioni, posizione, icona nella taskbar)
- Se l'utente chiude il browser, il Launcher continua a girare — la gestione della chiusura va implementata (es. rilevare che il browser non ha più connessioni aperte, o usare un endpoint di shutdown)
