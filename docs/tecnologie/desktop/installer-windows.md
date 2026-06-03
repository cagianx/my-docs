---
sidebar_position: 6
description: Creare installer Windows con NSIS, gestire percorsi dati e SQLite per app desktop .NET + Angular.
---

# Installer Windows con NSIS

Questa pagina copre la creazione di installer Windows per le strategie descritte in questa sezione, con particolare attenzione alla gestione dei percorsi per i dati applicativi (es. database SQLite).

NSIS (Nullsoft Scriptable Install System) è lo strumento di riferimento. È gratuito, maturo, usato da miliardi di installer Windows e supporta scenari complessi come la gestione di percorsi per utente o per macchina, aggiornamenti, disinstallazione pulita.

## Percorsi dati su Windows

Prima di scrivere l'installer, occorre decidere **dove vivono i dati dell'applicazione**. Su Windows esistono percorsi convenzionali:

| Percorso | Variabile | Uso corretto |
|---|---|---|
| `C:\Users\<user>\AppData\Roaming` | `%APPDATA%` | Dati utente che seguono il profilo (roaming) |
| `C:\Users\<user>\AppData\Local` | `%LOCALAPPDATA%` | Dati utente locali alla macchina (cache, db locale) |
| `C:\ProgramData` | `%PROGRAMDATA%` | Dati condivisi tra tutti gli utenti della macchina |
| `C:\Program Files\MyApp` | directory di installazione | **Solo file dell'applicazione, mai dati** |

Per un database SQLite la scelta dipende dalla semantica:

- **Dati per utente** (ogni utente ha il suo db) → `%LOCALAPPDATA%\MyApp\data.db`
- **Dati condivisi** (tutti gli utenti leggono/scrivono lo stesso db) → `%PROGRAMDATA%\MyApp\data.db`

Scrivere nella directory di installazione (`Program Files`) richiede privilegi amministrativi e va evitato.

## Passare il percorso all'applicazione

