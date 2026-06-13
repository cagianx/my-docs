---
sidebar_position: 5
description: Usare Tauri con Angular come frontend e ASP.NET Core come processo sidecar.
---

# Tauri

Tauri è un framework per applicazioni desktop che usa il webview nativo del sistema operativo (WebKit su macOS/Linux, WebView2 su Windows) invece di includere Chromium. Il risultato è un bundle molto più leggero rispetto a Electron (~5–15 MB).

Il backend nativo di Tauri è in **Rust**. ASP.NET Core non può girare in-process: viene avviato come **processo sidecar**, ovvero un eseguibile esterno gestito da Tauri che viene avviato e terminato insieme all'app.

## Quando ha senso

Tauri è giustificato quando il bundle size è un requisito stringente (distribuzione su banda limitata, ambienti con storage ridotto) e si è disposti a gestire la complessità aggiuntiva del sidecar.

## Struttura del progetto

```
my-app/
├── src-tauri/           ← progetto Rust + configurazione Tauri
│   ├── src/main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── frontend/            ← progetto Angular
└── backend/             ← progetto ASP.NET Core (compilato come sidecar)
```

## Configurare il sidecar

Il backend ASP.NET Core viene dichiarato come sidecar in `tauri.conf.json`. Tauri lo avvia automaticamente all'apertura dell'app e lo termina alla chiusura.

```json
// src-tauri/tauri.conf.json
{
  "bundle": {
    "externalBin": ["binaries/MyApi"]
  },
  "app": {
    "security": {
      "capabilities": []
    }
  }
}
```

Il binario del backend va compilato come self-contained e copiato in `src-tauri/binaries/` con il suffisso del target corrente (es. `MyApi-x86_64-pc-windows-msvc.exe`). Tauri cerca il binario con quel pattern.

```bash
# Pubblicare il backend come self-contained
dotnet publish backend/ -c Release -r win-x64 --self-contained -o src-tauri/binaries/
# Rinominare: MyApi.exe → MyApi-x86_64-pc-windows-msvc.exe
```

## Avviare il sidecar da Rust

```rust
// src-tauri/src/main.rs
use tauri::Manager;
use tauri_plugin_shell::ShellExt;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let handle = app.handle().clone();

            tauri::async_runtime::spawn(async move {
                handle
                    .shell()
                    .sidecar("MyApi")
                    .expect("sidecar non trovato")
                    .spawn()
                    .expect("impossibile avviare il backend");
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("errore avvio Tauri");
}
```

## Frontend Angular

Angular comunica con il backend C# tramite HTTP normale su `localhost`. La configurazione è identica all'approccio Electron puro: un interceptor che aggiunge l'URL base.

```typescript
// environment.ts
export const environment = {
  apiBaseUrl: 'http://localhost:5000'
};
```

Per richiamare funzionalità native (dialogo file, notifiche) si può usare il plugin Tauri via `@tauri-apps/api`:

```bash
npm install @tauri-apps/api
```

```typescript
import { open } from '@tauri-apps/plugin-dialog';

const filePath = await open({
  multiple: false,
  filters: [{ name: 'PDF', extensions: ['pdf'] }]
});
```

## Build

```bash
npm run tauri build
```

L'output contiene l'installer per la piattaforma corrente. Per build cross-platform si usa GitHub Actions con runner distinti per Windows, macOS e Linux.

## Limitazioni

- ASP.NET Core non è in-process: la sincronizzazione avvio sidecar / apertura webview va gestita (polling su `/health` o attesa su stdout del sidecar)
- Il binding nativo Rust ↔ Angular è più verboso rispetto a Electron (IPC via comandi Tauri)
- Il webview nativo può avere comportamenti diversi tra piattaforme (WebKit su macOS/Linux vs WebView2 su Windows): testare su tutte le piattaforme target
- Richiede una toolchain Rust installata in sviluppo
