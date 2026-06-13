---
sidebar_position: 3
title: Electron puro
description: Integrare Electron con Angular e ASP.NET Core avviato come child process.
---

import TechIcon from '@site/src/components/TechIcon';

# Electron puro <TechIcon name="electron" size={30} className="tech-badge" />

In questo approccio Electron gestisce direttamente la shell desktop. Il processo principale di Electron avvia il backend ASP.NET Core come child process, attende che sia pronto ad accettare richieste, poi apre la `BrowserWindow` con la build Angular.

Rispetto a Electron.NET non ci sono librerie intermediarie: si usa Electron direttamente, con tutto il controllo e la responsabilità che ne consegue.

## Struttura del progetto

```
my-app/
├── electron/
│   ├── main.js          ← processo principale Electron
│   └── package.json
├── frontend/            ← progetto Angular
└── backend/             ← progetto ASP.NET Core
```

## Processo principale Electron

```javascript
// electron/main.js
const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const BACKEND_PORT = 5000;
let backendProcess = null;
let mainWindow = null;

function startBackend() {
  const exePath = path.join(__dirname, '..', 'backend', 'publish', 'MyApi.exe');

  backendProcess = spawn(exePath, [], {
    env: { ...process.env, ASPNETCORE_URLS: `http://localhost:${BACKEND_PORT}` }
  });

  backendProcess.stdout.on('data', data => console.log(`[backend] ${data}`));
  backendProcess.stderr.on('data', data => console.error(`[backend] ${data}`));
}

function waitForBackend(retries = 20) {
  return new Promise((resolve, reject) => {
    const check = (remaining) => {
      http.get(`http://localhost:${BACKEND_PORT}/health`, res => {
        if (res.statusCode === 200) resolve();
        else retry(remaining);
      }).on('error', () => retry(remaining));
    };

    const retry = (remaining) => {
      if (remaining <= 0) return reject(new Error('Backend non raggiungibile'));
      setTimeout(() => check(remaining - 1), 500);
    };

    check(retries);
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
}

app.whenReady().then(async () => {
  startBackend();

  try {
    await waitForBackend();
    await createWindow();
  } catch (err) {
    console.error(err);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});
```

## Comunicare con il backend da Angular

Angular parla con il backend C# tramite HTTP normale, esattamente come in un'app web. L'unica differenza è che l'URL base è `http://localhost:5000` invece di un dominio remoto.

Configurare l'`HttpClient` con un token di base URL:

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    {
      provide: HTTP_INTERCEPTORS,
      useValue: {
        intercept(req: HttpRequest<unknown>, next: HttpHandler) {
          return next.handle(
            req.clone({ url: `http://localhost:5000${req.url}` })
          );
        }
      },
      multi: true
    }
  ]
};
```

## IPC: da Angular a Electron

Per accedere alle API native (dialogo file, notifiche, menu) dal frontend Angular è necessario usare l'IPC di Electron tramite un `preload.js`:

```javascript
// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  onMenuAction: (callback) => ipcRenderer.on('menu:action', callback)
});
```

```javascript
// electron/main.js: gestore IPC
const { ipcMain, dialog } = require('electron');

ipcMain.handle('dialog:openFile', async () => {
  const { filePaths } = await dialog.showOpenDialog({ properties: ['openFile'] });
  return filePaths[0] ?? null;
});
```

```typescript
// Angular: accesso all'API esposta
declare const window: Window & { electronAPI: { openFile: () => Promise<string | null> } };

const filePath = await window.electronAPI.openFile();
```

## Build e distribuzione

Usare [electron-builder](https://www.electron.build/) per creare l'installer:

```json
// electron/package.json
{
  "build": {
    "appId": "com.mycompany.myapp",
    "win": { "target": "nsis" },
    "mac": { "target": "dmg" },
    "linux": { "target": "AppImage" },
    "extraResources": [
      { "from": "../backend/publish", "to": "backend" }
    ]
  }
}
```

```bash
electron-builder --win   # Windows installer
electron-builder --mac   # macOS dmg
electron-builder --linux # AppImage
```

## Limitazioni

- Il backend C# deve essere pubblicato come self-contained prima di impacchettare con Electron
- La sincronizzazione avvio backend / apertura finestra va gestita manualmente (il polling su `/health` è fragile, preferire un socket o un segnale via stdout)
- Il bundle rimane pesante (~150–200 MB) come per qualsiasi applicazione Electron
