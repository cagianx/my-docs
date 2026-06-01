---
description: Riepilogo dei pattern e pratiche consigliate per lo sviluppo Angular.
---

# Pattern Consigliati

Questa sezione raccoglie i pattern Angular da adottare nei nuovi sviluppi.

| Pattern | Stato | Dettagli |
|---------|-------|----------|
| [Signals](./signals) | ✅ Preferire sempre | Reattività nativa per stato e template |
| [Reactive Forms e Signal Forms](./forms) | 🚫 ngModel vietato | Form tipizzati e reattivi |
| [Control Flow](./control-flow) | ✅ Preferire sempre | `@if`, `@for`, `@switch` |
| [Standalone Components](./standalone-components) | ✅ Preferire sempre | No NgModule |
| [Dependency Injection con `inject()`](./inject) | ✅ Preferire sempre | Injection funzionale |
| [`input()` e `output()`](./input-output) | ✅ Preferire sempre | Sostituiscono i decoratori |
| [`takeUntilDestroyed()`](./take-until-destroyed) | ✅ Preferire sempre | Gestione automatica subscription |
| [Functional Guards e Resolvers](./functional-guards) | ✅ Preferire sempre | Guard come funzioni |