L'applicazione non deve assumere il percorso dei dati: va passato tramite configurazione. Il modo più pulito per un'app ASP.NET Core è tramite `appsettings.json` (scritto dall'installer) o variabile d'ambiente.

### Opzione 1: appsettings.json scritto dall'installer

L'installer crea `appsettings.json` nella directory di installazione con il percorso corretto:

```json
{
  "DataDirectory": "C:\\Users\\mario\\AppData\\Local\\MyApp"
}
```

```csharp
// Program.cs
var dataDir = builder.Configuration["DataDirectory"]
    ?? Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "MyApp");

Directory.CreateDirectory(dataDir);

builder.Services.AddDbContext<AppDbContext>(opts =>
    opts.UseSqlite($"Data Source={Path.Combine(dataDir, "data.db")}"));
```

### Opzione 2: variabile d'ambiente

L'installer imposta una variabile d'ambiente di sistema o utente:

```nsis
WriteRegStr HKCU "Environment" "MYAPP_DATA_DIR" "$LOCALAPPDATA\MyApp"
SendMessage ${HWND_BROADCAST} ${WM_SETTINGCHANGE} 0 "STR:Environment"
```

```csharp
var dataDir = Environment.GetEnvironmentVariable("MYAPP_DATA_DIR")
    ?? Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "MyApp");
```

## Script NSIS

### Struttura minima

```nsis
; installer.nsi
Unicode True

!define APP_NAME    "MyApp"
!define APP_VERSION "1.0.0"
!define APP_EXE     "MyApp.exe"
!define REG_KEY     "Software\MyApp"

Name "${APP_NAME} ${APP_VERSION}"
OutFile "MyApp-Setup-${APP_VERSION}.exe"

; Directory di installazione default
InstallDir "$PROGRAMFILES64\${APP_NAME}"
InstallDirRegKey HKLM "${REG_KEY}" "InstallDir"

RequestExecutionLevel admin  ; necessario per scrivere in Program Files

!include "MUI2.nsh"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Italian"

; ── Installazione ──────────────────────────────────────────────────────────────

Section "Applicazione" SecApp

  SetOutPath "$INSTDIR"
  File /r "publish\*.*"   ; copia tutto l'output di dotnet publish

  ; Crea la directory dati per tutti gli utenti
  CreateDirectory "$LOCALAPPDATA\${APP_NAME}"

  ; Scrivi appsettings.json con il percorso dati
  FileOpen $0 "$INSTDIR\appsettings.Production.json" w
  FileWrite $0 '{$\n'
  FileWrite $0 '  "DataDirectory": "$LOCALAPPDATA\${APP_NAME}"$\n'
  FileWrite $0 '}$\n'
  FileClose $0

  ; Shortcut nel menu Start
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortcut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}"

  ; Shortcut sul desktop
  CreateShortcut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}"

  ; Chiave di registro per la disinstallazione (visibile in "Programmi e funzionalità")
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
    "DisplayName" "${APP_NAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
    "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
    "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
    "InstallLocation" "$INSTDIR"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
    "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
    "NoRepair" 1

  ; Salva il percorso di installazione
  WriteRegStr HKLM "${REG_KEY}" "InstallDir" "$INSTDIR"

  WriteUninstaller "$INSTDIR\Uninstall.exe"

SectionEnd

; ── Disinstallazione ───────────────────────────────────────────────────────────

Section "Uninstall"

  ; Rimuovi i file dell'applicazione
  RMDir /r "$INSTDIR"

  ; Rimuovi le shortcut
  Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
  RMDir  "$SMPROGRAMS\${APP_NAME}"
  Delete "$DESKTOP\${APP_NAME}.lnk"

  ; Rimuovi le chiavi di registro
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"
  DeleteRegKey HKLM "${REG_KEY}"

  ; NON rimuovere $LOCALAPPDATA\MyApp — contiene i dati dell'utente.
  ; Se si vuole offrire la pulizia dei dati, chiedere conferma con un MessageBox.

SectionEnd
```

### Gestione dei dati alla disinstallazione

Non eliminare mai silenziosamente i dati utente. Se si vuole offrire la pulizia:

```nsis
Section "Uninstall"

  ; ... rimozione file e shortcut ...

  MessageBox MB_YESNO "Rimuovere anche i dati dell'applicazione (database incluso)?" \
    IDNO skip_data

    RMDir /r "$LOCALAPPDATA\${APP_NAME}"

  skip_data:

SectionEnd
```

## Installer per app Electron / Electron.NET

Per le strategie basate su Electron, `electron-builder` genera l'installer NSIS automaticamente. La configurazione in `package.json`:

```json
{
  "build": {
    "appId": "com.mycompany.myapp",
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "installerLanguages": ["it"],
      "language": "1040"
    },
    "win": {
      "target": "nsis",
      "icon": "build/icon.ico"
    },
    "extraResources": [
      { "from": "backend/publish", "to": "backend" }
    ]
  }
}
```

Per aggiungere logica custom all'installer NSIS generato da electron-builder si usa un file `installer.nsh`:

```nsis
; build/installer.nsh — eseguito durante l'installazione
!macro customInstall
  ; Crea la directory dati
  CreateDirectory "$LOCALAPPDATA\MyApp"

  ; Scrivi la configurazione con il percorso dati
  FileOpen $0 "$INSTDIR\resources\app\appsettings.Production.json" w
  FileWrite $0 '{$\n  "DataDirectory": "$LOCALAPPDATA\MyApp"$\n}$\n'
  FileClose $0
!macroend

!macro customUnInstall
  MessageBox MB_YESNO "Rimuovere anche i dati dell'applicazione?" \
    IDNO +2
    RMDir /r "$LOCALAPPDATA\MyApp"
!macroend
```

```json
{
  "build": {
    "nsis": {
      "include": "build/installer.nsh"
    }
  }
}
```

## Build dell'installer

### App .NET standalone

```bash
# 1. Pubblica il backend
dotnet publish -c Release -r win-x64 --self-contained -o publish/

# 2. Compila l'installer con NSIS
makensis installer.nsi
# oppure, se NSIS è nel PATH:
# Output: MyApp-Setup-1.0.0.exe
```

### App Electron

```bash
npm run build           # compila Angular
electron-builder --win  # genera MyApp-Setup-1.0.0.exe in dist/
```

## Firma del codice (code signing)

Un installer non firmato mostra l'avviso SmartScreen di Windows. Per firmarlo:

```bash
# Con un certificato .pfx
signtool sign /f cert.pfx /p password /t http://timestamp.digicert.com /fd SHA256 MyApp-Setup-1.0.0.exe
```

Per electron-builder, configurare in `package.json`:

```json
{
  "build": {
    "win": {
      "certificateFile": "cert.pfx",
      "certificatePassword": "${CSC_KEY_PASSWORD}"
    }
  }
}
```

La variabile d'ambiente `CSC_KEY_PASSWORD` va impostata in CI, mai hardcoded nel file di configurazione.
