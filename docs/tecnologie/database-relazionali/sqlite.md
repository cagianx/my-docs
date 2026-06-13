---
sidebar_position: 2
description: "Convenzioni per SQLite: rowid, INTEGER PRIMARY KEY come alias del rowid e tabelle WITHOUT ROWID per il clustering semantico."
---

# SQLite

SQLite memorizza ogni tabella come un B-tree. Capire **su quale chiave** quel B-tree è ordinato è la chiave per applicare le [best practice sugli indici](best-practice/indici.md).

## Il rowid è il clustered index

Per default ogni tabella ha una colonna implicita `rowid`: un intero a 64 bit che è la **chiave di ordinamento fisico** del B-tree. È il clustered index di SQLite, anche se non si chiama così.

Quando si dichiara una colonna come `INTEGER PRIMARY KEY`, questa diventa un **alias del `rowid`**: non si crea una colonna in più, la PK *è* il rowid e quindi la chiave fisica.

```sql
CREATE TABLE movimenti (
    id      INTEGER PRIMARY KEY,   -- alias di rowid: ordina fisicamente per inserimento
    conto   INTEGER NOT NULL,
    data    TEXT    NOT NULL,
    importo INTEGER NOT NULL
);
```

Questa è esattamente la situazione che le best practice sconsigliano di subire passivamente: la tabella è ordinata per ordine di inserimento, non per il criterio con cui la si legge.

:::warning Attenzione all'alias
`INTEGER PRIMARY KEY` diventa alias del rowid solo con il tipo esatto `INTEGER`. Scrivere `INT PRIMARY KEY` (o qualsiasi altra affinità) crea invece una normale PK separata e lascia il rowid nascosto: due chiavi anziché una. Se si vuole l'alias, il tipo dev'essere `INTEGER`.
:::

## Clustering semantico: tabelle WITHOUT ROWID

Per ordinare fisicamente la tabella su un criterio scelto (il caso d'uso di lettura più comune) si usa una tabella `WITHOUT ROWID`. In questo caso non esiste più il rowid: la **chiave primaria diventa direttamente la chiave di clustering** del B-tree.

```sql
CREATE TABLE movimenti (
    conto   INTEGER NOT NULL,
    data    TEXT    NOT NULL,
    seq     INTEGER NOT NULL,
    importo INTEGER NOT NULL,
    PRIMARY KEY (conto, data, seq)   -- ordinamento fisico per conto e data
) WITHOUT ROWID;
```

Qui le righe di uno stesso conto, ordinate per data, stanno fisicamente vicine: una query «movimenti del conto X tra due date» è una lettura sequenziale. La colonna `seq` rende la chiave univoca senza alterare il criterio di accesso.

`WITHOUT ROWID` conviene quando la PK è naturale e non un intero crescente, e quando si accede spesso per intervallo su quella chiave. Va valutata caso per caso: per righe larghe può aumentare la dimensione degli indici secondari, che duplicano la PK completa.

## Unicità separata dall'ordinamento

L'unicità di una chiave logica diversa da quella fisica si esprime con un indice dedicato, coerentemente con la regola generale di [non caricare l'unicità sulla chiave fisica](best-practice/indici.md#lunicità-va-in-un-indice-non-clustered-non-nel-clustered-index):

```sql
-- la tabella è ordinata per (conto, data, seq);
-- il codice di riferimento esterno dev'essere comunque univoco
CREATE UNIQUE INDEX ux_movimenti_riferimento ON movimenti (riferimento);
```

## In breve

- Il `rowid` (o l'`INTEGER PRIMARY KEY` che ne è alias) è il clustered index di default: ordina per inserimento.
- Per ordinare fisicamente su un criterio semantico si usa `WITHOUT ROWID` con una PK composita scelta sul caso d'uso di lettura.
- L'unicità di altre chiavi logiche va in indici `UNIQUE` dedicati, non nella chiave di clustering.
