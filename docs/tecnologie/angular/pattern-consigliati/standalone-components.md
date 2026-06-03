---
sidebar_position: 4
description: Componenti standalone in Angular senza NgModule.
---

# Standalone Components

I componenti Angular sono **standalone per default**. Non usare `NgModule` per dichiarare componenti.

## Componente standalone

```typescript
@Component({
  selector: 'app-user-card',
  imports: [DatePipe, RouterLink],
  template: `
    <div class="card">
      <h3>{{ user().name }}</h3>
      <p>Registrato il {{ user().createdAt | date }}</p>
      <a [routerLink]="['/users', user().id]">Dettagli</a>
    </div>
  `
})
export class UserCardComponent {
  readonly user = input.required<User>();
}
```

## Bootstrap senza modulo

```typescript
// main.ts
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimationsAsync()
  ]
});
```

## Lazy loading di route

```typescript
export const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent)
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./dashboard/routes').then(m => m.DASHBOARD_ROUTES)
  }
];
```
