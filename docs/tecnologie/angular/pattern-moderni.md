---
sidebar_position: 2
description: Pattern moderni Angular che sostituiscono quelli legacy.
---

# Pattern Moderni Angular

Questa sezione raccoglie i pattern moderni di Angular che **sostituiscono** le pratiche legacy. L'adozione di questi pattern è fortemente consigliata (o obbligatoria dove indicato) nei nuovi sviluppi.

---

## Signals al posto di BehaviorSubject e two-way binding

I **Signals** sono il meccanismo di reattività nativo di Angular (da v16+). Vanno preferiti a:

- `BehaviorSubject` / `Observable` per stato locale del componente
- Two-way binding con `[(ngModel)]` per valori visualizzati nel template

**Regola:** wrappare sempre con un Signal tutto ciò che si mostra nel template. Male non fa, e garantisce change detection granulare e performante.

```typescript
// ❌ Legacy
private data$ = new BehaviorSubject<string>('');

// ✅ Moderno
private data = signal<string>('');

// ❌ Legacy - computed con Observable
readonly fullName$ = combineLatest([this.firstName$, this.lastName$]).pipe(
  map(([first, last]) => `${first} ${last}`)
);

// ✅ Moderno - computed signal
readonly fullName = computed(() => `${this.firstName()} ${this.lastName()}`);
```

> **Nota:** per flussi asincroni complessi (HTTP, WebSocket, eventi multipli) gli Observable RxJS restano validi. Usare `toSignal()` per convertirli in Signal quando servono nel template.

---

## Reactive Forms al posto di ngModel

**`ngModel` (template-driven forms) è vietato.** Usare sempre **Reactive Forms**.

```typescript
// ❌ Vietato
<input [(ngModel)]="name">

// ✅ Obbligatorio
readonly form = new FormGroup({
  name: new FormControl('')
});
```

Motivazioni:

- Tipizzazione forte
- Testabilità
- Validazione centralizzata
- Composabilità

---

## Signal Forms (preferibili a Reactive Forms)

Le **Signal-based Forms** sono il futuro dei form in Angular. Se disponibili nella versione in uso, vanno **preferite** ai Reactive Forms classici.

> ⚠️ **Nota:** verificare lo stato di rilascio nella propria versione di Angular. Potrebbero essere ancora in developer preview. I Reactive Forms classici restano comunque validi e **non sono deprecati**.

---

## Control Flow (`@if`, `@for`, `@switch`) al posto delle direttive strutturali

La nuova sintassi **Control Flow** (da Angular 17) sostituisce le direttive strutturali e l'uso di `<ng-container>`:

```html
<!-- ❌ Legacy -->
<ng-container *ngIf="isVisible">
  <p>Contenuto</p>
</ng-container>

<ng-container *ngFor="let item of items; trackBy: trackById">
  <div>{{ item.name }}</div>
</ng-container>

<ng-container [ngSwitch]="status">
  <p *ngSwitchCase="'active'">Attivo</p>
  <p *ngSwitchDefault>Inattivo</p>
</ng-container>

<!-- ✅ Moderno -->
@if (isVisible) {
  <p>Contenuto</p>
}

@for (item of items; track item.id) {
  <div>{{ item.name }}</div>
}

@switch (status) {
  @case ('active') {
    <p>Attivo</p>
  }
  @default {
    <p>Inattivo</p>
  }
}
```

Vantaggi:

- Nessun import necessario (built-in nel framework)
- Sintassi più leggibile
- `@for` richiede `track` obbligatorio (migliori performance)
- `@empty` block disponibile per liste vuote

---

## Standalone Components (no NgModule)

Da Angular 17+ i componenti sono **standalone per default**. Non usare più `NgModule` per dichiarare componenti.

```typescript
// ❌ Legacy
@NgModule({
  declarations: [MyComponent],
  imports: [CommonModule]
})
export class MyModule {}

// ✅ Moderno
@Component({
  selector: 'app-my',
  standalone: true,
  imports: [OtherComponent],
  template: `...`
})
export class MyComponent {}
```

---

## `inject()` al posto dell'injection nel constructor

Preferire la funzione `inject()` rispetto all'injection tramite parametri del constructor.

```typescript
// ❌ Legacy
constructor(private readonly http: HttpClient) {}

// ✅ Moderno
private readonly http = inject(HttpClient);
```

Vantaggi:

- Funziona in contesti non-class (functional guards, resolvers)
- Non richiede decoratori
- Più facile da refactorare

---

## `input()` e `output()` al posto dei decoratori

Le funzioni `input()` e `output()` sostituiscono `@Input()` e `@Output()`:

```typescript
// ❌ Legacy
@Input() name: string = '';
@Output() clicked = new EventEmitter<void>();

// ✅ Moderno
readonly name = input<string>('');
readonly clicked = output<void>();
```

`input()` restituisce un Signal, integrando perfettamente con il sistema di reattività.

---

## `takeUntilDestroyed()` al posto di unsubscribe manuale

Non gestire più manualmente le subscription con `ngOnDestroy`. Usare `takeUntilDestroyed()`:

```typescript
// ❌ Legacy
private destroy$ = new Subject<void>();

ngOnInit() {
  this.data$.pipe(takeUntil(this.destroy$)).subscribe(...);
}

ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}

// ✅ Moderno
private destroyRef = inject(DestroyRef);

ngOnInit() {
  this.data$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(...);
}
```

> Se usato nel constructor o in un campo, `DestroyRef` non serve esplicitamente:
> ```typescript
> readonly data = toSignal(this.http.get('/api/data'));
> ```

---

## Functional Guards e Resolvers

Le classi guard/resolver con interfaccia (`CanActivate`, `Resolve`, ecc.) sono **deprecate**. Usare funzioni:

```typescript
// ❌ Legacy
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  canActivate(): boolean { ... }
}

// ✅ Moderno
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn();
};
```

---

## Riepilogo Rapido

| Legacy | Moderno | Stato |
|--------|---------|-------|
| `BehaviorSubject` per stato UI | `signal()` / `computed()` | ✅ Preferire sempre |
| `ngModel` (template-driven) | Reactive Forms | 🚫 ngModel vietato |
| Reactive Forms | Signal Forms | ⚡ Preferire se disponibili |
| `*ngIf`, `*ngFor`, `ngSwitch` | `@if`, `@for`, `@switch` | ✅ Preferire sempre |
| `NgModule` | Standalone components | ✅ Preferire sempre |
| Constructor injection | `inject()` | ✅ Preferire sempre |
| `@Input()` / `@Output()` | `input()` / `output()` | ✅ Preferire sempre |
| `takeUntil` + `ngOnDestroy` | `takeUntilDestroyed()` | ✅ Preferire sempre |
| Class guards/resolvers | Functional guards/resolvers | ✅ Preferire sempre |
