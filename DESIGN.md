---
name: MyDocs
description: Estetica terminale a fosfori — nero, ambra e monospace per una posizione argomentata sullo sviluppo software
colors:
  accent-amber: "#ff6a1a"
  accent-amber-dark: "#db5104"
  accent-amber-deep: "#b44204"
  bg-black: "#0a0a0a"
  bg-void: "#050505"
  bg-true-black: "#000000"
  ink: "#f5f5f0"
  ink-muted: "#8a8a82"
  border: "#262622"
  border-strong: "#3a3a34"
  emphasis-low: "#121211"
  emphasis-mid: "#1a1a18"
  status-green: "#4ade80"
typography:
  display:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "clamp(56px, 9vw, 128px)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "2.4rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "1.45rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  body:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  label:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.78rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.1em"
rounded:
  none: "0"
spacing:
  xs: "8px"
  sm: "12px"
  md: "20px"
  lg: "32px"
  xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent-amber}"
    textColor: "{colors.bg-black}"
    rounded: "{rounded.none}"
    padding: "12px 18px"
  button-primary-hover:
    backgroundColor: "{colors.bg-black}"
    textColor: "{colors.accent-amber}"
  button-ghost:
    backgroundColor: "{colors.bg-black}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px 18px"
  card:
    backgroundColor: "{colors.bg-black}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "20px"
  code-inline:
    backgroundColor: "{colors.bg-black}"
    textColor: "{colors.accent-amber}"
    rounded: "{rounded.none}"
---

# Design System: MyDocs

## 1. Overview

**Creative North Star: "Il terminale a fosfori"**

Un manuale tecnico reso navigabile come un terminale a fosfori ambra degli anni '70: testo monospace su nero profondo, un solo accento — l'arancione-ambra — che brucia sui punti che contano, bordi netti da scheda tecnica e una griglia di sfondo appena percettibile, come la trama di un monitor CRT. L'estetica non è decorazione: è la stessa stringenza del contenuto resa visibile. Dove il testo prende una posizione netta, l'interfaccia fa lo stesso — niente raggi, niente ombre morbide, niente sfumature che addolciscono il bordo.

Il sistema rifiuta esplicitamente tre cose. Il **look enterprise SaaS docs**: sidebar grigia anonima, blu aziendale, superfici intercambiabili — qui ogni schermata deve essere riconoscibile come *questa*. Il **tono blog / tutorial**: niente emoji, niente hero motivazionali, niente CTA commerciali — il registro è impersonale e secco. Il **brutalismo costume**: l'estetica terminale serve la lettura, non la posa; quando contrasto ed effetto entrano in conflitto, vince il contrasto, sempre.

La densità è alta ma respirata: corpo a 14px su interlinea 1.65, paragrafi che si lasciano leggere, ma struttura compatta da documento di riferimento più che da landing arieggiata. Serve due lettori alla pari — l'umano che cerca la posizione argomentata e l'agente IA che ingerisce il testo come contesto — quindi la gerarchia è prevedibile e i marker sono ridondanti rispetto al colore.

