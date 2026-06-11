---
sidebar_position: 3
description: Regole e convenzioni specifiche per i linguaggi, i framework e le librerie adottati.
---

import StackGrid from '@site/src/components/StackGrid';

# Tecnologie

Questa sezione raccoglie regole e convenzioni specifiche per le tecnologie adottate. A differenza delle [regole](../regole/principi.md), che sono trasversali e indipendenti dallo stack, qui si trovano indicazioni concrete legate a un linguaggio, un framework o una libreria.

I principi generali restano validi — questa sezione li declina nel contesto tecnologico specifico.

<StackGrid
  items={[
    {icon: 'csharp', label: 'C# / ASP.NET Core', href: '/docs/tecnologie/csharp/', note: 'Entity Framework, pipeline, DI, concorrenza'},
    {icon: 'angular', label: 'Angular', href: '/docs/tecnologie/angular/', note: 'Convenzioni per il frontend'},
    {icon: 'git', label: 'Git', href: '/docs/tecnologie/git/', note: 'Commit, branch, versionamento'},
    {icon: 'postgres', label: 'Database relazionali', href: '/docs/tecnologie/database-relazionali/', note: 'SQLite, SQL Server, PostgreSQL'},
    {icon: 'electron', label: 'App desktop', href: '/docs/tecnologie/desktop/', note: 'Electron, WebView2, Tauri, Kestrel'},
  ]}
/>
