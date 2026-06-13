---
sidebar_position: 3
title: Git
description: Conventional Commits, trunk-based development, feature flag e regole su commit, branch e pull request.
---

import TechIcon from '@site/src/components/TechIcon';

# Git <TechIcon name="git" size={30} className="tech-badge" />

## Commit

Ogni commit deve rappresentare **un'unità logica di lavoro**: una modifica coerente e completa, non un salvataggio intermedio. La storia di un repository è documentazione: deve essere leggibile da chiunque debba capire come è arrivato a quello stato.

### Formato dei messaggi

Si usa **Conventional Commits**:

```
<type>(<scope>): <descrizione breve>
```

Tipi comuni:

| Tipo | Quando usarlo |
|------|---------------|
| `feat` | nuova funzionalità |
| `fix` | bug fix |
| `chore` | task di manutenzione (dipendenze, config, release) |
| `docs` | solo documentazione |
| `refactor` | refactoring senza cambi di comportamento |
| `test` | aggiunta o modifica di test |
| `perf` | miglioramento di performance |

La descrizione è in minuscolo, al presente, senza punto finale: `feat(auth): add jwt refresh token`, non `Added JWT refresh token.`

### Regole

**Un commit, una cosa.** Non si mischiano refactoring e nuove feature nello stesso commit. Se stai aggiungendo una funzionalità e trovi un bug da correggere, sono due commit separati.

**Quando separare un refactoring.** Il criterio è il rischio di regressione. Un refactoring che modifica un algoritmo esistente introduce più rischio di uno che estrae un'interfaccia. Più è alto il rischio e la quantità di codice modificata, più è importante isolare il commit di refactoring da quello della feature, così che una eventuale regressione sia immediatamente tracciabile.

**Il messaggio descrive il perché, non il cosa.** `fix: prevent race condition in payment processing` è meglio di `fix: add mutex lock`. Il diff mostra già cosa è cambiato.

**Non si committa codice che non compila.** La storia deve essere in uno stato funzionante a ogni commit, non solo alla fine.

### Cosa separare, cosa si può unire

Organizzare le modifiche in più commit è cruciale per mantenere una storia leggibile e per permettere operazioni come il cherry-pick su branch di manutenzione.

**Mai mischiare tra loro o con altro:**

| Tipo di modifica | Perché va isolato |
|------------------|-------------------|
| Refactoring | Deve essere verificabile indipendentemente: zero cambi di comportamento. Se si rompe qualcosa, il colpevole è immediato. |
| Feature di modellazione | Cambia la struttura dei dati: ha impatto trasversale e deve essere tracciabile da sola. |
| Bug fix | Deve poter essere cherry-pickato su un branch di manutenzione senza portarsi dietro feature incomplete. |

**Mai feat + bugfix nello stesso commit.** Se una feature e un fix finiscono insieme, è impossibile portare solo il fix su un branch `release/x.y.z` tramite cherry-pick. Sono sempre commit separati.

**Sì: documentazione + feature (predomina `feat`).** La documentazione che descrive una feature appena introdotta va nello stesso commit della feature: è bene che codice e documentazione viaggino insieme. Il tipo del commit resta `feat`.

### Quando fare squash

Durante la lavorazione su un branch è normale accumulare commit intermedi: salvataggi di progresso, esperimenti, correzioni parziali. Questi commit sono utili come backup locale ma non hanno valore nella storia finale del repository.

**Lo squash consolida più commit in uno solo**, producendo una storia pulita e leggibile su `main`.

Quando ha senso:

- **Commit di backup durante lo sviluppo**: `wip`, `fix typo`, `try again` non aggiungono informazione alla storia. Si squashano prima del merge.
- **Lavorazione spezzettata in più sessioni**: una feature sviluppata in 5 commit su un branch di lavoro diventa un singolo commit logico su `main`.
- **PR con squash merge**: la pull request mergia tutto il lavoro del branch in un unico commit su `main`. È la strategia preferita quando i commit intermedi non hanno valore individuale.

Quando **non** fare squash:

- Se i commit nel branch rappresentano unità logiche distinte (un refactoring preparatorio + la feature vera), in quel caso si mantengono separati, o si fa un rebase interattivo per riordinarli e pulirli senza fonderli tutti.

:::caution Riscrittura della storia
Lo squash (come il rebase interattivo) **riscrive la storia**. Si fa solo su branch privati o prima del merge su `main`. Mai su commit già condivisi con altri: si userebbe un force push che rompe la storia altrui.
:::

## Branch

Si tende al **trunk-based development**: il lavoro confluisce direttamente su `main`, che rappresenta sempre uno stato rilasciabile.

I branch, se usati, hanno vita breve: ore, al massimo qualche giorno. Un branch che vive settimane accumula conflitti, diverge dal trunk e diventa costoso da integrare. Se una funzionalità richiede tempo, non si tiene in un branch: si integra su `main` nascosta da un feature flag.

L'unica eccezione sono i **branch di manutenzione** per versioni in produzione che devono ricevere fix senza includere lo sviluppo corrente:

```
release/1.2.x
hotfix/1.2.1
```

## Feature flag

I feature flag sono lo strumento che rende possibile il trunk-based development. Permettono di integrare codice incompleto su `main` senza esporlo agli utenti, mantenendo il trunk sempre deployabile.

Un flag può essere semplice come una variabile di configurazione:

```csharp
if (_featureFlags.IsEnabled("nuova-funzionalita"))
{
    // codice in sviluppo
}
```

**I flag non sono permanenti.** Ogni flag ha una data di scadenza implicita: quando la funzionalità è completa e stabile, il flag si rimuove e il codice condizionale diventa il percorso unico. Flag abbandonati che nessuno rimuove sono debito tecnico.

## Pull Request

Le PR sono uno strumento di revisione, non un obbligo. Hanno un costo reale: richiedono persone disponibili a fare review o automatismi (CI, IA) che le gestiscano. In team piccoli o con trunk-based development maturo, push diretti su `main` con CI solida possono essere più efficienti.

Quando si usano le PR:

- il titolo segue le convenzioni dei commit
- la descrizione spiega cosa cambia e perché, non riscrive il diff
- la CI deve essere verde prima del merge
- la PR è piccola: oltre 400 righe di diff è probabile che possa essere spezzata

### Strategia di merge

La strategia preferita è **squash merge**: tutti i commit del branch vengono fusi in un singolo commit su `main`. Il messaggio del commit risultante segue le convenzioni di Conventional Commits ed è tipicamente il titolo della PR.

Questo approccio funziona bene quando il branch contiene lavorazione spezzettata in più commit intermedi. La storia su `main` resta lineare e ogni commit corrisponde a un'unità logica completa (la PR stessa).

## Cosa non si fa

- **Force push su `main`**: mai, per nessun motivo
- **Commit di credenziali, segreti o file di ambiente**: vanno in `.gitignore` prima che accada
- **`--no-verify`**: i pre-commit hook esistono per un motivo; si bypassano solo in casi eccezionali espliciti, mai per abitudine
- **Merge di branch con CI rotta**: se i test falliscono, si risolve prima di procedere