**Key Characteristics:**
- **Monospace ovunque** (JetBrains Mono): titoli, corpo, label, dati, codice. Una sola famiglia, contrasto solo per peso e dimensione.
- **Nero + ambra, un solo accento.** L'arancione `#ff6a1a` non decora: marca stato attivo, azione primaria, prefissi numerici.
- **Zero raggi.** Bordi netti su tutto: bottoni, card, code block, alert, paginazione.
- **Griglia di fondo** a 48px e **status-bar simulata** come firme dell'ambiente terminale.
- **Marker ASCII ridondanti** (◆ · ▸ ▾ //) così lo stato non vive nel solo colore.

## 2. Colors

Palette monocromatica fredda — nero e grigi tendenti al verde-oliva — incendiata da un unico accento ambra caldo. Nessun secondario, nessun terziario: la disciplina è il punto.

### Primary
- **Ambra Fosforo** (`#ff6a1a`): l'unico accento. Azione primaria (bottone pieno), link, voce di sidebar attiva (◆ + bordo sinistro), prefissi `01.` auto-numerati su H2, caret di categoria, marker del cursore lampeggiante nell'hero, parentesi `[ ]` attorno al titolo navbar. Varianti scure `#db5104` / `#b44204` per stati pressati e bordi profondi.

### Neutral
- **Nero CRT** (`#0a0a0a`): sfondo base di pagina e superfici. È il colore dominante: il sistema è *drenched* nel nero.
- **Vuoto** (`#050505`): code block e footer — un gradino sotto il nero base per dare profondità senza ombre.
- **Nero Assoluto** (`#000000`): status-bar simulata in fondo.
- **Inchiostro** (`#f5f5f0`): corpo testo e titoli. Off-white caldo, mai bianco puro.
- **Inchiostro Muto** (`#8a8a82`): testo secondario, label, breadcrumb, path. **Attenzione: su `#0a0a0a` va verificato a 4.5:1 per il testo di lettura; dove serve, spingere verso l'inchiostro.**
- **Bordo** (`#262622`): linee di divisione, bordi di card, griglia delle voci.
- **Bordo Forte** (`#3a3a34`): bordi di bottoni ghost, hr tratteggiati, thumb della scrollbar.
- **Verde Stato** (`#4ade80`): l'unica eccezione cromatica — il pallino "online" nella status-bar. Mai usato altrove.

### Named Rules
**La Regola dell'Unico Accento.** L'arancione-ambra è l'unico colore non-neutro del sistema (il verde stato è un puntino, non un colore). Marca *funzione* — azione, stato attivo, prefisso — mai decorazione. Se compare per «dare colore», è un errore: rimuoverlo.

**L'Eccezione dei Loghi Tecnologici.** I loghi delle tecnologie (libreria [`developer-icons`](https://github.com/xandemon/developer-icons)) sono l'unica eccezione consentita alla regola dell'unico accento: mantengono i **colori brand originali**. La ragione è funzionale, non decorativa — un logo *è* il suo colore: il C# è viola, PostgreSQL è blu, Angular è rosso; desaturarlo lo rende generico e ne indebolisce il riconoscimento immediato, che è proprio il lavoro che il logo deve fare. L'eccezione è **strettamente confinata**: vale solo per i loghi-marchio accanto al nome di una tecnologia (badge sotto l'H1 di una pagina di tecnologia, strisce nelle schede home, hub `/tecnologie`), mai per testo, bordi, sfondi o icone d'interfaccia. Tutto il resto del sistema resta nero + ambra. Un colore brand che esce da questo confine è un errore.

**La Regola del Nero Stratificato.** La profondità si fa con tre neri (`#0a0a0a` → `#050505` → `#000`), non con le ombre. Una superficie più «dentro» è più scura, non più ombreggiata.

## 3. Typography

**Display / Body / Label Font:** JetBrains Mono (fallback `ui-monospace, SFMono-Regular, Menlo, monospace`)

**Character:** una sola famiglia monospace per tutto. Il contrasto nasce da peso (400 corpo → 700 titoli), dimensione e maiuscolo, mai dall'accostamento di famiglie. La spaziatura fissa è coerente con l'identità terminale: ogni carattere occupa la stessa cella, come su un monitor a fosfori. Il monospace qui non è costume da «developer»: il dominio *è* il software, e la microlingua tecnica (`commit`, `staging`, path, comandi) vive meglio in chiaroscuro fisso.

### Hierarchy
- **Display** (700, `clamp(56px, 9vw, 128px)`, lh 0.95, ls -0.04em, MAIUSCOLO): solo il titolo hero della homepage, con cursore ambra lampeggiante. Unico punto in cui il sistema «alza la voce».
- **Headline / H1** (700, 2.4rem, lh 1.1, MAIUSCOLO): titolo pagina.
- **Title / H2** (700, 1.45rem, lh 1.1, MAIUSCOLO): sezioni, con prefisso `01.` ambra auto-numerato e bordo inferiore.
- **H3** (700, 1.1rem, MAIUSCOLO, ls 0.04em): sotto-sezioni.
- **Body** (400, 14px, lh 1.65): prosa di lettura. Tenere la riga entro 65–75ch dove il contenuto è discorsivo; tabelle e dati possono correre più densi.
- **Label** (600, 0.78rem, ls 0.1em, MAIUSCOLO): meta della status-bar, pill, eyebrow «// On this page», sublabel di paginazione.

### Named Rules
**La Regola del Maiuscolo Strutturale.** Il maiuscolo è riservato a titoli e label corte. Mai sul corpo: testo lungo tutto-maiuscolo è vietato (illeggibile e «da costume»).

**La Regola del Prefisso `//`.** I marcatori di sezione minori usano il commento di codice (`// index`, `// On this page`) come voce del sistema. È un pattern firmato, non un eyebrow da ripetere meccanicamente sopra ogni cosa.

## 4. Elevation

Il sistema è **piatto per dottrina**: nessuna ombra, da nessuna parte (`box-shadow: none` esplicito su card e bottoni). La profondità si ottiene per **stratificazione tonale** (i tre neri) e per **bordi netti** da 1px. Una card non «galleggia»: è un rettangolo delimitato da un bordo `#262622` su uno sfondo leggermente diverso. L'unico uso di `backdrop-filter` è il blur da 8px della navbar sticky — applicato a uno pseudo-elemento separato per non creare un containing block che intrappolerebbe il drawer mobile.

### Named Rules
**La Regola Niente Ombre.** Le ombre sono vietate. Se una superficie deve staccarsi, le si dà un bordo o un nero diverso. Un'ombra qui è sempre un errore di importazione da un altro sistema.

## 5. Components

### Buttons
- **Shape:** rettangolo netto, zero raggi (`--ifm-button-border-radius: 0`).
- **Primary:** sfondo ambra `#ff6a1a`, testo nero `#0a0a0a`, padding `12px 18px`, MAIUSCOLO, ls 0.06em. Hover: si **inverte** — sfondo trasparente, testo e bordo ambra.
- **Ghost (default):** sfondo trasparente, bordo `#3a3a34`, testo inchiostro. Hover: si riempie d'ambra con testo nero.
- **Transizione:** inversione di colore istantanea/breve; nessuna trasformazione di layout.

### Cards (griglia argomenti homepage)
- **Corner Style:** netto (0).
- **Background:** nero base `#0a0a0a`; la griglia di card condivide i bordi (border-collapse visivo: `border-top` + `border-left` sul contenitore, `border-right` + `border-bottom` sulla cella).
- **Shadow Strategy:** nessuna (vedi Elevation).
- **Border:** `#262622`, vira ad ambra `#ff6a1a` in hover — ma **il testo non vira**: solo l'indice `01 /` e la freccia `→` si accendono d'ambra, e la freccia scorre di 4px. Disciplina anti-«tutto si illumina».
- **Internal Padding:** 20px; path in fondo separato da un bordo tratteggiato.

### Code blocks & inline code
- **Block:** sfondo vuoto `#050505`, bordo `#262622`, niente raggi. Riga evidenziata con velo ambra al 12%.
- **Inline:** bordo `#262622`, testo ambra `#ff6a1a` — il codice inline è l'unico testo abitualmente colorato d'accento.

### Navigation (navbar + sidebar)
- **Navbar:** alta 56px, bordo inferiore, blur 8px su pseudo-elemento, titolo MAIUSCOLO fra parentesi ambra `[ MyDocs ]`. Link MAIUSCOLI con bordo che appare in hover; attivo = bordo + testo ambra.
- **Sidebar:** tassonomia a marker ASCII — voce-documento `·` (attiva `◆` ambra + bordo sinistro), categoria collassabile `▾`/`▸` ambra, etichetta di gruppo non-collassabile in MAIUSCOLO muto senza marker. Lo stato non vive mai nel solo colore.

### Right TOC
- Bordo sinistro, intestazione `// On this page`, auto-numerazione `1.` / `1.1` su H2/H3 con cifre tabulari.

### Status bar (firma del sistema)
- Barra sticky in fondo (`#000`), 28px, MAIUSCOLA, cifre tabulari, pallino verde «online». Su mobile collassa in griglia 2 colonne. È l'elemento-firma: simula la status line di un editor/terminale.

## 6. Do's and Don'ts

### Do:
- **Do** usare l'ambra `#ff6a1a` solo per funzione: azione primaria, stato attivo, prefisso numerato, link. Mai per decorare.
- **Do** fare la profondità con i tre neri (`#0a0a0a` / `#050505` / `#000`) e bordi da 1px `#262622`.
- **Do** tenere tutto in JetBrains Mono; il contrasto si fa con peso (400/700), dimensione e MAIUSCOLO.
- **Do** rendere lo stato ridondante rispetto al colore: marker ASCII (`◆ · ▸ ▾`), bordi, peso — utile a tastiera e daltonismo.
- **Do** verificare il corpo testo a ≥4.5:1 sul nero; spingere `#8a8a82` verso `#f5f5f0` dove è testo di lettura, non solo meta.
- **Do** dare a ogni animazione (cursore hero, nudge freccia) un'alternativa sotto `@media (prefers-reduced-motion: reduce)`.

### Don't:
- **Don't** introdurre il **look enterprise SaaS docs**: sidebar grigia anonima, blu aziendale, superfici intercambiabili.
- **Don't** scivolare nel **tono blog / tutorial**: niente emoji, hero motivazionali, CTA commerciali, «noi del team».
- **Don't** lasciare che il **brutalismo diventi costume**: se contrasto ed effetto confliggono, vince il contrasto. Niente arancione su nero per testo di lettura lungo.
- **Don't** produrre **slop da IA**: niente eyebrow MAIUSCOLO tracked come grammatica su *ogni* sezione (il `//` è un pattern firmato, non un riflesso), niente gradient text, niente griglie di card identiche e ripetute fuori dalla homepage, niente template hero-metric.
- **Don't** usare ombre, raggi, glassmorphism decorativo o **side-stripe border** > 1px come accento (il bordo sinistro della sidebar attiva è 2px *funzionale*, non decorazione).
- **Don't** aggiungere una seconda famiglia tipografica o un secondo colore d'accento: la disciplina mono + ambra è l'identità. **Unica eccezione**: i loghi tecnologici (`developer-icons`) tengono i colori brand originali — vedi *L'Eccezione dei Loghi Tecnologici* in §2. È un'eccezione confinata ai loghi-marchio, non un permesso ad aprire la palette.
