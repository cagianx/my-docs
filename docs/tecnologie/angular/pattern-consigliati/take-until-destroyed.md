---
sidebar_position: 7
description: Gestione automatica delle subscription con takeUntilDestroyed().
---

# `takeUntilDestroyed()`

Per gestire automaticamente l'unsubscribe dalle subscription Observable, usare `takeUntilDestroyed()`.

## Uso con DestroyRef esplicito

Necessario quando si sottoscrive fuori dal contesto di injection (es. in `ngOnInit`):

```typescript
import { inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({ ... })
export class DataComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly dataService = inject(DataService);

  ngOnInit() {
    this.dataService.getData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => this.processData(data));
  }
}
```

## Uso nel contesto di injection (constructor/field)

Quando usato nel constructor o come inizializzazione di campo, `DestroyRef` è iniettato automaticamente:

```typescript
@Component({ ... })
export class DataComponent {
  private readonly http = inject(HttpClient);

  readonly data = toSignal(
    this.http.get<Data[]>('/api/data')
  );
}
```

> `toSignal()` gestisce automaticamente l'unsubscribe — non serve `takeUntilDestroyed` in questo caso.

## Quando serve ancora una subscription esplicita

Se si ha bisogno di side-effect da un Observable (non solo del valore nel template):

```typescript
private readonly route = inject(ActivatedRoute);
private readonly destroyRef = inject(DestroyRef);

ngOnInit() {
  this.route.params
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(params => this.loadData(params['id']));
}
```
