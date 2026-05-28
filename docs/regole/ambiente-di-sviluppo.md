---
sidebar_position: 3
---

# Ambiente di Sviluppo

## Principio

Deve essere semplice far partire un progetto prendendolo dai sorgenti. L'ideale è che appena fatto il clone si giri la chiave e tutto si accenda: nessuna configurazione manuale, nessun prerequisito implicito, nessun passaggio non documentato.

Un ambiente difficile da avviare è un costo nascosto: rallenta chi inizia, scoraggia i contributi, e introduce errori dovuti a setup incompleti o divergenti.

## Avvio in pochi comandi

Un buon progetto si avvia in pochi comandi. L'obiettivo è ridurre al minimo i passaggi tra il clone e l'esecuzione:

```bash
git clone <url-del-progetto>
cd <nome-progetto>
npm install && npm start   # esempio — i comandi variano per progetto
```

Meno passaggi ci sono, meglio è. Se servono più di tre comandi, probabilmente c'è margine per automatizzare.

## Prerequisiti espliciti

Tutto ciò che è necessario per far funzionare il progetto deve essere dichiarato esplicitamente. Nessun prerequisito può essere dato per scontato.

- Versioni runtime (es. Node.js, Python, Java, .NET)
- Package manager o strumenti di build
- Servizi esterni (es. database, container runtime)
- Variabili d'ambiente obbligatorie

Se un prerequisito non è documentato, per chi arriva non esiste.

## Regole operative

- Se aggiungi un prerequisito, documentalo immediatamente nel README.
- Se aggiungi uno step di setup, automatizzalo oppure documentalo. Mai darlo per scontato.
- Il README è la porta d'ingresso: deve sempre riflettere la realtà corrente del progetto.
- Preferisci strumenti che si installano con il progetto (es. dipendenze locali) a quelli che richiedono installazione globale.
