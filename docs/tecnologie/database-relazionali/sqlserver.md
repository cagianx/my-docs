---
sidebar_position: 3
title: SQL Server
description: Convenzioni per SQL Server — clustered index esplicito sul caso d'uso, primary key non clustered e unicità in indici dedicati.
---

import TechIcon from '@site/src/components/TechIcon';

# SQL Server <TechIcon name="sqlserver" size={30} className="tech-badge" />

SQL Server è il motore in cui le [best practice sugli indici](best-practice/indici.md) hanno l'impatto più diretto, perché il clustered index è un concetto di prima classe — e il suo default è proprio quello da evitare.

## Il default da non subire

Quando si dichiara una `PRIMARY KEY`, SQL Server per default la rende **clustered**. Se la PK è una `ID` surrogata `IDENTITY`, la tabella finisce ordinata fisicamente per ordine di inserimento:

```sql
-- default implicito: PK clustered sull'ID auto-incrementale
CREATE TABLE Movimenti (
    Id      INT IDENTITY PRIMARY KEY,   -- diventa il clustered index
    Conto   INT          NOT NULL,
    Data    DATE         NOT NULL,
    Importo DECIMAL(18,2) NOT NULL
);
```

È comodo per gli `INSERT` (sempre in coda, niente page split) ma raramente è l'ordinamento giusto per le letture.

## Clustered index sul caso d'uso, PK non clustered

La pratica corretta è **scegliere il clustered index sul criterio di accesso più comune** e dichiarare esplicitamente la PK come `NONCLUSTERED`, così l'unicità della chiave logica non vincola l'ordinamento fisico:

```sql
CREATE TABLE Movimenti (
    Id      INT IDENTITY NOT NULL,
    Conto   INT          NOT NULL,
    Data    DATE         NOT NULL,
    Importo DECIMAL(18,2) NOT NULL,

    -- la PK garantisce l'unicità, ma NON ordina la tabella
    CONSTRAINT PK_Movimenti PRIMARY KEY NONCLUSTERED (Id)
);

-- la tabella è ordinata fisicamente sul caso d'uso più comune:
-- lettura dei movimenti di un conto per intervallo di date
CREATE CLUSTERED INDEX IX_Movimenti_Conto_Data ON Movimenti (Conto, Data);
```

In questo modo una query «movimenti del conto X tra due date» legge pagine contigue, mentre la ricerca puntuale per `Id` resta servita dall'indice non clustered della PK.

## Mai un clustered index unique

Coerentemente con la [regola generale](best-practice/indici.md#lunicità-va-in-un-indice-non-clustered-non-nel-clustered-index), il clustered index **non si dichiara `UNIQUE`**. Oltre al fatto che l'ordinamento fisico segue un criterio di accesso quasi sempre non univoco (più movimenti nello stesso giorno per lo stesso conto), c'è la ragione decisiva: cambiare il clustered index in SQL Server significa **ricostruire l'intera tabella** (`DROP`/`CREATE` del clustered, con riscrittura di tutti i dati e dei lookup negli indici secondari). L'unicità invece è un requisito applicativo mutevole: tenuta in un indice **non clustered** dedicato, si può ridefinire con `DROP INDEX` / `CREATE UNIQUE INDEX` su un altro insieme di colonne senza toccare la struttura fisica.

```sql
-- chiave naturale che deve restare univoca, senza toccare l'ordinamento fisico
CREATE UNIQUE NONCLUSTERED INDEX UX_Movimenti_Riferimento ON Movimenti (Riferimento);
```

:::warning Clustering key duplicata ovunque
In SQL Server ogni indice non clustered contiene al suo interno la clustering key. Una chiave di clustering larga (molte colonne, tipi grandi) gonfia *tutti* gli indici secondari. Si preferisce una chiave di clustering stretta e selettiva.
:::

## Indici di copertura

Quando una query frequente legge poche colonne, conviene includerle nell'indice non clustered con la clausola `INCLUDE`: l'indice «copre» la query e si evita l'accesso alla tabella (lookup sul clustered index).

```sql
CREATE NONCLUSTERED INDEX IX_Movimenti_Conto_Data
    ON Movimenti (Conto, Data)
    INCLUDE (Importo);
```

## In breve

- Non lasciare la PK `IDENTITY` come clustered index per inerzia.
- Dichiarare la PK `NONCLUSTERED` e creare il `CLUSTERED INDEX` sul criterio di lettura più comune.
- Il clustered index non è mai `UNIQUE`; l'unicità sta in indici `UNIQUE NONCLUSTERED`.
- Tenere la clustering key stretta: viene duplicata in ogni indice secondario.
