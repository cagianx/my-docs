---
sidebar_position: 0
description: Strategie per distribuire un'applicazione C# WebAPI + Angular come app desktop.
---

# WebAPI + Angular come app desktop

Una soluzione C# WebAPI + Angular può essere distribuita come applicazione desktop senza riscrivere il frontend né il backend. Le strategie disponibili differiscono per complessità, peso del pacchetto, portabilità e grado di integrazione con il sistema operativo.

## Confronto

| Strategia | Cross-platform | Peso bundle | Backend | Complessità |
|---|---|---|---|---|
| [Self-hosted Kestrel](./self-hosted-kestrel.md) | Sì | Minimo | In-process | Bassa |
| [Electron.NET](./electron-net.md) | Sì | ~150 MB+ | In-process | Media |
| [Electron puro](./electron-puro.md) | Sì | ~150 MB+ | Child process | Alta |
| [WebView2](./webview2.md) | Solo Windows | Leggero | In-process | Media |
| [Tauri](./tauri.md) | Sì | ~10 MB | Sidecar esterno | Alta |

Per la distribuzione su Windows — installer, percorsi dati, SQLite — vedere [Installer Windows con NSIS](./installer-windows.md).

## Come scegliere

```
Serve cross-platform?
├── No (solo Windows)
│   └── → WebView2  (leggero, Edge già installato)
└── Sì
    ├── Il bundle size è un vincolo?
    │   ├── Sì → Self-hosted Kestrel  (minimo) o Tauri (leggero, ma backend sidecar)
    │   └── No
    │       ├── Vuoi un'integrazione stretta ASP.NET Core + shell desktop?
    │       │   ├── Sì → Electron.NET
    │       │   └── No → Electron puro
    │       └── Non hai vincoli particolari → Self-hosted Kestrel
```

### Nota su Tauri

Tauri usa il webview nativo del sistema operativo (WebKit su macOS/Linux, WebView2 su Windows) e un backend nativo in Rust. L'API C# non può girare in-process: va avviata come processo separato (sidecar). Tauri è la scelta giusta solo se il bundle size è un requisito stringente e si è disposti a gestire il ciclo di vita del processo backend separatamente.
