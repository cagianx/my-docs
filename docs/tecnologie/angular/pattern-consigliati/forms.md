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

### Binding diretto al controllo

Passare sempre il controllo direttamente all'input con `[formControl]`, **non** usare `formControlName`:

```typescript
import { FormGroup, FormControl, Validators } from '@angular/forms';

readonly fg = new FormGroup({
  name: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
  email: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.email] })
});
```

```html
<input [formControl]="fg.controls.name" />
<input [formControl]="fg.controls.email" />
<button [disabled]="fg.invalid" (click)="onSubmit()">Invia</button>
```

Il tag `<form>` si usa **solo** quando serve intercettare eventi nativi del browser, ad esempio il tasto Enter per fare submit:

```html
<form (ngSubmit)="onSubmit()">
  <input [formControl]="fg.controls.name" />
  <input [formControl]="fg.controls.email" />
  <button type="submit" [disabled]="fg.invalid">Invia</button>
</form>
```

### Typed Forms

Dalla v14+ i Reactive Forms sono fortemente tipizzati:

```typescript
readonly fg = new FormGroup({
  name: new FormControl<string>('', { nonNullable: true }),
  age: new FormControl<number | null>(null)
});

// fg.value è tipizzato correttamente
const name: string = this.fg.controls.name.value;
```

### Validazione custom sincrona

```typescript
function minAge(min: number): ValidatorFn {
  return (control: AbstractControl) => {
    const value = control.value;
    return value >= min ? null : { minAge: { required: min, actual: value } };
  };
}
```

### Validazione condizionale

Un validatore a livello di `FormGroup` consente di rendere un campo obbligatorio in base al valore di un altro. La logica è centralizzata nel gruppo: i singoli controlli non sanno nulla l'uno dell'altro.

```typescript
const requiredIfChecked: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const fg = group as FormGroup;
  const checked = fg.controls['hasDiscount'].value as boolean;
  const code = fg.controls['discountCode'].value as string;
  return checked && !code ? { discountCodeRequired: true } : null;
};

readonly fg = new FormGroup(
  {
    hasDiscount: new FormControl<boolean>(false, { nonNullable: true }),
    discountCode: new FormControl<string>('', { nonNullable: true })
  },
  { validators: requiredIfChecked }
);
```

L'errore vive sul gruppo, non sul controllo figlio. Nel template si legge da `fg.errors`:

```html
<input type="checkbox" [formControl]="fg.controls.hasDiscount" />
<input [formControl]="fg.controls.discountCode" />
@if (fg.errors?.['discountCodeRequired']) {
  <span>Il codice sconto è obbligatorio</span>
}
```

> Aggiornare dinamicamente i validator del controllo figlio (con `setValidators` / `updateValueAndValidity`) è una soluzione alternativa ma più fragile: disperde la logica tra costruttore e lifecycle hooks. Preferire il validatore di gruppo.

### Validazione asincrona

I validatori asincroni ricevono un `AbstractControl` e restituiscono un `Observable` o `Promise` di `ValidationErrors | null`:

```typescript
function uniqueUsernameValidator(userService: UserService): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    return userService.checkUsername(control.value).pipe(
      map(isTaken => (isTaken ? { usernameTaken: true } : null)),
      catchError(() => of(null))
    );
  };
}
```

Utilizzo con iniezione della dipendenza tramite `inject`:

```typescript
readonly fg = new FormGroup({
  username: new FormControl<string>('', {
    nonNullable: true,
    validators: Validators.required,
    asyncValidators: uniqueUsernameValidator(inject(UserService))
  })
});
```

Template per mostrare lo stato asincrono:

```html
<input [formControl]="fg.controls.username" />
@if (fg.controls.username.pending) {
  <span>Verifica in corso…</span>
}
@if (fg.controls.username.errors?.['usernameTaken']) {
  <span>Username già in uso</span>
}
```

> Per evitare troppe chiamate HTTP, combinare il validatore asincrono con `debounceTime` oppure usare `updateOn: 'blur'` sul controllo.

---

## Signal Forms

Le **Signal-based Forms** vanno preferite ai Reactive Forms classici se disponibili nella versione in uso.

> ⚠️ Verificare lo stato di rilascio nella propria versione di Angular. Potrebbero essere ancora in developer preview. I Reactive Forms classici restano comunque validi e **non sono deprecati**.

Vantaggi rispetto ai Reactive Forms:

- Integrazione nativa con il sistema di Signals
- Nessun bisogno di `valueChanges` Observable
- Reattività granulare automatica
