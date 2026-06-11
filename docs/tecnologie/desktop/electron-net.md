---
sidebar_position: 2
title: Electron.NET
description: Usare Electron.NET in un progetto desktop separato che avvia il WebAPI come child process.
---

import TechIcon from '@site/src/components/TechIcon';

# Electron.NET <TechIcon name="electron" size={30} className="tech-badge" />

[Electron.NET](https://github.com/ElectronNET/Electron.NET) è una libreria che integra ASP.NET Core con Electron. Viene usata in un progetto `MyApp.Desktop` dedicato, separato dal WebAPI.

Il progetto Desktop ha un solo compito: aprire la shell Electron, servire i file statici di Angular, e avviare il WebAPI come child process. Il WebAPI rimane invariato.

## Struttura della soluzione

```
MyApp.sln
├── MyApp.Api/        ← WebAPI puro, invariato
├── MyApp.Frontend/   ← progetto Angular
└── MyApp.Desktop/    ← Electron.NET: shell + static files + avvio API
```

## Installazione (nel progetto Desktop)

```bash
cd MyApp.Desktop
dotnet add package ElectronNET.API
dotnet tool install ElectronNET.CLI -g
```

## MyApp.Desktop

Il progetto Desktop è una minimal ASP.NET Core app con Electron.NET. Serve solo i file statici di Angular — nessun controller, nessuna logica di business.

```xml
<!-- MyApp.Desktop/MyApp.Desktop.csproj -->
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="ElectronNET.API" Version="*" />
  </ItemGroup>
</Project>
```

```csharp
// MyApp.Desktop/Program.cs
using ElectronNET.API;
using ElectronNET.API.Entities;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseElectron(args);

var app = builder.Build();

// Serve solo i file statici di Angular — nessuna API qui
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");

if (HybridSupport.IsElectronActive)
{
    await app.StartAsync();
    StartApi();
    await WaitForApi("http://localhost:5000/health");
    await CreateWindowAsync();
    app.WaitForShutdown();
}
else
{
    app.Run();
}

void StartApi()
{
    var apiExe = Path.Combine(AppContext.BaseDirectory, "api", "MyApp.Api.exe");
    Process.Start(new ProcessStartInfo
    {
        FileName = apiExe,
        UseShellExecute = false,
        CreateNoWindow = true,
        Environment = { ["ASPNETCORE_URLS"] = "http://localhost:5000" }
    });
}

async Task WaitForApi(string healthUrl, int maxRetries = 30)
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

async Task CreateWindowAsync()
{
    var window = await Electron.WindowManager.CreateWindowAsync(new BrowserWindowOptions
    {
        Width = 1280,
        Height = 800,
        Show = false
    });

    window.OnReadyToShow += () => window.Show();
    window.SetTitle("La mia app");
}
```

La `wwwroot/` del progetto Desktop contiene la build Angular (`ng build`). Angular chiama il WebAPI su `http://localhost:5000` tramite `environment.apiBaseUrl`.

## Accesso alle API Electron da C#

Electron.NET espone le principali API Electron lato C#:

```csharp
// Dialog di apertura file
var files = await Electron.Dialog.ShowOpenDialogAsync(window, new OpenDialogOptions
{
    Properties = new[] { OpenDialogProperty.openFile },
    Filters = new[] { new FileFilter { Name = "PDF", Extensions = new[] { "pdf" } } }
});

// Notifica di sistema
Electron.Notification.Show(new NotificationOptions
{
    Title = "Operazione completata",
    Body = "Il file è stato salvato."
});

// Menu applicazione
var menu = new MenuItem[]
{
    new MenuItem
    {
        Label = "File",
        Submenu = new MenuItem[]
        {
            new MenuItem { Label = "Esci", Role = MenuRole.quit }
        }
    }
};
Electron.Menu.SetApplicationMenu(menu);
```

## Avvio in sviluppo

```bash
cd MyApp.Desktop
electronize start
```

In sviluppo è possibile configurare Angular per girare sul proprio dev server (`ng serve`) e il Desktop per fare proxy verso di esso, mantenendo l'hot reload:

```json
// MyApp.Desktop/Properties/launchSettings.json
{
  "profiles": {
    "MyApp.Desktop": {
      "commandName": "Project",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    }
  }
}
```

## Build per distribuzione

```bash
# Pubblica il WebAPI
dotnet publish MyApp.Api -c Release -r win-x64 --self-contained -o MyApp.Desktop/bin/api/

# Build Angular → wwwroot del progetto Desktop
ng build --configuration production --output-path MyApp.Desktop/wwwroot/

# Build Electron
cd MyApp.Desktop
electronize build /target win
```

L'output in `bin/Desktop/` include runtime .NET, Node.js, Chromium e il WebAPI publicato.

## Limitazioni

- Bundle pesante (~150–200 MB) per via di Chromium e Node.js
- Electron.NET segue le release di Electron con un certo ritardo
- Le API Electron più avanzate non sono sempre esposte lato C# — in quei casi occorre usare l'IPC con JavaScript
