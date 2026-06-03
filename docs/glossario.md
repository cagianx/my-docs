---
sidebar_position: 99
description: Definizioni dei termini tecnici e di dominio usati nella documentazione.
---

# Glossario

## AsyncValidatorFn

Tipo Angular per un validatore asincrono su un `FormControl`. Riceve un `AbstractControl` e restituisce un `Observable<ValidationErrors | null>` o una `Promise`. Si passa al controllo tramite `asyncValidators` nell'opzione del costruttore. Vedi [`tecnologie/angular/pattern-consigliati/forms`](tecnologie/angular/pattern-consigliati/forms.md).

## Async / Await

Modello di programmazione asincrona in C# basato su `Task<T>` e le keyword `async`/`await`. Permette di liberare il thread durante operazioni I/O-bound (database, HTTP, file system), aumentando il throughput delle Web API senza aumentare il numero di thread. Vedi [`tecnologie/csharp/linguaggio/15-async`](tecnologie/csharp/linguaggio/15-async.md).

## Adapter pattern

Pattern strutturale che concilia un'interfaccia esistente (es. una libreria esterna) con quella attesa dal consumatore. In una solution C# l'adapter vive nei progetti di integrazione e isola le librerie dal Core, traducendone tipi ed eccezioni nel vocabolario del dominio. Vedi [`pattern-di-sviluppo/adapter`](pattern-di-sviluppo/adapter.md) · [`tecnologie/csharp/pattern/adapter`](tecnologie/csharp/pattern/adapter.md).

## ACID

Proprietà che garantiscono l'affidabilità delle transazioni database: Atomicità, Consistenza, Isolamento, Durabilità. Entity Framework eredita queste garanzie tramite `SaveChanges()`. Vedi [`regole/entity-framework`](regole/entity-framework.md).

## Analisi funzionale

Documento che descrive *cosa* il sistema deve fare dal punto di vista del business. È il punto di partenza dell'analisi tecnica. Prodotta tipicamente dall'analista funzionale o dal product owner.

## Analisi tecnica

Processo che traduce l'analisi funzionale in una soluzione implementabile: modello dati, contratti, flussi, requisiti non funzionali, piano. Vedi [`processi/analisi-tecnica`](processi/analisi-tecnica/index.md).

## Audit log

Registro persistente e immutabile delle operazioni eseguite su un sistema, con tutti i dettagli necessari per ricostruire cosa è successo: chi, quando, su quale risorsa, con quale risultato. Nel contesto HTTP: metodo, path, body di request e response, status code, utente, latenza. Vedi [`tecnologie/csharp/esempi/http-audit-log`](tecnologie/csharp/esempi/02-http-audit-log.md).

## Builder pattern

Pattern creazionale che costruisce passo per passo oggetti complessi, restituendo istanze valide solo al termine tramite `Build()`. In C# si introduce solo quando object initializer, `record` con `with` o parametri opzionali non bastano. Vedi [`pattern-di-sviluppo/builder`](pattern-di-sviluppo/builder.md) · [`tecnologie/csharp/pattern/builder`](tecnologie/csharp/pattern/builder.md).

## Background service

Componente che gira in background per tutta la vita dell'applicazione, in parallelo con la gestione delle richieste HTTP. Si implementa estendendo `BackgroundService` e registrandolo con `AddHostedService`. Vedi [`tecnologie/csharp/concorrenza/19-background-services`](tecnologie/csharp/concorrenza/19-background-services.md).

## Backpressure

Meccanismo con cui un consumatore segnala al produttore di rallentare perché non riesce a elaborare i messaggi abbastanza velocemente. In .NET si realizza con `Channel<T>` limitato (`BoundedChannelFullMode.Wait`). Vedi [`tecnologie/csharp/concorrenza/08-code-native`](tecnologie/csharp/concorrenza/08-code-native.md).

## Breaking change

