---
sidebar_position: 5
description: Dependency Injection con la funzione inject() in Angular.
---

# Dependency Injection con `inject()`

Preferire la funzione `inject()` rispetto all'injection tramite parametri del constructor.

Vantaggi:

- Funziona in contesti non-class (functional guards, resolvers, interceptor)
- Non richiede decoratori
- Più facile da refactorare e comporre

## Uso nei componenti e servizi

```typescript
import { inject } from '@angular/core';

@Component({ ... })
export class UserListComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
}
```

## Uso in functional guards

```typescript
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};
```

## Uso in interceptor funzionali

```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `****** }
    });
  }
  return next(req);
};
```

## Injection token custom

```typescript
const API_URL = new InjectionToken<string>('API_URL');

// Provider
provideHttpClient(),
{ provide: API_URL, useValue: 'https://api.example.com' }

// Consumo
private readonly apiUrl = inject(API_URL);
```
