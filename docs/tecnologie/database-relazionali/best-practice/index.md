---
sidebar_position: 1
description: Best practice trasversali per i database relazionali, indipendenti dal motore adottato.
---

# Best practice generali

Convenzioni valide su qualsiasi database relazionale. Sono indicazioni di livello fisico — come i dati vengono ordinati e indicizzati — che completano i [principi di modellazione](../../../processi/analisi-tecnica/03-modellazione.md) a monte.

Ogni motore le declina a modo suo, con strumenti e limiti diversi: le pagine specifiche di [SQLite](../sqlite.md), [SQL Server](../sqlserver.md) e [PostgreSQL](../postgres.md) traducono queste regole nel prodotto concreto.

## Contenuto

- [Indici e ordinamento fisico](indici.md) — come scegliere la chiave su cui ordinare fisicamente la tabella e perché tenere l'unicità in un indice separato