Modifica che rompe la compatibilità con quanto già in uso: rinomina di colonne o campi API, rimozione di entità, variazione di comportamento atteso. Richiede comunicazione immediata ai team dipendenti e un bump `MAJOR`. Vedi [`regole/versionamento`](regole/versionamento.md).

## Caching

Tecnica per memorizzare temporaneamente il risultato di operazioni costose (query DB, chiamate HTTP) e riutilizzarlo nelle richieste successive. In ASP.NET Core: `IMemoryCache` per cache in-process, `IDistributedCache` per cache condivisa tra istanze (Redis), output caching per risposte HTTP complete. Vedi [`tecnologie/csharp/integrazione/20-caching`](tecnologie/csharp/integrazione/20-caching.md).

## CancellationToken

Meccanismo standard di .NET per segnalare la cancellazione cooperativa di un'operazione asincrona. Il `CancellationTokenSource` è il produttore (chi annulla), il `CancellationToken` è il segnale in sola lettura passato ai consumatori. `CreateLinkedTokenSource` permette di combinare più motivi di cancellazione in un unico token. Vedi [`tecnologie/csharp/concorrenza/23-cancellation-token`](tecnologie/csharp/concorrenza/23-cancellation-token.md).

## Captive dependency

Bug di configurazione DI in cui un servizio con lifetime più lungo (es. singleton) cattura una dipendenza con lifetime più breve (es. scoped). La dipendenza viene tenuta viva oltre il suo ciclo di vita previsto. Vedi [`tecnologie/csharp/16-dependency-injection`](tecnologie/csharp/16-dependency-injection.md).

## Circuit breaker

Pattern di resilienza che interrompe temporaneamente le chiamate a un servizio esterno dopo un numero sufficiente di errori consecutivi, evitando di sovraccaricare un sistema già in difficoltà. Il circuito torna operativo dopo un timeout. Vedi [`tecnologie/csharp/integrazione/21-resilienza`](tecnologie/csharp/integrazione/21-resilience.md).

## Chain of Responsibility

Pattern comportamentale che fa attraversare una richiesta a una sequenza di handler indipendenti, ciascuno libero di gestirla, trasformarla o passarla oltre. In ASP.NET Core si manifesta in tre forme: middleware HTTP, filter MVC e pipeline behavior di MediatR. Vedi [`pattern-di-sviluppo/chain-of-responsibility`](pattern-di-sviluppo/chain-of-responsibility.md) · [`tecnologie/csharp/pattern/chain-of-responsibility`](tecnologie/csharp/pattern/chain-of-responsibility.md).

## Caso d'uso

Scenario concreto che descrive come un attore interagisce con il sistema per raggiungere un obiettivo. Nel codice, ogni caso d'uso è una classe che implementa `IUseCase`. Deve esistere uno scenario realistico prima di sviluppare qualsiasi funzionalità.

## Clustered index

Indice che determina l'ordinamento fisico dei dati su disco. In PostgreSQL corrisponde implicitamente alla chiave primaria. Va pianificato per supportare il caso d'uso più generico della tabella.

## Code First

Approccio Entity Framework in cui il codice C# è la fonte di verità del modello dati. Il database viene generato e aggiornato a partire dalle entity class e dalle migration. L'opposto (Database First) non si usa. Vedi [`regole/entity-framework`](regole/entity-framework.md).

## Command pattern

Pattern comportamentale che reifica un'azione in un oggetto immutabile, separando chi la richiede da chi la esegue. È la base concettuale di `IUseCase` e dei command di MediatR. Abilita logging uniforme, validazione, coda di lavoro, audit e retry. Vedi [`pattern-di-sviluppo/command`](pattern-di-sviluppo/command.md) · [`tecnologie/csharp/pattern/command`](tecnologie/csharp/pattern/command.md).

## Conventional Commits

