---
sidebar_position: 4
description: Usare WebView2 su Windows in un progetto WPF separato che avvia il WebAPI come child process.
---

# WebView2 (Windows)

WebView2 è il controllo browser di Microsoft basato su Chromium Edge. Permette di ospitare una webview all'interno di un'applicazione WPF, WinForms o WinUI, senza includere Chromium nel pacchetto: usa il runtime Edge già installato sul sistema.

Il progetto WPF (`MyApp.Desktop`) è completamente separato dal WebAPI. Avvia il backend come child process e carica Angular direttamente dalla cartella locale tramite un host virtuale — senza bisogno di un server HTTP per i file statici.

:::info Solo Windows
WebView2 è disponibile solo su Windows. Su macOS e Linux non esiste un equivalente diretto — per cross-platform si usano Electron.NET o Electron puro.
:::

## Struttura della soluzione

```
MyApp.sln
├── MyApp.Api/        ← WebAPI puro, invariato
├── MyApp.Frontend/   ← progetto Angular
└── MyApp.Desktop/    ← WPF app: WebView2 + avvio API come child process
```

## Progetto Desktop (WPF)

```xml
<!-- MyApp.Desktop/MyApp.Desktop.csproj -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net10.0-windows</TargetFramework>
    <UseWPF>true</UseWPF>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.Web.WebView2" Version="*" />
  </ItemGroup>
</Project>
```

## Avvio del WebAPI come child process

```csharp
// MyApp.Desktop/App.xaml.cs
public partial class App : Application
{
    private Process? _apiProcess;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        _apiProcess = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = Path.Combine(AppContext.BaseDirectory, "api", "MyApp.Api.exe"),
                UseShellExecute = false,
                CreateNoWindow = true,
                Environment = { ["ASPNETCORE_URLS"] = "http://localhost:5000" }
            }
        };
        _apiProcess.Start();

        new MainWindow().Show();
    }

    protected override void OnExit(ExitEventArgs e)
    {
        _apiProcess?.Kill(entireProcessTree: true);
        base.OnExit(e);
    }
}
```

## Finestra WPF con WebView2

```xml
<!-- MyApp.Desktop/MainWindow.xaml -->
<Window x:Class="MyApp.Desktop.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:wv2="clr-namespace:Microsoft.Web.WebView2.Wpf;assembly=Microsoft.Web.WebView2.Wpf"
        Title="La mia app" Width="1280" Height="800">
  <Grid>
    <wv2:WebView2 x:Name="WebView" />
  </Grid>
</Window>
```

```csharp
// MyApp.Desktop/MainWindow.xaml.cs
public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        Loaded += OnLoaded;
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        await WebView.EnsureCoreWebView2Async();

        // Mappa un hostname virtuale alla cartella wwwroot locale (Angular build)
        // Nessun server HTTP necessario per i file statici
        var distPath = Path.Combine(AppContext.BaseDirectory, "wwwroot");
        WebView.CoreWebView2.SetVirtualHostNameToFolderMapping(
            "myapp.local",
            distPath,
            CoreWebView2HostResourceAccessKind.Allow);

        await WaitForApi();
        WebView.Source = new Uri("http://myapp.local/index.html");
    }

    private static async Task WaitForApi(int maxRetries = 30)
    {
        using var http = new HttpClient();
        for (var i = 0; i < maxRetries; i++)
        {
            try
            {
                var res = await http.GetAsync("http://localhost:5000/health");
                if (res.IsSuccessStatusCode) return;
            }
            catch { /* non ancora pronto */ }
            await Task.Delay(500);
        }
        throw new Exception("WebAPI non raggiungibile");
    }
}
```

`SetVirtualHostNameToFolderMapping` mappa `http://myapp.local/` alla cartella locale. Non è necessario nessun server HTTP per servire Angular: WebView2 risolve i file direttamente dal filesystem, con supporto corretto per il routing client-side di Angular.

## Angular: routing client-side

Con l'host virtuale WebView2 gestisce i percorsi come un server reale. Configurare Angular con `PathLocationStrategy` (default) funziona correttamente, a patto che ogni percorso non trovato venga reindirizzato a `index.html`. In questo caso il redirect va configurato lato app, non lato server, usando il fallback di Angular stesso:

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding())
  ]
};
```

## Comunicazione nativa: da Angular a WPF

WebView2 permette di esporre oggetti .NET direttamente a JavaScript tramite `AddHostObjectToScript`:

```csharp
// MainWindow.xaml.cs — dopo EnsureCoreWebView2Async
WebView.CoreWebView2.AddHostObjectToScript("nativeApp", new NativeBridge());
```

```csharp
[ClassInterface(ClassInterfaceType.AutoDual)]
[ComVisible(true)]
public class NativeBridge
{
    public string OpenFileDialog()
    {
        var dialog = new OpenFileDialog();
        return dialog.ShowDialog() == true ? dialog.FileName : string.Empty;
    }
}
```

```typescript
// Angular
declare const window: Window & {
  chrome: { webview: { hostObjects: { nativeApp: { openFileDialog: () => Promise<string> } } } }
};

const filePath = await window.chrome.webview.hostObjects.nativeApp.openFileDialog();
```

## Build e layout dell'installer

```
MyApp/
├── MyApp.Desktop.exe   ← punto di ingresso
├── wwwroot/            ← build Angular (ng build)
│   ├── index.html
│   └── ...
└── api/                ← dotnet publish di MyApp.Api
    ├── MyApp.Api.exe
    └── ...
```

```bash
dotnet publish MyApp.Api     -c Release -r win-x64 --self-contained -o dist/api/
ng build --configuration production --output-path dist/wwwroot/
dotnet publish MyApp.Desktop -c Release -r win-x64 --self-contained -o dist/
```

## Limitazioni

- Solo Windows (richiede Windows 10 1803+ con Edge installato, oppure il runtime WebView2 ridistribuibile)
- Il progetto Desktop deve essere `net10.0-windows` — non gira su Linux/macOS
- L'integrazione JavaScript ↔ .NET tramite `AddHostObjectToScript` usa COM interop, che richiede `[ComVisible(true)]` e `ClassInterfaceType.AutoDual`
