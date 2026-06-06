---
sidebar_position: 5
description: Best practice trasversali per i database relazionali e indicazioni specifiche per SQLite, SQL Server e PostgreSQL.
---

# Database relazionali

Questa sezione raccoglie le convenzioni sui database relazionali. È divisa in due parti:

- le **[best practice generali](best-practice/index.md)**, valide a prescindere dal motore — progettazione degli indici, scelta delle chiavi, modellazione fisica;
- una pagina **specifica per ciascun motore** adottato, che declina quelle best practice nelle peculiarità del prodotto e ne segnala i limiti.

I principi di modellazione del dato a monte (correttezza, dati duttili in lettura, vincoli espliciti) restano quelli descritti in [`processi/analisi-tecnica/modellazione`](../../processi/analisi-tecnica/03-modellazione.md). Qui si scende al livello fisico: come quei dati vengono ordinati, indicizzati e interrogati sul disco.

## Contenuto

### Best practice generali

- [Indici e ordinamento fisico](best-practice/indici.md) — clustered index ragionato sul caso d'uso, unicità separata dall'ordinamento

### Per motore

- [SQLite](sqlite.md) — `rowid`, `INTEGER PRIMARY KEY`, tabelle `WITHOUT ROWID`
- [SQL Server](sqlserver.md) — clustered index esplicito, PK non clustered, indici di copertura
- [PostgreSQL](postgres.md) — heap senza clustering persistente, `CLUSTER`, partizionamento, BRIN
