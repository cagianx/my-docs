---
sidebar_position: 1
description: Come scegliere l'indice che ordina fisicamente una tabella relazionale e perché l'unicità va tenuta in un indice separato.
---

# Indici e ordinamento fisico

In un database relazionale **un indice ordina i dati**: la differenza decisiva è *quali* dati ordina. L'indice che determina l'ordine fisico delle righe sul disco — il **clustered index** — è uno solo per tabella, e la sua scelta condiziona le prestazioni di tutte le letture più di qualsiasi altro indice. Va quindi progettato, non subìto.

## Il clustered index non va lasciato di default sull'ID

La scelta di default di quasi tutti gli strumenti è ordinare fisicamente la tabella sulla chiave primaria, tipicamente una `ID` surrogata auto-incrementale. È una scelta comoda — l'inserimento è sempre in coda, niente riorganizzazione delle pagine — ma è quasi sempre la *sbagliata* per chi legge.

Una `ID` auto-incrementale ordina le righe per **ordine di inserimento**. Quasi nessuna query interroga i dati in quell'ordine: si filtra per data, per cliente, per stato, per chiave esterna. Quando l'ordinamento fisico non coincide con il filtro più comune, ogni lettura significativa diventa un accesso sparso a pagine diverse del disco.

La regola è ragionare **in termini semantici**, non meccanici:

> Su quale criterio viene interrogata questa tabella nel caso d'uso più comune e generico?

La risposta è il candidato naturale per il clustered index. Esempi:

- una tabella di **movimenti** quasi sempre letta per intervallo di date → ordinare fisicamente per data (o per `(conto, data)`): la query a intervallo diventa una lettura sequenziale di pagine contigue;
- una tabella **multi-tenant** sempre filtrata per tenant → anteporre il tenant alla chiave fisica, così le righe di uno stesso tenant stanno vicine;
- una tabella di **righe di dettaglio** quasi sempre lette insieme alla testata → ordinare per la chiave esterna verso la testata, così le righe di un ordine sono fisicamente raggruppate.

Il guadagno è concreto: una scansione a intervallo su una chiave clustered ben scelta legge poche pagine consecutive invece di saltare su tutta la tabella.

:::tip Inserimento più costoso, lettura più facile
Ordinare la tabella su una chiave semantica anziché su un contatore crescente può rendere l'inserimento leggermente più costoso (le righe nuove non finiscono sempre in coda). È un caso particolare del principio [dati duttili in fase di lettura](../../../processi/analisi-tecnica/03-modellazione.md#principio-dati-duttili-in-fase-di-lettura): si sposta la fatica sulla scrittura, che avviene una volta, per rendere semplice la lettura, che avviene continuamente.
:::

## L'unicità va in un indice non clustered, non nel clustered index

Il secondo errore è far coincidere clustered index e vincolo di unicità — tipicamente perché la PK è sia la chiave logica univoca sia, per default, la chiave fisica.

Le due cose hanno scopi diversi e vanno tenute separate:

| Responsabilità | Strumento |
| --- | --- |
| Ordinare fisicamente i dati per il caso d'uso più comune | **clustered index** (scelto sul criterio di accesso) |
| Garantire che una chiave logica sia univoca | **indice non clustered, unico** |

Quindi: **non si dichiara mai il clustered index come `UNIQUE`**. L'ordinamento fisico si sceglie sul criterio di accesso (che spesso *non* è univoco: più movimenti nella stessa data, più righe per lo stesso ordine); l'unicità della chiave logica — la `ID` surrogata o la chiave naturale — si tutela con un indice **non clustered** dedicato e marcato `UNIQUE`.

### Il motivo decisivo: l'unicità deve restare modificabile

La ragione più forte per non caricare l'unicità sul clustered index è pratica, non estetica: **il clustered index non si cambia senza ricostruire la tabella**. Cambiare l'ordinamento fisico significa riscrivere fisicamente tutte le righe — un'operazione costosa, con lock pesante, impraticabile su tabelle grandi in produzione.

Ma *cosa* deve essere univoco è in buona parte un **requisito applicativo**, e i requisiti applicativi cambiano: oggi un codice è univoco da solo, domani lo diventa solo nell'ambito di un tenant; una chiave naturale che sembrava unica si rivela duplicabile. Se il vincolo di unicità vive in un indice **non clustered**, lo si può eliminare e ricreare con un altro insieme di colonne in qualsiasi momento, a costo trascurabile e senza toccare la struttura fisica della tabella.

Legare l'unicità all'ordinamento fisico, invece, accoppia due cose che cambiano a ritmi diversi: una decisione di performance stabile (come la tabella conviene leggerla) e una regola di dominio mutevole (quali chiavi sono univoche). Tenendole separate, la regola di dominio resta libera di evolvere.

### Gli altri vantaggi

- la chiave fisica resta libera di seguire il criterio di lettura, anche quando non è univoca;
- il vincolo di unicità è esplicito e isolato: si legge nello schema *cosa* deve essere univoco, indipendentemente da come la tabella è ordinata;
- le ricerche puntuali sulla chiave logica usano il loro indice non clustered, senza imporre l'ordinamento fisico all'intera tabella.

## In sintesi

1. Il clustered index è una decisione di progettazione: si sceglie sul **caso d'uso di lettura più comune**, non lasciandolo per inerzia sull'`ID` auto-incrementale.
2. Il clustered index **non deve essere unico**: l'unicità delle chiavi logiche si garantisce con indici **non clustered** dedicati. Il clustered index non si cambia senza ricostruire la tabella, mentre l'unicità è un requisito applicativo mutevole che deve restare modificabile a basso costo.

Ogni motore realizza questi due punti con strumenti propri — e alcuni (PostgreSQL) non hanno affatto un clustered index persistente. Le declinazioni concrete sono in [SQLite](../sqlite.md), [SQL Server](../sqlserver.md) e [PostgreSQL](../postgres.md).
