---
sidebar_position: 1
description: Usare i Signals come meccanismo di reattività in Angular.
---

# Signals

I **Signals** sono il meccanismo di reattività nativo di Angular. Vanno preferiti a `BehaviorSubject` e al two-way binding per gestire lo stato visualizzato nel template.

**Regola:** wrappare sempre con un Signal tutto ciò che si mostra nel template. Garantisce change detection granulare e performante.

## Uso base

```typescript
import { signal, computed } from '@angular/core';

// Stato reattivo
readonly count = signal(0);

// Valore derivato
readonly double = computed(() => this.count() * 2);

// Aggiornamento
increment() {
  this.count.update(v => v + 1);
}
```

## Computed signals

```typescript
readonly firstName = signal('Mario');
readonly lastName = signal('Rossi');
readonly fullName = computed(() => `${this.firstName()} ${this.lastName()}`);
```

## Conversione da Observable

Per flussi asincroni (HTTP, WebSocket) gli Observable RxJS restano validi. Convertire in Signal quando servono nel template:

```typescript
import { toSignal } from '@angular/core/rxjs-interop';

private readonly http = inject(HttpClient);
readonly users = toSignal(this.http.get<User[]>('/api/users'), { initialValue: [] });
```

## Effect

Per eseguire side-effect quando un signal cambia:

```typescript
effect(() => {
  console.log('Count changed:', this.count());
});
```

## Nel template

```html
<p>{{ count() }}</p>
<p>{{ fullName() }}</p>
```
