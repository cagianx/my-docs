---
sidebar_position: 2
description: Reactive Forms e Signal Forms in Angular.
---

# Reactive Forms e Signal Forms

## Reactive Forms

**`ngModel` (template-driven forms) è vietato.** Usare sempre **Reactive Forms**.

Motivazioni:

- Tipizzazione forte
- Testabilità
- Validazione centralizzata
- Composabilità

### Esempio base

```typescript
import { FormGroup, FormControl, Validators } from '@angular/forms';

readonly form = new FormGroup({
  name: new FormControl('', Validators.required),
  email: new FormControl('', [Validators.required, Validators.email])
});
```

```html
<form [formGroup]="form" (ngSubmit)="onSubmit()">
  <input formControlName="name" />
  <input formControlName="email" />
  <button type="submit" [disabled]="form.invalid">Invia</button>
</form>
```

### Typed Forms

Dalla v14+ i Reactive Forms sono fortemente tipizzati:

```typescript
readonly form = new FormGroup({
  name: new FormControl<string>('', { nonNullable: true }),
  age: new FormControl<number | null>(null)
});

// form.value è tipizzato correttamente
const name: string = this.form.controls.name.value;
```

### FormBuilder

```typescript
private readonly fb = inject(FormBuilder);

readonly form = this.fb.nonNullable.group({
  name: ['', Validators.required],
  email: ['', [Validators.required, Validators.email]]
});
```

### Validazione custom

```typescript
function minAge(min: number): ValidatorFn {
  return (control: AbstractControl) => {
    const value = control.value;
    return value >= min ? null : { minAge: { required: min, actual: value } };
  };
}
```

---

## Signal Forms

Le **Signal-based Forms** vanno preferite ai Reactive Forms classici se disponibili nella versione in uso.

> ⚠️ Verificare lo stato di rilascio nella propria versione di Angular. Potrebbero essere ancora in developer preview. I Reactive Forms classici restano comunque validi e **non sono deprecati**.

Vantaggi rispetto ai Reactive Forms:

- Integrazione nativa con il sistema di Signals
- Nessun bisogno di `valueChanges` Observable
- Reattività granulare automatica
