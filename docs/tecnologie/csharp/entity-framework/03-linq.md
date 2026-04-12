---
sidebar_position: 3
description: LINQ con Entity Framework Core — pattern comuni, proiezioni, paginazione, relazioni e limiti della traduzione SQL.
---

# LINQ con Entity Framework

## Traduzione in SQL

EF traduce le espressioni LINQ in SQL tramite expression tree. Non tutte le operazioni LINQ hanno un equivalente SQL: le operazioni che EF non sa tradurre vengono valutate **lato client** — cioè EF carica i dati e applica il filtro in C#. Questo è silenzioso e può causare query che portano in memoria interi dataset.

Le query che si vogliono eseguire integralmente su database devono usare solo operazioni traducibili. In caso di dubbio, controllare il log SQL generato.

```csharp
// Abilitare il logging delle query SQL (solo in development)
optionsBuilder.LogTo(Console.WriteLine, LogLevel.Information);
```

## Pattern comuni

### Filtro, proiezione, paginazione

```csharp
var pagina = await _db.Ordini
    .AsNoTracking()
    .Where(o => o.ClienteId == clienteId && o.Stato == StatoOrdine.Confermato)
    .OrderByDescending(o => o.DataCreazione)
    .Skip((numeroPagina - 1) * dimensionePagina)
    .Take(dimensionePagina)
    .Select(o => new OrdineDto(o.Id, o.Numero, o.DataCreazione, o.Totale))
    .ToListAsync(ct);
```

`Skip` e `Take` vengono tradotti in `OFFSET` e `LIMIT` (PostgreSQL). Richiedono sempre un `OrderBy` per risultati deterministici.

### Ricerca con conteggio totale

Per la paginazione con conteggio totale si eseguono due query separate anziché una sola complessa:

```csharp
var baseQuery = _db.Ordini
    .AsNoTracking()
    .Where(o => o.ClienteId == clienteId);

var totale = await baseQuery.CountAsync(ct);
var elementi = await baseQuery
    .OrderByDescending(o => o.DataCreazione)
    .Skip(offset)
    .Take(pageSize)
    .Select(o => new OrdineDto(o.Id, o.Numero, o.DataCreazione))
    .ToListAsync(ct);
```

### Caricamento relazioni con Include

```csharp
var ordine = await _db.Ordini
    .Include(o => o.Cliente)
    .Include(o => o.Righe)
        .ThenInclude(r => r.Prodotto)
    .FirstOrDefaultAsync(o => o.Id == id, ct);
```

`Include` genera una JOIN. Più `Include` sullo stesso livello generano query separate (split query), che in PostgreSQL è spesso più efficiente di una singola query con molte colonne duplicate:

```csharp
var ordini = await _db.Ordini
    .AsSplitQuery()          // query separate per ogni Include
    .Include(o => o.Righe)
    .Include(o => o.Note)
    .ToListAsync(ct);
```

### Proiezione con dati da relazioni

La proiezione può accedere alle navigation property senza `Include` esplicito — EF genera la JOIN automaticamente nella SELECT:

```csharp
var risultati = await _db.Ordini
    .AsNoTracking()
    .Where(o => o.Stato == StatoOrdine.Confermato)
    .Select(o => new
    {
        o.Id,
        o.Numero,
        ClienteNome = o.Cliente.Nome,           // JOIN automatica
        NumeroRighe = o.Righe.Count,            // COUNT in SQL
        Totale = o.Righe.Sum(r => r.Importo)   // SUM in SQL
    })
    .ToListAsync(ct);
```

### Any e Count

```csharp
// Esiste almeno un ordine in attesa?
bool haOrdiniInAttesa = await _db.Ordini
    .AnyAsync(o => o.ClienteId == clienteId && o.Stato == StatoOrdine.InAttesa, ct);

// Quanti ordini confermati nel mese corrente?
int conteggio = await _db.Ordini
    .CountAsync(o => o.DataCreazione.Month == DateTime.Today.Month, ct);
```

`Any` è sempre preferibile a `Count() > 0` per verificare l'esistenza: genera `EXISTS` invece di `COUNT(*)`.

## Limiti della traduzione

Alcune operazioni LINQ non vengono tradotte e causano valutazione lato client (o eccezione in EF 3+):

```csharp
// ❌ Metodi personalizzati non traducibili
.Where(o => IsOrdineValido(o))          // metodo C# — non traducibile

// ❌ Funzioni .NET senza equivalente SQL
.Where(o => o.Numero.IsNormalized())

// ✅ Alternativa: spostare la logica nel database tramite colonne calcolate o filtrare in memoria dopo la query
```

`GroupBy` lato server ha limitazioni: EF traduce solo aggregazioni semplici (`Count`, `Sum`, `Max`, `Min`, `Average`). Operazioni complesse sul gruppo richiedono valutazione lato client o SQL grezzo.

## SQL grezzo

Quando LINQ non è sufficiente — query complesse, CTE, funzioni window — si usa `FromSqlRaw` o `FromSqlInterpolated`:

```csharp
// FromSqlInterpolated è sicuro da SQL injection (usa parametri)
var ordini = await _db.Ordini
    .FromSqlInterpolated($"""
        SELECT o.*
        FROM ordini o
        WHERE o.cliente_id = {clienteId}
          AND o.data_creazione > now() - interval '30 days'
        """)
    .AsNoTracking()
    .ToListAsync(ct);
```

`FromSqlRaw` con concatenazione di stringhe è vulnerabile a SQL injection. Si usa solo con costanti o con `EF.Parameter()` per i valori dinamici.

Per operazioni che non restituiscono entità (INSERT/UPDATE/DELETE complessi, stored procedure) si usa `ExecuteSqlInterpolatedAsync`:

```csharp
await _db.Database.ExecuteSqlInterpolatedAsync(
    $"UPDATE prodotti SET scorte = scorte - {quantita} WHERE id = {prodottoId}", ct);
```