Convenzione per i messaggi di commit: `<type>(<scope>): <descrizione>`. Tipi comuni: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`. Vedi [`tecnologie/git`](tecnologie/git/index.md).

## Contratto

Accordo formale tra componenti su come comunicano: schema request/response, errori, autenticazione, versionamento. Una volta pubblicato, cambiare un contratto è un breaking change.

## Core

Progetto C# che contiene la logica di dominio: domain service, validator, use case e DI extension organizzati per dominio (Screaming Architecture). Le entità vivono in Db, i DTO ed enum in Models, le integrazioni nei progetti dedicati. Vedi [`tecnologie/csharp/struttura-soluzione/03-organizzazione-core`](tecnologie/csharp/struttura-soluzione/03-organizzazione-core.md) · [`regole/architettura`](regole/architettura.md).

## Composition root

Punto centrale della solution dove si compone il grafo delle dipendenze: si registrano via DI le implementazioni concrete che soddisfano le interfacce usate dal codice. In ASP.NET Core è `Program.cs` del progetto Api; non contiene logica, solo registrazioni — tipicamente raggruppate in extension method per dominio (`AddOrdini()`, `AddClienti()`). Vedi [`tecnologie/csharp/struttura-soluzione/02-dipendenze`](tecnologie/csharp/struttura-soluzione/02-dipendenze.md).

## DbContext

Classe EF che rappresenta la sessione con il database. Implementa il pattern Unit of Work: traccia le modifiche alle entity e le persiste atomicamente con `SaveChanges()`. Si inietta direttamente nei casi d'uso — non serve un layer repository aggiuntivo.

## Definition of Done

Criteri che un caso d'uso deve soddisfare per essere considerato completato: dominio aggiornato, test verdi, CI verde, deploy in staging, validazione end-to-end approvata. Vedi [`processi/sviluppo/03-validazione`](processi/sviluppo/03-validazione.md).

## Decorator pattern

Pattern strutturale che avvolge un oggetto in un altro che ne implementa la stessa interfaccia, aggiungendo comportamento (logging, caching, retry, autorizzazione) senza modificarlo. In C# si compone manualmente in DI o tramite la libreria Scrutor. Vedi [`pattern-di-sviluppo/decorator`](pattern-di-sviluppo/decorator.md) · [`tecnologie/csharp/pattern/decorator`](tecnologie/csharp/pattern/decorator.md).

## Dependency Injection (DI)

Pattern per cui le dipendenze di una classe vengono fornite dall'esterno anziché create internamente. In ASP.NET Core il container DI integrato risolve le dipendenze automaticamente. I servizi si registrano con tre lifetimes: singleton, scoped, transient. Vedi [`tecnologie/csharp/16-dependency-injection`](tecnologie/csharp/16-dependency-injection.md).

## DTO

*Data Transfer Object.* Modello usato per trasferire dati tra moduli o attraverso interfacce. Non è mai una copia 1:1 dell'entity del database: espone solo i campi necessari al chiamante, con nomi dall'Ubiquitous Language. Vivono nel progetto Models, organizzati per dominio. Vedi [`tecnologie/csharp/struttura-soluzione/07-models`](tecnologie/csharp/struttura-soluzione/07-models.md).

## Authorization filter

Filter MVC eseguito prima di ogni action per verificare se la request è autorizzata. Implementa `IAuthorizationFilter` o `IAsyncAuthorizationFilter`. Adatto a logica di autorizzazione custom che non si esprime con le policy dichiarative standard. Vedi [`tecnologie/csharp/pipeline/12-authorization-filter`](tecnologie/csharp/pipeline/12-authorization-filter.md).

## Exception filter

Filter MVC che intercetta le eccezioni non gestite lanciate da action e filter. Consente di centralizzare la gestione degli errori a livello di controller con accesso al contesto MVC. Vedi [`tecnologie/csharp/pipeline/13-exception-filter`](tecnologie/csharp/pipeline/13-exception-filter.md).

## FluentValidation

Libreria per la validazione dell'input con un'API fluente. I validator sono classi separate (`AbstractValidator<T>`) testabili in isolamento. Preferita a DataAnnotations per regole condizionali, messaggi personalizzati o validazioni tra campi. Vedi [`tecnologie/csharp/pipeline/18-validation`](tecnologie/csharp/pipeline/18-validation.md).

## Feature flag

Meccanismo che permette di abilitare o disabilitare funzionalità a runtime tramite configurazione, senza deploy. Rende possibile integrare codice incompleto su `main` senza esporlo agli utenti. I flag non sono permanenti: si rimuovono quando la funzionalità è stabile. Vedi [`tecnologie/git`](tecnologie/git/index.md).

## Electron

Framework open source che permette di distribuire applicazioni web come app desktop. Incorpora Chromium (per il frontend) e Node.js (per il processo principale). Il bundle risultante è pesante (~150 MB+) ma garantisce uniformità cross-platform. Vedi [`tecnologie/desktop/electron-puro`](tecnologie/desktop/electron-puro.md) · [`tecnologie/desktop/electron-net`](tecnologie/desktop/electron-net.md).

## Electron.NET

Libreria che integra ASP.NET Core con Electron, consentendo di controllare la shell Electron da C# anziché da JavaScript. Il progetto desktop è una minimal ASP.NET Core app con Electron.NET; il WebAPI resta un processo separato. Vedi [`tecnologie/desktop/electron-net`](tecnologie/desktop/electron-net.md).

## Factory Method

Pattern creazionale che incapsula la creazione di un oggetto dietro un metodo dedicato, separando chi richiede l'istanza da chi conosce il tipo concreto. Convive con [[Strategy pattern]]: una factory è spesso il selettore che restituisce la strategy giusta. Vedi [`pattern-di-sviluppo/factory-method`](pattern-di-sviluppo/factory-method.md) · [`tecnologie/csharp/pattern/factory-method`](tecnologie/csharp/pattern/factory-method.md).

## Fluent API

Metodo di configurazione EF tramite classi `IEntityTypeConfiguration<T>`. Preferito alle Data Annotations perché mantiene le entity class pulite e concentra la configurazione in un unico posto.

## IHttpClientFactory

Interfaccia ASP.NET Core per creare istanze `HttpClient` con gestione corretta del ciclo di vita degli handler HTTP. Evita socket exhaustion e DNS stale. Si usa tramite typed client o named client. Vedi [`tecnologie/csharp/integrazione/17-httpclient`](tecnologie/csharp/integrazione/17-httpclient.md).

## IQueryable\<T\>

Interfaccia che rappresenta una query non ancora eseguita su un database. EF traduce le espressioni LINQ in SQL e le esegue solo alla materializzazione (`.ToList()`, `.FirstOrDefaultAsync()`, ecc.). Restituire `IQueryable` da un metodo è una astrazione leaky: la query viene eseguita fuori dal controllo del metodo. Vedi [`tecnologie/csharp/entity-framework/02-queryable-vs-list`](tecnologie/csharp/entity-framework/02-queryable-vs-list.md).

## Idempotenza

Proprietà di un'operazione che produce lo stesso risultato indipendentemente da quante volte viene eseguita con gli stessi input. Obbligatoria per operazioni critiche per gestire retry e timeout. Vedi [`processi/analisi-tecnica/04-contratti`](processi/analisi-tecnica/04-contratti.md).

## InternalsVisibleTo

Attributo assembly che concede a un progetto "amico" l'accesso ai membri `internal` senza renderli `public`. Il caso d'uso principale è dare visibilità completa di una libreria ai test unitari senza alterare la superficie pubblica. Vedi [`tecnologie/csharp/linguaggio/23-internals-visible-to`](tecnologie/csharp/linguaggio/23-internals-visible-to.md).

## Integrazioni (progetti di)

Progetti che isolano client HTTP/SOAP, librerie esterne (html2pdf, MailKit) e integrazioni con sistemi terzi. Espongono interfacce ad-hoc che wrappano la libreria sottostante: Core usa l'interfaccia, la libreria resta confinata nel progetto e non si propaga al resto della solution. Vedi [`tecnologie/csharp/struttura-soluzione/06-integrazioni`](tecnologie/csharp/struttura-soluzione/06-integrazioni.md).

## IOptions\<T\>

Interfaccia ASP.NET Core per accedere alla configurazione tipizzata. Legge il valore una sola volta all'avvio. `IOptionsMonitor<T>` aggiorna il valore automaticamente se `appsettings.json` cambia. `IOptionsSnapshot<T>` ricalcola il valore per ogni request. Vedi [`tecnologie/csharp/07-configuration`](tecnologie/csharp/07-configuration.md).

## IUseCase

Interfaccia marker che identifica formalmente le classi che implementano un caso d'uso. Tutto ciò che implementa `IUseCase` è un caso d'uso; tutto il resto è un servizio che partecipa alla Unit of Work. Vedi [`tecnologie/csharp/struttura-soluzione/04-usecases`](tecnologie/csharp/struttura-soluzione/04-usecases.md) · [`regole/entity-framework`](regole/entity-framework.md).

## Middleware

Componente della pipeline HTTP di ASP.NET Core che elabora ogni request e response. Si compone in catena: ogni middleware può trasformare la request, passarla al successivo e poi trasformare la response al ritorno. Vedi [`tecnologie/csharp/pipeline/10-middleware`](tecnologie/csharp/pipeline/10-middleware.md).

## Migration

File generato da EF che descrive una modifica incrementale allo schema del database. Il nome deve essere descrittivo della decisione di dominio. Le migration non si modificano dopo il push su `main`. Vedi [`regole/entity-framework`](regole/entity-framework.md).

## Models (progetto)

Progetto che raccoglie i tipi condivisi tra Db, Core, UseCases e Api: DTO, enum di dominio e `Result<T>`. Contiene tipi puri, non comportamento: niente logica di business, niente validazione, niente factory di dominio. Non dipende da nessun altro progetto della solution. Vedi [`tecnologie/csharp/struttura-soluzione/07-models`](tecnologie/csharp/struttura-soluzione/07-models.md).

## NSIS

*Nullsoft Scriptable Install System.* Sistema open source per creare installer Windows. Permette di copiare file, creare shortcut, scrivere chiavi di registro, gestire la disinstallazione e impostare percorsi per i dati applicativi (es. SQLite). È lo strumento di riferimento per distribuire app desktop .NET su Windows. Vedi [`tecnologie/desktop/installer-windows`](tecnologie/desktop/installer-windows.md).

## N+1 (problema)

Anti-pattern di accesso ai dati in cui si esegue una query per ottenere N record e poi N query aggiuntive per caricare dati correlati. Si risolve con `Include` per il caricamento eager o con proiezioni `Select` che portano solo i dati necessari in un'unica query. Vedi [`tecnologie/csharp/entity-framework/02-queryable-vs-list`](tecnologie/csharp/entity-framework/02-queryable-vs-list.md).

## NFR

*Requisiti Non Funzionali.* Requisiti che descrivono *come* il sistema si comporta: performance, sicurezza, resilienza, tracciabilità, compatibilità. Vanno resi espliciti con metriche verificabili. Vedi [`processi/analisi-tecnica/06-nfr`](processi/analisi-tecnica/06-nfr.md).

## Record (C#)

Tipo reference con semantica di valore: l'uguaglianza è basata sul contenuto delle proprietà, non sull'identità in memoria. Le proprietà sono `init`-only per default (immutabili dopo la costruzione). Si copia con modifiche tramite `with`. Ideale per DTO, value object e response model. Vedi [`tecnologie/csharp/linguaggio/22-records`](tecnologie/csharp/linguaggio/22-records.md).

## Resilienza (HTTP)

Capacità di gestire errori transitori nelle chiamate a servizi esterni tramite retry, circuit breaker e timeout. In ASP.NET Core si configura con `Microsoft.Extensions.Http.Resilience` (built on Polly). Vedi [`tecnologie/csharp/integrazione/21-resilience`](tecnologie/csharp/integrazione/21-resilience.md).

## Result pattern

Pattern che incapsula l'esito di un'operazione in un oggetto `Result<T>`, distinguendo esplicitamente successo e fallimento senza usare eccezioni per il controllo del flusso. `Result<T>` vive in Models, prodotto da UseCases e consumato da Api. Vedi [`tecnologie/csharp/struttura-soluzione/07-models`](tecnologie/csharp/struttura-soluzione/07-models.md) · [`regole/gestione-errori`](regole/gestione-errori.md).

## Observer / Pub-Sub

Pattern comportamentale che notifica un numero variabile di consumatori al verificarsi di un evento, senza che il produttore conosca chi ascolta. In C# si realizza in-process con MediatR `INotification` e cross-process con MassTransit su broker (RabbitMQ, Azure Service Bus). Vedi [`pattern-di-sviluppo/observer`](pattern-di-sviluppo/observer.md) · [`tecnologie/csharp/pattern/observer`](tecnologie/csharp/pattern/observer.md).

## Problem Details

Standard RFC 9457 per il formato strutturato di risposte di errore HTTP. Usa il media type `application/problem+json` con campi fissi (`type`, `title`, `status`, `detail`, `instance`) e proprietà custom. ASP.NET Core offre `ProblemDetails` e `ProblemDetailsOptions` per implementarlo. Vedi [`tecnologie/csharp/pipeline/14-problem-details`](tecnologie/csharp/pipeline/14-problem-details.md).

## Pride versioning

Pratica di gonfiare i numeri di versione per ragioni di immagine o marketing anziché per rispecchiare l'entità reale delle modifiche. Esempi: saltare da `v1.x` a `v2.0` senza breaking changes, rilasciare una `v10.0` in coincidenza di un anniversario. Distorce il contratto comunicativo del versioning e può trarre in inganno chi automatizza gli aggiornamenti. Vedi [`regole/versionamento`](regole/versionamento.md).

## Serilog

Libreria di logging strutturato per .NET. Principale alternativa a `Microsoft.Extensions.Logging` puro. Supporta sink multipli (console, file, database, Seq, Application Insights, OpenTelemetry), log strutturati nativi e configurazione da `appsettings.json`. Vedi [`tecnologie/csharp/osservabilita/logging`](tecnologie/csharp/osservabilita/05-logging.md) · [`tecnologie/csharp/esempi/serilog-db`](tecnologie/csharp/esempi/01-serilog-db.md).

## Sidecar

Processo esterno avviato e gestito da un'applicazione principale. Nel contesto desktop, il WebAPI C# viene eseguito come sidecar dalla shell (Electron, Tauri, WPF): viene avviato all'apertura dell'app e terminato alla chiusura. Vedi [`tecnologie/desktop`](tecnologie/desktop/index.md).

## Screaming Architecture

Principio per cui la struttura del codice comunica immediatamente *cosa fa* il sistema. Le cartelle si chiamano `Ordini/`, `Fatturazione/`, non `Services/`, `Repositories/`. Vedi [`regole/architettura`](regole/architettura.md).

## Semantic Versioning

Schema di versioning `MAJOR.MINOR.PATCH`: MAJOR per breaking changes, MINOR per nuove funzionalità retrocompatibili, PATCH per bug fix. Vedi [`regole/versionamento`](regole/versionamento.md).

## Sink (Serilog)

Destinazione di scrittura dei log in Serilog: console, file, database, Seq, Application Insights, ecc. Si possono configurare più sink contemporaneamente, con livelli minimi differenti per ciascuno. È possibile scrivere sink custom implementando `ILogEventSink`. Vedi [`tecnologie/csharp/osservabilita/logging`](tecnologie/csharp/osservabilita/05-logging.md).

## Soft delete

Tecnica per non eliminare fisicamente un record, ma marcarlo come eliminato tramite un campo `DeletedAt` nullable. Se è `null` il record è attivo, se ha una data è eliminato. Un singolo campo, zero ambiguità — non si usano combinazioni di campi booleani e date (vedi il tip sulle [combinazioni inconsistenti](processi/analisi-tecnica/03-modellazione.md#principio-dati-duttili-in-fase-di-lettura)). Preserva la storia e la compatibilità con dati storici. Va progettato fin dall'inizio se richiesto.

## Spike

Task a tempo fisso per esplorare un'incertezza tecnica. Produce una risposta (documento, prototipo, decisione), non un'implementazione. Ha una durata massima definita. Vedi [`processi/analisi-tecnica/07-piano`](processi/analisi-tecnica/07-piano.md).

## Staging

Ambiente intermedio tra sviluppo e produzione. Riceve ogni versione prima che arrivi in produzione. La validazione end-to-end avviene qui. Vedi [`regole/ambienti`](regole/ambienti.md).

## Strategy pattern

Pattern comportamentale che incapsula una famiglia di algoritmi intercambiabili dietro un'interfaccia comune, permettendo di variare il comportamento a runtime senza modificare il contesto. In C# si implementa tipicamente con `IEnumerable<T>` (selezione a runtime) o con keyed services (selezione dichiarativa). Vedi [`pattern-di-sviluppo/strategy`](pattern-di-sviluppo/strategy.md) · [`tecnologie/csharp/pattern/strategy`](tecnologie/csharp/pattern/strategy.md).

## Tauri

Framework per app desktop che usa il webview nativo del sistema operativo (WebKit su macOS/Linux, WebView2 su Windows) e un backend Rust. Produce bundle molto leggeri (~5–15 MB). In combinazione con un WebAPI C#, il backend gira come sidecar esterno. Vedi [`tecnologie/desktop/tauri`](tecnologie/desktop/tauri.md).

## Trunk-based development

Strategia di branching in cui tutto il lavoro confluisce direttamente su `main`. I branch, se usati, hanno vita brevissima. Le funzionalità incomplete si nascondono tramite feature flag. Vedi [`tecnologie/git`](tecnologie/git/index.md).

## Ubiquitous Language

Linguaggio condiviso tra developer, analisti e stakeholder: i nomi del dominio si usano ovunque nel codice, senza sinonimi, abbreviazioni o traduzioni. Vedi [`regole/dominio`](regole/dominio.md).

## WebView2

Controllo browser Microsoft basato su Chromium Edge, disponibile solo su Windows. Permette di ospitare una webview dentro un'applicazione WPF, WinForms o WinUI senza includere Chromium nel bundle: usa il runtime Edge già installato sul sistema. Supporta `SetVirtualHostNameToFolderMapping` per servire file statici locali senza un server HTTP. Vedi [`tecnologie/desktop/webview2`](tecnologie/desktop/webview2.md).

## Unit of Work

Pattern che raggruppa più operazioni in una singola transazione. In EF, `DbContext` è già una Unit of Work. I servizi di dominio partecipano senza chiuderla — è il caso d'uso (in UseCases) che chiama `SaveChanges()`. Vedi [`tecnologie/csharp/struttura-soluzione/04-usecases`](tecnologie/csharp/struttura-soluzione/04-usecases.md) · [`regole/entity-framework`](regole/entity-framework.md).

## UseCases (livello)

Livello tra Core e i progetti di alto livello (Api, Console, Worker). Contiene i comandi completi: orchestrano i servizi di Core, chiudono la unit of work con `SaveChanges` e restituiscono un `Result`. Spesso vive come sottocartella di Core (`Core/UseCases/`); diventa progetto first-class quando cresce. Vedi [`tecnologie/csharp/struttura-soluzione/04-usecases`](tecnologie/csharp/struttura-soluzione/04-usecases.md).
