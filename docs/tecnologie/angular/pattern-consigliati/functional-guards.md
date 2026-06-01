---
sidebar_position: 8
description: Guard e Resolver funzionali in Angular.
---

# Functional Guards e Resolvers

I guard e resolver vanno implementati come **funzioni**, non come classi.

## Guard

```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const requiredRole = route.data['role'] as string;
  return auth.hasRole(requiredRole);
};
```

### Registrazione nelle route

```typescript
export const routes: Routes = [
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { role: 'admin' },
    loadComponent: () => import('./admin.component').then(m => m.AdminComponent)
  }
];
```

## Resolver

```typescript
import { ResolveFn } from '@angular/router';

export const userResolver: ResolveFn<User> = (route) => {
  const userService = inject(UserService);
  return userService.getById(route.params['id']);
};
```

```typescript
{
  path: 'users/:id',
  resolve: { user: userResolver },
  loadComponent: () => import('./user-detail.component').then(m => m.UserDetailComponent)
}
```

### Accesso al dato risolto nel componente

```typescript
@Component({ ... })
export class UserDetailComponent {
  private readonly route = inject(ActivatedRoute);
  readonly user = toSignal(this.route.data.pipe(map(d => d['user'] as User)));
}
```

## Composizione di guard

```typescript
export function hasAnyRole(...roles: string[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    return roles.some(role => auth.hasRole(role));
  };
}

// Uso
canActivate: [authGuard, hasAnyRole('admin', 'editor')]
```
