---
sidebar_position: 3
description: Sintassi Control Flow in Angular (@if, @for, @switch).
---

# Control Flow

La sintassi **Control Flow** (`@if`, `@for`, `@switch`) è il modo consigliato per gestire la logica condizionale e iterativa nei template Angular.

Vantaggi:

- Nessun import necessario (built-in nel framework)
- Sintassi più leggibile
- `@for` richiede `track` obbligatorio (migliori performance)
- `@empty` block disponibile per liste vuote

## `@if`

```html
@if (isLoggedIn()) {
  <app-dashboard />
} @else {
  <app-login />
}
```

## `@for`

```html
@for (item of items(); track item.id) {
  <app-item [data]="item" />
} @empty {
  <p>Nessun elemento trovato.</p>
}
```

> `track` è obbligatorio e migliora le performance indicando come identificare univocamente ogni elemento.

## `@switch`

```html
@switch (status()) {
  @case ('active') {
    <span class="badge-active">Attivo</span>
  }
  @case ('pending') {
    <span class="badge-pending">In attesa</span>
  }
  @default {
    <span class="badge-inactive">Inattivo</span>
  }
}
```

## `@defer`

Per il lazy loading di porzioni di template:

```html
@defer (on viewport) {
  <app-heavy-component />
} @loading {
  <p>Caricamento...</p>
} @placeholder {
  <div style="height: 200px"></div>
}
```
