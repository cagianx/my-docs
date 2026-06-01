---
sidebar_position: 6
description: Funzioni input() e output() in Angular.
---

# `input()` e `output()`

Le funzioni `input()` e `output()` sono il modo consigliato per definire le proprietà di comunicazione tra componenti.

`input()` restituisce un Signal, integrando perfettamente con il sistema di reattività.

## Input

```typescript
import { input } from '@angular/core';

@Component({ ... })
export class UserCardComponent {
  // Input opzionale con default
  readonly showAvatar = input(true);

  // Input obbligatorio
  readonly user = input.required<User>();

  // Input con alias
  readonly label = input('', { alias: 'buttonLabel' });

  // Input con transform
  readonly size = input(0, { transform: numberAttribute });
}
```

### Uso nel template

```html
<app-user-card [user]="currentUser()" [showAvatar]="false" />
```

### Reagire ai cambiamenti di input

Essendo un Signal, si compone naturalmente:

```typescript
readonly userName = computed(() => this.user().name);

constructor() {
  effect(() => {
    console.log('User changed:', this.user());
  });
}
```

## Output

```typescript
import { output } from '@angular/core';

@Component({ ... })
export class SearchComponent {
  readonly searchChanged = output<string>();
  readonly formSubmitted = output<void>();

  onInput(value: string) {
    this.searchChanged.emit(value);
  }
}
```

### Uso nel template del parent

```html
<app-search (searchChanged)="handleSearch($event)" />
```

## Model (two-way binding con Signal)

Per il two-way binding basato su Signal:

```typescript
import { model } from '@angular/core';

@Component({ ... })
export class ToggleComponent {
  readonly checked = model(false);

  toggle() {
    this.checked.update(v => !v);
  }
}
```

```html
<!-- Two-way binding -->
<app-toggle [(checked)]="isEnabled" />
```
