---
sidebar_position: 4
title: PostgreSQL
description: Convenzioni per PostgreSQL — heap senza clustering persistente, comando CLUSTER, indici copertura, partizionamento e BRIN.
---

import TechIcon from '@site/src/components/TechIcon';

# PostgreSQL <TechIcon name="postgres" size={30} className="tech-badge" />

PostgreSQL è il caso in cui le [best practice sugli indici](best-practice/indici.md) vanno **tradotte**, non applicate alla lettera: il motore **non ha un clustered index persistente**.

## Niente clustered index: la tabella è una heap

In PostgreSQL i dati di una tabella vivono in una *heap*: le righe non hanno un ordine fisico garantito. La chiave primaria è semplicemente un **indice B-tree univoco** — non riordina la tabella e non è una chiave di clustering.

> La PK in PostgreSQL **non** ordina fisicamente i dati. Chi arriva da SQL Server o SQLite deve disinnescare questa aspettativa.

Di conseguenza l'errore «clustered index lasciato di default sull'ID» qui non esiste come tale: *nessun* indice ordina la tabella in modo permanente. Il problema che le best practice risolvono — far coincidere l'ordine fisico con il criterio di lettura — si affronta con strumenti diversi.

## Avvicinarsi al clustering

### `CLUSTER`: riordino una tantum

Il comando `CLUSTER` riordina fisicamente la heap secondo un indice esistente:

```sql
CLUSTER movimenti USING ix_movimenti_conto_data;
```

L'ordinamento **non viene mantenuto**: gli `INSERT` e gli `UPDATE` successivi finiscono di nuovo in posizioni arbitrarie. È un'operazione di manutenzione periodica (richiede un lock esclusivo), non una proprietà permanente della tabella. Utile per tabelle prevalentemente in lettura, ricaricate a blocchi.

### Partizionamento: il sostituto strutturale

Per ottenere località di accesso stabile sul criterio più comune, la strada idiomatica è il **partizionamento dichiarativo**: si spezza la tabella per intervallo o per lista sulla colonna di accesso (tipicamente la data o il tenant).

```sql
CREATE TABLE movimenti (
    id      bigint GENERATED ALWAYS AS IDENTITY,
    conto   int   NOT NULL,
    data    date  NOT NULL,
    importo numeric(18,2) NOT NULL
) PARTITION BY RANGE (data);

CREATE TABLE movimenti_2026 PARTITION OF movimenti
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

Una query per intervallo di date tocca solo le partizioni interessate (*partition pruning*): è l'equivalente strutturale di una tabella ordinata per data.

### BRIN: indice per dati naturalmente ordinati

Quando i dati arrivano già in ordine fisico approssimato (tipico delle serie temporali append-only), un indice **BRIN** è molto più piccolo di un B-tree e copre bene le query a intervallo:

```sql
CREATE INDEX ix_movimenti_data_brin ON movimenti USING brin (data);
```

## Unicità in indici dedicati

La separazione tra unicità e ordinamento è naturale in PostgreSQL, perché nessun indice ordina la tabella: l'unicità sta sempre in un indice (o vincolo) dedicato, mai legata a una chiave di clustering.

```sql
ALTER TABLE movimenti ADD CONSTRAINT ux_movimenti_riferimento UNIQUE (riferimento);
```

## Indici di copertura

Anche PostgreSQL supporta gli indici di copertura con `INCLUDE`, per servire una query senza accedere alla heap (*index-only scan*):

```sql
CREATE INDEX ix_movimenti_conto_data ON movimenti (conto, data) INCLUDE (importo);
```

## In breve

- In PostgreSQL **non esiste un clustered index persistente**: la tabella è una heap e la PK è solo un indice univoco.
- Per la località di accesso si usano **partizionamento** (soluzione strutturale stabile), `CLUSTER` (riordino una tantum) o **BRIN** (dati già ordinati).
- L'unicità sta sempre in vincoli/indici dedicati, coerentemente con la [regola generale](best-practice/indici.md#lunicità-va-in-un-indice-non-clustered-non-nel-clustered-index).
